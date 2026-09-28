/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getConfig } from '@/lib/config';
import { getStorage } from '@/lib/db';
import { IStorage } from '@/lib/types';

export const runtime = 'edge';

/**
 * 用户自助注册
 *
 * 开关：环境变量 NEXT_PUBLIC_ENABLE_REGISTRATION=true 时开放，默认关闭。
 * 仅支持 upstash / redis 存储模式（localstorage 模式没有服务端用户体系）。
 *
 * 注册出来的账号角色**固定为 user**，无法通过此接口产生管理员或超管。
 */

const REGISTRATION_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_REGISTRATION === 'true';

const USERNAME_MIN = 3;
const USERNAME_MAX = 32;

/**
 * 用户名会成为存储键的一部分（`u:<username>:pwd`），字符集必须严格限制：
 * - `:` 会破坏 `getAllUsers()` 里 `/^u:(.+?):pwd$/` 的解析
 * - `*` / `?` 会污染 `KEYS u:*:pr:*` 这类模式匹配，越权读取他人数据
 */
const USERNAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;

// ---------- 限流（尽力而为）----------
// 说明一：这是进程内存计数。Docker 单实例部署下有效；Vercel 这类 serverless 环境下
//   每个实例各持一份，只能挡住单实例上的连续尝试，不能防御分布式滥用。
//   生产环境请配合 Vercel WAF / Upstash Ratelimit 使用。
// 说明二：**只统计成功创建的账号**，校验失败（用户名不合规、密码太短等）不消耗配额，
//   否则用户打错一次密码就会白白烧掉额度。代价是无效请求可以被低成本地反复发起，
//   但这类请求不写库、不做哈希派生，成本与普通公开接口无异。
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 小时
const RATE_MAX = 10; // 每 IP 每小时最多成功注册 10 个账号
const rateBuckets = new Map<string, number[]>();

function recentHits(ip: string): number[] {
  const now = Date.now();
  const hits = (rateBuckets.get(ip) || []).filter(
    (t) => now - t < RATE_WINDOW_MS
  );
  rateBuckets.set(ip, hits);
  return hits;
}

function isRateLimited(ip: string): boolean {
  return recentHits(ip).length >= RATE_MAX;
}

function recordRegistration(ip: string): void {
  const hits = recentHits(ip);
  hits.push(Date.now());
  rateBuckets.set(ip, hits);

  // 防止 Map 无限增长：顺手清理已过期的桶
  if (rateBuckets.size > 5000) {
    rateBuckets.forEach((value, key) => {
      const now = Date.now();
      if (value.every((t) => now - t >= RATE_WINDOW_MS)) {
        rateBuckets.delete(key);
      }
    });
  }
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

export async function POST(request: NextRequest) {
  if (!REGISTRATION_ENABLED) {
    return NextResponse.json({ error: '本站未开放注册' }, { status: 403 });
  }

  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
  if (storageType === 'localstorage') {
    return NextResponse.json(
      { error: '当前为本地存储模式，不支持多用户注册' },
      { status: 400 }
    );
  }

  try {
    const body = await request
      .json()
      .catch(() => ({}) as Record<string, unknown>);
    const username =
      typeof body?.username === 'string' ? body.username.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    // ---------- 用户名校验 ----------
    if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
      return NextResponse.json(
        { error: `用户名长度需为 ${USERNAME_MIN}-${USERNAME_MAX} 个字符` },
        { status: 400 }
      );
    }
    if (!USERNAME_PATTERN.test(username)) {
      return NextResponse.json(
        { error: '用户名只能包含字母、数字、下划线和短横线' },
        { status: 400 }
      );
    }
    // 超管用户名由环境变量 USERNAME 保留，不允许被注册占用
    if (process.env.USERNAME && username === process.env.USERNAME) {
      return NextResponse.json({ error: '该用户名不可用' }, { status: 409 });
    }

    // ---------- 密码强度 ----------
    if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
      return NextResponse.json(
        { error: `密码长度需为 ${PASSWORD_MIN}-${PASSWORD_MAX} 个字符` },
        { status: 400 }
      );
    }
    if (/^\d+$/.test(password) || /^[a-zA-Z]+$/.test(password)) {
      return NextResponse.json(
        { error: '密码需同时包含字母与数字（或符号）' },
        { status: 400 }
      );
    }

    // ---------- 限流：放在校验之后，避免校验失败消耗配额 ----------
    const ip = getClientIp(request);
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: '注册过于频繁，请稍后再试' },
        { status: 429 }
      );
    }

    // ---------- 存储可用性 ----------
    const storage: IStorage | null = getStorage();
    if (!storage || typeof storage.registerUser !== 'function') {
      return NextResponse.json(
        { error: '存储未配置用户注册功能' },
        { status: 500 }
      );
    }

    if (await storage.checkUserExist(username)) {
      return NextResponse.json({ error: '该用户名已被占用' }, { status: 409 });
    }

    const adminConfig = await getConfig();
    if (adminConfig.UserConfig.Users.some((u) => u.username === username)) {
      return NextResponse.json({ error: '该用户名已被占用' }, { status: 409 });
    }

    // ---------- 建号 ----------
    // 密码在 registerUser 内部完成哈希，落库不存明文
    await storage.registerUser(username, password);

    // 写入用户表，角色固定为 user
    adminConfig.UserConfig.Users.push({ username, role: 'user' });
    await storage.setAdminConfig(adminConfig);

    recordRegistration(ip);
    console.log(`新用户注册成功: ${username}`);

    return NextResponse.json(
      { ok: true, username },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('用户注册失败:', error);
    return NextResponse.json(
      { error: '注册失败，请稍后重试' },
      { status: 500 }
    );
  }
}
