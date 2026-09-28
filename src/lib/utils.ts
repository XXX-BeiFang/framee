/* eslint-disable @typescript-eslint/no-explicit-any,no-console */
import he from 'he';
import Hls from 'hls.js';

function getDoubanImageProxyConfig(): {
  proxyType:
    | 'direct'
    | 'server'
    | 'img3'
    | 'cmliussss-cdn-tencent'
    | 'cmliussss-cdn-ali'
    | 'custom';
  proxyUrl: string;
} {
  const doubanImageProxyType =
    localStorage.getItem('doubanImageProxyType') ||
    (window as any).RUNTIME_CONFIG?.DOUBAN_IMAGE_PROXY_TYPE ||
    'direct';
  const doubanImageProxy =
    localStorage.getItem('doubanImageProxyUrl') ||
    (window as any).RUNTIME_CONFIG?.DOUBAN_IMAGE_PROXY ||
    '';
  return {
    proxyType: doubanImageProxyType,
    proxyUrl: doubanImageProxy,
  };
}

export interface CardSubtitleParts {
  /** 地区，如「中国大陆」「美国 英国 加拿大」 */
  region: string;
  /** 类型，如「剧情 悬疑 犯罪」 */
  genres: string;
  /** 导演，可能为空（综艺常缺） */
  director: string;
  /** 主演，可能为空 */
  cast: string;
}

/**
 * 解析豆瓣副标题 `card_subtitle`。
 *
 * 豆瓣列表接口的该字段是「影视信息」的唯一来源，形如：
 * - 电影/剧集：`2026 / 中国大陆 / 喜剧 / 董润年 / 张若昀 白客`
 * - 综艺（常缺导演）：`2026 / 中国大陆 / 真人秀 / 吴君如 殷桃`
 * - Top250（缺主创）：`1994 / 美国 / 犯罪 剧情`
 *
 * 注意：分段数量不固定，因此「最后一段」既可能是主演也可能是导演。
 * 判定规则：若末段含空格（≥2 个名字）视为主演，否则视为导演。
 */
export function parseCardSubtitle(card?: string): CardSubtitleParts {
  const empty: CardSubtitleParts = {
    region: '',
    genres: '',
    director: '',
    cast: '',
  };
  if (!card) return empty;

  const parts = card
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!parts.length) return empty;

  // 首段通常是 4 位年份；不是年份时不要误删
  const start = /^\d{4}$/.test(parts[0]) ? 1 : 0;
  const rest = parts.slice(start);

  const region = rest[0] || '';
  const genres = rest[1] || '';
  const people = rest.slice(2);

  let director = '';
  let cast = '';
  if (people.length >= 2) {
    director = people[0];
    cast = people.slice(1).join(' ');
  } else if (people.length === 1) {
    if (/\s/.test(people[0])) cast = people[0];
    else director = people[0];
  }

  return { region, genres, director, cast };
}

/**
 * 把豆瓣海报升级到高分辨率档位。
 *
 * 豆瓣图片路径中的 `s_ratio_poster`(≈200px) / `m_ratio_poster`(540px) 可
 * 直接替换为 `l_ratio_poster`(1080px)，路径其余部分不变。
 *
 * 仅用于 Hero 这类「大面积铺底」场景：540px 的中图铺满 1200px 宽的巨幕时
 * 会被放大 2.2 倍，画质明显发虚，必须换 1080px 高图；普通网格卡片保持中图，
 * 避免整页流量暴涨（高图约 3 倍体积）。
 *
 * 非豆瓣图片、或已是高图的 URL 原样返回。
 */
export function upgradePosterResolution(url: string): string {
  if (!url) return url;
  return url.replace(/\/(?:s|m)_ratio_poster\//, '/l_ratio_poster/');
}

/**
 * 处理图片 URL，如果设置了图片代理则使用代理
 */
export function processImageUrl(originalUrl: string): string {
  if (!originalUrl) return originalUrl;

  // 仅处理豆瓣图片代理
  if (!originalUrl.includes('doubanio.com')) {
    return originalUrl;
  }

  const { proxyType, proxyUrl } = getDoubanImageProxyConfig();
  switch (proxyType) {
    case 'server':
      return `/api/image-proxy?url=${encodeURIComponent(originalUrl)}`;
    case 'img3':
      return originalUrl.replace(/img\d+\.doubanio\.com/g, 'img3.doubanio.com');
    case 'cmliussss-cdn-tencent':
      return originalUrl.replace(
        /img\d+\.doubanio\.com/g,
        'img.doubanio.cmliussss.net'
      );
    case 'cmliussss-cdn-ali':
      return originalUrl.replace(
        /img\d+\.doubanio\.com/g,
        'img.doubanio.cmliussss.com'
      );
    case 'custom':
      return `${proxyUrl}${encodeURIComponent(originalUrl)}`;
    case 'direct':
    default:
      return originalUrl;
  }
}

/**
 * 从m3u8地址获取视频质量等级和网络信息（多点抽样增强版）
 * @param m3u8Url m3u8播放列表的URL
 * @returns Promise<{quality: string, loadSpeed: string, pingTime: number, speedJitter: number}> 视频质量等级和网络信息
 */
export async function getVideoResolutionFromM3u8(m3u8Url: string): Promise<{
  quality: string;
  loadSpeed: string;
  pingTime: number;
  speedJitter: number;
}> {
  return new Promise(async (resolve, reject) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      reject(new Error('Timeout: Multi-point sampling test took too long'));
    }, 10000); // 10秒总超时

    try {
      // 1. 获取M3U8清单文件，计算初始延迟(Ping)
      const pingStart = performance.now();
      const manifestResponse = await fetch(m3u8Url, { signal: controller.signal });
      const pingTime = performance.now() - pingStart;

      if (!manifestResponse.ok) {
        throw new Error(`Manifest fetch failed with status: ${manifestResponse.status}`);
      }
      const manifestContent = await manifestResponse.text();

      // 2. 从清单中解析分片URL和最高画质
      const lines = manifestContent.split('\n');
      const segmentUrls = lines
        .filter(line => line.trim() && !line.startsWith('#'))
        .map(url => new URL(url, m3u8Url).href);

      if (segmentUrls.length === 0) {
        throw new Error('No segments found in manifest');
      }

      const resolutionRegex = /RESOLUTION=(\d+)x(\d+)/g;
      let match;
      let maxResolution = 0;
      while ((match = resolutionRegex.exec(manifestContent)) !== null) {
        const width = parseInt(match[1], 10);
        if (width > maxResolution) maxResolution = width;
      }
      
      let quality = '未知';
      if (maxResolution > 0) {
        quality =
          maxResolution >= 3840 ? '4K' :
          maxResolution >= 2560 ? '2K' :
          maxResolution >= 1920 ? '1080P' :
          maxResolution >= 1280 ? '720P' :
          maxResolution >= 854 ? '480P' : 'SD';
      }

      // 3. 选择测试分片（第一个和中间一个）
      const segmentsToTest: string[] = [];
      if (segmentUrls[0]) {
        segmentsToTest.push(segmentUrls[0]);
      }
      if (segmentUrls.length > 2) {
        segmentsToTest.push(segmentUrls[Math.floor(segmentUrls.length / 2)]);
      }

      // 4. 并行测试分片下载速度
      const testSegment = async (url: string): Promise<number> => {
        try {
          const startTime = performance.now();
          const segmentResponse = await fetch(url, { signal: controller.signal });
          if (!segmentResponse.ok) return 0;
          const size = (await segmentResponse.arrayBuffer()).byteLength;
          const loadTime = performance.now() - startTime;
          if (loadTime <= 0 || size <= 0) return 0;
          return size / 1024 / (loadTime / 1000); // KB/s
        } catch (error) {
          return 0; // 任何错误都视为速度为0
        }
      };

      const speedSamples = (await Promise.all(segmentsToTest.map(testSegment))).filter(speed => speed > 0);

      if (speedSamples.length === 0) {
        throw new Error('All segment download tests failed');
      }

      // 5. 计算最终统计数据
      const avgSpeed = speedSamples.reduce((a, b) => a + b, 0) / speedSamples.length;
      const finalLoadSpeed = avgSpeed >= 1024 ? `${(avgSpeed / 1024).toFixed(1)} MB/s` : `${avgSpeed.toFixed(1)} KB/s`;
      
      let speedJitter = 0;
      if (speedSamples.length > 1) {
        const mean = avgSpeed;
        const variance = speedSamples.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / speedSamples.length;
        speedJitter = Math.sqrt(variance);
      }

      clearTimeout(timeout);
      resolve({ quality, loadSpeed: finalLoadSpeed, pingTime: Math.round(pingTime), speedJitter });

    } catch (error) {
      clearTimeout(timeout);
      reject(error);
    }
  });
}

/**
 * 统一格式化评分：始终保留一位小数。
 *
 * 豆瓣返回的评分可能是 "7"、"8.5"、"8.55" 甚至空字符串，
 * 直接渲染会出现「整数 7」与「小数 8.5」混排的割裂感。
 * 这里统一走 `toFixed(1)`：7 -> "7.0"，8.55 -> "8.6"（四舍五入）。
 *
 * 非法值（空 / NaN）原样返回空串，交给调用方决定是否渲染角标。
 */
export function formatRating(rate?: string | number | null): string {
  if (rate === null || rate === undefined) return '';

  const numeric = typeof rate === 'number' ? rate : parseFloat(String(rate).trim());
  if (Number.isNaN(numeric)) return '';

  return numeric.toFixed(1);
}

export function cleanHtmlTags(text: string): string {
  if (!text) return '';

  const cleanedText = text
    .replace(/<[^>]+>/g, '\n') // 将 HTML 标签替换为换行
    .replace(/\n+/g, '\n') // 将多个连续换行合并为一个
    .replace(/[ \t]+/g, ' ') // 将多个连续空格和制表符合并为一个空格，但保留换行符
    .replace(/^\n+|\n+$/g, '') // 去掉首尾换行
    .trim(); // 去掉首尾空格

  // 使用 he 库解码 HTML 实体
  return he.decode(cleanedText);
}
