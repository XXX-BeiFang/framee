import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  // 鉴权前置检查——与其余 admin 路由（config / source / site / user / reset）保持一致。
  // 本路由会把服务端请求发往调用方指定的任意 URL，是 SSRF 敏感面，
  // 此前是 /api/admin/ 下唯一没有鉴权的路由，必须补齐。
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
  if (storageType === 'localstorage') {
    return NextResponse.json(
      {
        error: '不支持本地存储进行管理员配置',
      },
      { status: 400 }
    );
  }

  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { targetUrl } = await request.json();

    if (!targetUrl) {
      return NextResponse.json({ error: 'Target URL is required' }, { status: 400 });
    }

    // 为服务器端请求设置超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout

    try {
      const response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'zh-CN,zh;q=0.9',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
      });

      clearTimeout(timeoutId);

      const status = response.status;
      const statusText = response.statusText;
      let success = response.ok;
      let responseBody: any = null;
      let errorMessage: string | undefined;

      const rawResponseBody = await response.text(); // Read body once as text
      try {
        responseBody = JSON.parse(rawResponseBody); // Try to parse as JSON
        // 如果响应是 JSON，检查响应体中常见的错误指示
        if (responseBody && (responseBody.error || responseBody.code !== 1)) { // 假设 code 为 1 表示成功，请根据实际情况调整
          success = false;
          errorMessage = responseBody.error || '响应内容指示错误';
        }
      } catch (jsonError) {
        // 如果不是 JSON，或者解析失败，它可能仍然是一个有效响应（例如纯文本、HTML）
        // 对于连通性测试，如果预期是 JSON 响应，我们可能希望将非 JSON 或空响应视为失败。
        if (!rawResponseBody.trim()) { // If response is empty, it's a failure
          success = false;
          errorMessage = '响应内容为空';
        }
      }

      return NextResponse.json({
        success: success,
        status: status,
        statusText: statusText,
        error: errorMessage,
      });
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        return NextResponse.json({ success: false, error: '请求超时' }, { status: 504 });
      } else {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
