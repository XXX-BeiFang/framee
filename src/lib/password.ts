/**
 * 密码哈希工具
 *
 * 使用 WebCrypto 的 PBKDF2-SHA256。选它而不是 bcrypt / argon2 的原因：
 * 本项目的路由声明了 `runtime = 'edge'`，只有 WebCrypto 在 Edge Runtime 与
 * Node.js 18+ 下都原生可用（项目已在 middleware.ts / api/login 中依赖 `crypto.subtle`）。
 *
 * 存储格式：`pbkdf2$<迭代次数>$<盐hex>$<哈希hex>`
 * 这个前缀同时充当版本标记 —— 不带前缀的值一律视为历史遗留的明文密码，
 * 因此改造前的存量用户不会被锁在门外，且可在下次登录成功时透明升级。
 */

const PREFIX = 'pbkdf2';

/**
 * 迭代次数。权衡说明：
 * - 实测（Node 22，本机）100000 次约 15.6ms，Edge Runtime 按 2~3 倍余量估算约 30~50ms，
 *   在 Edge Function 的执行预算内。
 * - OWASP 对 PBKDF2-HMAC-SHA256 的当前建议是 600000 次，但在 Edge Runtime 上
 *   单次派生会达到数百毫秒，存在超时风险，故取折中值。
 * - 迭代次数已写入存储串，**改动此常量不会影响存量哈希**（旧值仍按其自身记录的次数校验）。
 */
const ITERATIONS = 100_000;
const SALT_BYTES = 16;
const KEY_BITS = 256;

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/** 常量时间字符串比较，避免逐字符短路比较泄露信息 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function derive(
  password: string,
  salt: Uint8Array,
  iterations: number
): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    KEY_BITS
  );
  return toHex(new Uint8Array(bits));
}

/** 该存储值是否已是哈希格式（false 表示是历史遗留的明文） */
export function isHashedPassword(stored: string): boolean {
  return typeof stored === 'string' && stored.startsWith(`${PREFIX}$`);
}

/** 生成可存储的密码哈希 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt, ITERATIONS);
  return `${PREFIX}$${ITERATIONS}$${toHex(salt)}$${hash}`;
}

/**
 * 校验密码。
 * - 哈希格式：按存储串中记录的 salt 与迭代次数重新派生后比对
 * - 明文格式：直接做常量时间比对（调用方应在成功后就地升级为哈希）
 */
export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  if (typeof stored !== 'string' || typeof password !== 'string') {
    return false;
  }

  if (!isHashedPassword(stored)) {
    return timingSafeEqual(stored, password);
  }

  const parts = stored.split('$');
  if (parts.length !== 4) return false;

  const iterations = parseInt(parts[1], 10);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;

  const salt = fromHex(parts[2]);
  const expected = parts[3];
  if (salt.length === 0 || expected.length === 0) return false;

  const actual = await derive(password, salt, iterations);
  return timingSafeEqual(actual, expected);
}
