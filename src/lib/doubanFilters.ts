/**
 * 豆瓣筛选维度选项的单一数据源。
 *
 * 为什么集中在这里：
 * 「更多」页（DoubanCustomSelector）与 电影 / 剧集 / 综艺 / 动漫 页
 * （MultiLevelSelector）共用同一套豆瓣 tag 词汇表。此前年份列表在两处
 * 各写一份，且已经腐化——实测豆瓣 rexxar 接口对
 * `1990年代` / `1980年代` / `1970年代` / `1960年代` / `更久年代`
 * 五个写法一律返回 0 条（豆瓣只认短写 `90年代` 与 `更早`），
 * 并且最高年份停在 2025，2026 年的作品无法单独筛选。
 * 集中到本文件后，词汇表只需维护一处。
 */

export interface FilterOption {
  label: string;
  value: string;
}

/** 所有维度「不限」的统一取值；父组件据此决定是否把该维度下传 */
export const FILTER_ALL = 'all';

/** 排序默认值：T = 综合排序，等价于不向豆瓣传 sort 参数 */
export const SORT_DEFAULT = 'T';

/** 年份默认值：不限 */
export const YEAR_DEFAULT = FILTER_ALL;

/**
 * 年份选项：近 8 个自然年 + 三个十年 + 更早，共 12 项。
 *
 * label 与 value 同为豆瓣 tag 的中文写法，因为豆瓣接口直接以中文
 * tag 做筛选：`2020年代` 有效，长写 `1990年代` 无效。
 * 近 8 年按当前年份动态生成，避免像旧代码那样逐年腐化。
 */
export function getYearOptions(now: Date = new Date()): FilterOption[] {
  const currentYear = now.getFullYear();
  const recentYears: FilterOption[] = Array.from({ length: 8 }, (_, i) => {
    const year = String(currentYear - i);
    return { label: year, value: year };
  });

  return [
    { label: '全部', value: FILTER_ALL },
    ...recentYears,
    { label: '2020年代', value: '2020年代' },
    { label: '2010年代', value: '2010年代' },
    { label: '2000年代', value: '2000年代' },
    { label: '更早', value: '更早' },
  ];
}

/**
 * 排序选项。T / U / R / S 是豆瓣 rexxar 接口的排序枚举：
 * T=综合排序、U=近期热度、R=首映（首播）时间、S=高分优先。
 * 剧集用「首播时间」，电影用「首映时间」。
 */
export function getSortOptions(isTv: boolean): FilterOption[] {
  return [
    { label: '综合排序', value: 'T' },
    { label: '近期热度', value: 'U' },
    { label: isTv ? '首播时间' : '首映时间', value: 'R' },
    { label: '高分优先', value: 'S' },
  ];
}

const VALID_SORTS = new Set(['T', 'U', 'R', 'S']);

/**
 * 服务端白名单校验：只放行已知排序枚举，其余一律丢弃（返回空串）。
 * 目的是不让任意字符串被原样拼进豆瓣请求，而不是限制用户选择。
 */
export function sanitizeSort(sort: string | null | undefined): string {
  return sort && VALID_SORTS.has(sort) ? sort : '';
}

/** 年份白名单：4 位年份，或已知的年代写法 */
const YEAR_PATTERN = /^(\d{4}|20\d0年代|90年代|80年代|70年代|60年代|更早)$/;

/** 服务端白名单校验：非法年份返回空串，由调用方忽略该维度 */
export function sanitizeYear(year: string | null | undefined): string {
  if (!year || year === FILTER_ALL) return '';
  return YEAR_PATTERN.test(year) ? year : '';
}
