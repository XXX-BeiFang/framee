import { NextResponse } from 'next/server';

import { getCacheTime } from '@/lib/config';
import { fetchDoubanData } from '@/lib/douban';
import { sanitizeSort, sanitizeYear } from '@/lib/doubanFilters';
import { DoubanItem, DoubanResult } from '@/lib/types';

/**
 * 新版豆瓣「推荐」接口返回结构。
 *
 * 注意：该接口的每一条数据都带有 `card_subtitle`（形如
 * `2026 / 美国 加拿大 / 动作 历史 / 诺兰 / 马特·达蒙`），
 * 年份即从该字段用正则抽取，因此卡片第二行能够稳定拿到年份。
 * （旧版 `j/search_subjects` 接口不返回任何年份信息，已被弃用。）
 */
interface DoubanRecommendApiResponse {
  total: number;
  items: Array<{
    id: string;
    title: string;
    type?: string;
    card_subtitle?: string;
    year?: string;
    pic?: {
      large?: string;
      normal?: string;
    };
    rating?: {
      value?: number;
    };
  }>;
}

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // 获取参数
  const type = searchParams.get('type');
  const tag = searchParams.get('tag');
  const pageSize = parseInt(searchParams.get('pageSize') || '16');
  const pageStart = parseInt(searchParams.get('pageStart') || '0');
  // 年份 / 排序为可选维度，非法值一律降级为「不限」，不影响默认请求
  const year = sanitizeYear(searchParams.get('year'));
  const sort = sanitizeSort(searchParams.get('sort'));

  // 验证参数：type 与 tag 必须同时存在（与客户端 douban.client.ts 的校验口径一致）
  if (!type || !tag) {
    return NextResponse.json(
      { error: '缺少必要参数: type 和 tag' },
      { status: 400 }
    );
  }

  if (!['tv', 'movie'].includes(type)) {
    return NextResponse.json(
      { error: 'type 参数必须是 tv 或 movie' },
      { status: 400 }
    );
  }

  if (pageSize < 1 || pageSize > 100) {
    return NextResponse.json(
      { error: 'pageSize 必须在 1-100 之间' },
      { status: 400 }
    );
  }

  if (pageStart < 0) {
    return NextResponse.json(
      { error: 'pageStart 不能小于 0' },
      { status: 400 }
    );
  }

  if (tag === 'top250') {
    return handleTop250(pageStart);
  }

  try {
    const list = await fetchRecommendList(
      type as 'tv' | 'movie',
      tag,
      pageSize,
      pageStart,
      year,
      sort
    );

    const response: DoubanResult = {
      code: 200,
      message: '获取成功',
      list,
    };

    const cacheTime = await getCacheTime();
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
        'CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
        'Vercel-CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
        'Netlify-Vary': 'query',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: '获取豆瓣数据失败', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * 调用豆瓣新版「推荐」接口获取自定义分类数据。
 *
 * 该接口支持以中文分类名（如「华语」「科幻」「美剧」）作为 tags，
 * 并返回带有年份的 `card_subtitle`，从而保证「更多」页卡片第二行
 * 始终能展示「年份 · 分类」。
 *
 * `year` 与 `sort` 为可选维度：
 * - year 以中文标签（`2025` / `2020年代` / `更早`）与片单名一起拼进 tags，
 *   豆瓣按「交集」处理，因此年份与片单是 AND 关系；
 * - sort 直接作为接口的排序枚举（T/U/R/S）下发。
 * 两者为空时请求与历史行为完全一致。
 */
async function fetchRecommendList(
  kind: 'tv' | 'movie',
  tag: string,
  pageLimit: number,
  pageStart: number,
  year = '',
  sort = ''
): Promise<DoubanItem[]> {
  const baseUrl = `https://m.douban.com/rexxar/api/v2/${kind}/recommend`;
  const reqParams = new URLSearchParams();
  reqParams.append('refresh', '0');
  reqParams.append('start', pageStart.toString());
  reqParams.append('count', pageLimit.toString());
  // 豆瓣以 tags 做「交集」筛选：片单名与年份标签用逗号相连
  reqParams.append('tags', [tag, year].filter(Boolean).join(','));
  reqParams.append('selected_categories', '{}');
  reqParams.append('uncollect', 'false');
  reqParams.append('score_range', '0,10');
  if (sort) {
    reqParams.append('sort', sort);
  }

  const target = `${baseUrl}?${reqParams.toString()}`;
  const doubanData = await fetchDoubanData<DoubanRecommendApiResponse>(target);

  return (doubanData.items || [])
    // 过滤掉榜单 / 演员等非影视条目（recommend 接口会混入 type=chart 的榜单）
    .filter(
      (item) =>
        (item.type === 'movie' || item.type === 'tv') &&
        (item.pic?.large || item.pic?.normal)
    )
    .map((item) => ({
      id: String(item.id),
      title: item.title,
      poster: item.pic?.large || item.pic?.normal || '',
      rate: item.rating?.value ? item.rating.value.toFixed(1) : '',
      // 优先取顶层 year，其次从 card_subtitle 中抽取 4 位年份
      year: item.year || item.card_subtitle?.match(/(\d{4})/)?.[1] || '',
      cardSubtitle: item.card_subtitle || '',
    }));
}

function handleTop250(pageStart: number) {
  const target = `https://movie.douban.com/top250?start=${pageStart}&filter=`;

  // 直接使用 fetch 获取 HTML 页面
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  const fetchOptions = {
    signal: controller.signal,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      Referer: 'https://movie.douban.com/',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    },
  };

  return fetch(target, fetchOptions)
    .then(async (fetchResponse) => {
      clearTimeout(timeoutId);

      if (!fetchResponse.ok) {
        throw new Error(`HTTP error! Status: ${fetchResponse.status}`);
      }

      // 获取 HTML 内容
      const html = await fetchResponse.text();

      // 通过正则同时捕获影片 id、标题、封面、评分以及副标题（含年份）
      const moviePattern =
        /<div class="item">[\s\S]*?<a[^>]+href="https?:\/\/movie\.douban\.com\/subject\/(\d+)\/"[\s\S]*?<img[^>]+alt="([^"]+)"[^>]*src="([^"]+)"[\s\S]*?<span class="rating_num"[^>]*>([^<]*)<\/span>[\s\S]*?<p class="">([\s\S]*?)<\/p>[\s\S]*?<\/div>/g;
      const movies: DoubanItem[] = [];
      let match;

      while ((match = moviePattern.exec(html)) !== null) {
        const id = match[1];
        const title = match[2];
        const cover = match[3];
        const rate = match[4] || '';
        // 副标题形如 "1994 / 美国 / 犯罪 剧情"，从中抽取 4 位年份
        const subtitle = match[5] || '';
        const year = subtitle.match(/(\d{4})/)?.[1] || '';

        // 处理图片 URL，确保使用 HTTPS
        const processedCover = cover.replace(/^http:/, 'https:');

        movies.push({
          id: id,
          title: title,
          poster: processedCover,
          rate: rate,
          year: year,
        });
      }

      const apiResponse: DoubanResult = {
        code: 200,
        message: '获取成功',
        list: movies,
      };

      const cacheTime = await getCacheTime();
      return NextResponse.json(apiResponse, {
        headers: {
          'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
          'CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
          'Vercel-CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
          'Netlify-Vary': 'query',
        },
      });
    })
    .catch((error) => {
      clearTimeout(timeoutId);
      return NextResponse.json(
        {
          error: '获取豆瓣 Top250 数据失败',
          details: (error as Error).message,
        },
        { status: 500 }
      );
    });
}
