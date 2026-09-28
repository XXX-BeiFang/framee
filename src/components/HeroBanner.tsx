/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import { Info, Play, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { processImageUrl } from '@/lib/utils';

export interface HeroItem {
  title: string;
  poster: string;
  rate?: string;
  year?: string;
  id?: string | number;
  /** 简介（可选） */
  description?: string;
  /** 演员 / 主创介绍（可选） */
  cast?: string;
  /** 分类标签，如 电影 / 剧集 */
  typeLabel?: string;
}

interface HeroBannerProps {
  /** 单片模式（回退用） */
  item?: HeroItem | null;
  /** 多片轮播：提供后优先使用 */
  items?: HeroItem[];
  /** 加载中显示骨架 */
  loading?: boolean;
}

/** 每张停留时长 */
const ROTATE_MS = 7000;
/** 最多轮播张数 */
const MAX_SLIDES = 5;

/**
 * 影院级 Hero 巨幕 Banner（多片自动轮播）。
 *
 * - 固定高度：移动端 420px / 平板 460px / PC 480px
 * - 轮播：多片 crossfade，每 ROTATE_MS 切换一张，底部指示条可点选
 * - 性能：仅挂载「当前 + 下一张」的图片，其余只渲染蒙版层；首张 eager、其余 lazy
 * - 无障碍：hover 暂停；`prefers-reduced-motion: reduce` 时停用自动轮播，静态显示首张
 * - 单片（items 只有 1 个）时无指示条、不轮播
 */
export default function HeroBanner({ item, items, loading }: HeroBannerProps) {
  const router = useRouter();

  const slides = React.useMemo(() => {
    const source: HeroItem[] =
      items && items.length ? items : item ? [item] : [];
    return source.filter((s) => Boolean(s && s.poster)).slice(0, MAX_SLIDES);
  }, [items, item]);

  const [active, setActive] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [reduceMotion, setReduceMotion] = React.useState(false);
  const n = slides.length;

  // 尊重系统「减少动态效果」
  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // 数据源变化时把下标收进合法范围
  React.useEffect(() => {
    setActive((i) => (i >= n ? 0 : i));
  }, [n]);

  // 自动轮播
  React.useEffect(() => {
    if (n <= 1 || paused || reduceMotion) return;
    const t = window.setInterval(() => setActive((i) => (i + 1) % n), ROTATE_MS);
    return () => window.clearInterval(t);
  }, [n, paused, reduceMotion]);

  if (loading || n === 0) {
    return (
      <section className='relative w-full h-[420px] sm:h-[460px] lg:h-[480px] rounded-none sm:rounded-2xl overflow-hidden mb-10'>
        <div className='absolute inset-0 bg-obsidian-600 animate-pulse' />
        <div className='absolute inset-0 bg-gradient-to-b from-transparent via-[#0A0B10]/60 to-[#0A0B10]' />
      </section>
    );
  }

  const buildDetailUrl = (s: HeroItem) => {
    const params = new URLSearchParams();
    params.set('title', s.title.trim());
    if (s.year) params.set('year', s.year);
    if (s.poster) params.set('poster', s.poster);
    if (s.id) params.set('doubanId', String(s.id));
    if (s.rate) params.set('rate', s.rate);
    return `/detail?${params.toString()}`;
  };

  /**
   * 「立即播放」直达播放页：只带 title / year / stype。
   * 不带 source + id 时，/play 会自行搜索片源并优选最佳线路后直接起播。
   */
  const buildPlayUrl = (s: HeroItem) => {
    const params = new URLSearchParams();
    params.set('title', s.title.trim());
    if (s.year) params.set('year', s.year);
    params.set('stype', s.typeLabel === '电影' ? 'movie' : 'tv');
    return `/play?${params.toString()}`;
  };

  return (
    <section
      className='relative w-full overflow-hidden mb-12 rounded-none sm:rounded-2xl h-[420px] sm:h-[460px] lg:h-[480px] group'
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription='carousel'
      aria-label='焦点推荐'
    >
      {slides.map((s, i) => {
        const isActive = i === active;
        const isNext = i === (active + 1) % n;
        // 只挂载当前与下一张的图片，控制首屏加载量
        const showImg = isActive || isNext;
        return (
          <div
            key={`${s.id ?? s.title}-${i}`}
            className='absolute inset-0 transition-opacity duration-700 ease-out'
            style={{
              opacity: isActive ? 1 : 0,
              pointerEvents: isActive ? 'auto' : 'none',
            }}
            aria-hidden={!isActive}
          >
            {showImg && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={processImageUrl(s.poster)}
                alt=''
                aria-hidden='true'
                loading={i === 0 ? 'eager' : 'lazy'}
                referrerPolicy='no-referrer'
                className='absolute inset-0 h-full w-full object-cover object-top'
              />
            )}

            {/* 水平渐变蒙版：左侧足够深，保证文字可读；右侧过渡到透明露出剧照 */}
            <div className='absolute inset-0 bg-gradient-to-r from-[#0A0B10] via-[#0A0B10]/80 to-transparent' />
            {/* 底部渐变蒙版：三段式羽化，自然融入下方内容区 */}
            <div className='absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent via-[#0A0B10]/60 to-[#0A0B10]' />

            {/* 内容区：左侧安全区，垂直居中 */}
            <div className='relative z-10 h-full flex flex-col justify-center px-6 sm:px-10 lg:px-14 max-w-[88%] sm:max-w-[62%] lg:max-w-[640px]'>
              <div className='flex items-center gap-2 mb-3 flex-wrap'>
                {s.typeLabel && (
                  <span className='px-2.5 py-1 rounded-lg glass-subtle text-[11px] font-medium text-ink-secondary tracking-wide'>
                    {s.typeLabel}
                  </span>
                )}
                {s.year && (
                  <span className='text-[12px] font-medium text-ink-secondary'>
                    {s.year}
                  </span>
                )}
                {s.rate && (
                  <span className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-gold/30 text-[12px] font-semibold text-gold'>
                    <Star className='h-3 w-3 fill-gold text-gold' />
                    豆瓣 {s.rate}
                  </span>
                )}
              </div>

              <h1 className='text-gradient mb-3 text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight tracking-tight line-clamp-2 drop-shadow-lg'>
                {s.title}
              </h1>

              {s.description && (
                <p className='mb-2 text-[13px] sm:text-[14px] font-medium text-ink-secondary line-clamp-1'>
                  {s.description}
                </p>
              )}

              {s.cast && (
                <p className='mb-5 sm:mb-6 text-[13px] sm:text-[14px] text-ink-muted line-clamp-1'>
                  {s.cast}
                </p>
              )}

              <div className='flex items-center gap-3'>
                <button
                  onClick={() => router.push(buildPlayUrl(s))}
                  className='inline-flex items-center gap-2 px-5 sm:px-7 py-2.5 sm:py-3 rounded-xl bg-gold text-black font-semibold text-[13px] sm:text-[15px] shadow-glow-gold hover:bg-gold-400 hover:shadow-glow-gold-strong hover:scale-[1.03] active:scale-[0.98] transition-all duration-200'
                >
                  <Play className='h-4 w-4 sm:h-5 sm:w-5 fill-black' />
                  立即播放
                </button>
                <button
                  onClick={() => router.push(buildDetailUrl(s))}
                  className='inline-flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl glass-subtle text-ink font-medium text-[13px] sm:text-[15px] hover:bg-white/12 hover:scale-[1.03] active:scale-[0.98] transition-all duration-200'
                >
                  <Info className='h-4 w-4 sm:h-5 sm:w-5' />
                  了解详情
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* 指示条：可点选切换 */}
      {n > 1 && (
        <div className='absolute z-20 left-6 sm:left-10 lg:left-14 bottom-5 flex items-center gap-1.5'>
          {slides.map((s, i) => (
            <button
              key={`dot-${s.id ?? s.title}-${i}`}
              onClick={() => setActive(i)}
              aria-label={`切换到第 ${i + 1} 张推荐`}
              aria-current={i === active}
              className={`h-[3px] rounded-full transition-all duration-300 ease-out ${
                i === active ? 'w-6 bg-gold' : 'w-2.5 bg-white/25 hover:bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
