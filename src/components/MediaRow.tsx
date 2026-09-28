'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as React from 'react';

interface MediaRowProps {
  children: React.ReactNode;
  className?: string;
  /**
   * 是否显示左右翻页箭头。默认 true。
   * 首页 5 个板块因右箭头在悬停时点击异常，已传 false 隐藏左右箭头，
   * 改由鼠标滚轮 / 触控板 / 触摸滑动浏览。
   */
  showArrows?: boolean;
}

/**
 * 单行影视轨道（1 Row Carousel）。
 *
 * 彻底根除"多行海报墙"：无论数据源有多少条，**永远只占一行**，
 * 超出可视范围的卡片通过左右箭头 / 触摸横向滑动查看。
 *
 * 可视卡片数（严格对称，不会末尾落单）：
 * - H5   (<768px)   : 2 张, gap-4
 * - 平板 (768~1024) : 4 张, gap-4
 * - PC   (>=1024)   : 6 张, gap-6
 */
export default function MediaRow({
  children,
  className = '',
  showArrows = true,
}: MediaRowProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const threshold = 2; // 容差，避免浮点误差
    setCanScrollLeft(el.scrollLeft > threshold);
    setCanScrollRight(
      el.scrollWidth - el.clientWidth - el.scrollLeft > threshold
    );
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    checkScroll();

    const resizeObserver = new ResizeObserver(checkScroll);
    resizeObserver.observe(el);

    // 子节点数量/尺寸变化（骨架屏 -> 真实数据）时重新计算
    const mutationObserver = new MutationObserver(() =>
      requestAnimationFrame(checkScroll)
    );
    mutationObserver.observe(el, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    window.addEventListener('resize', checkScroll);

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll, children]);

  const scrollByPage = (direction: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    // 一次翻一屏（略微留白，形成连续浏览的视觉衔接）
    el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: 'smooth' });
  };

  const items = React.Children.toArray(children);

  return (
    <div className={`group/row relative ${className}`}>
      <div
        ref={trackRef}
        onScroll={checkScroll}
        className='flex gap-4 lg:gap-6 overflow-x-auto scrollbar-hide py-3 -my-3 px-1 -mx-1 snap-x snap-mandatory sm:snap-none'
      >
        {items.map((child, index) => (
          <div
            key={index}
            className='shrink-0 snap-start
              w-[calc((100%-1rem)/2)]
              md:w-[calc((100%-3rem)/4)]
              lg:w-[calc((100%-7.5rem)/6)]'
          >
            {child}
          </div>
        ))}
      </div>

      {/* 左箭头：桌面 / 平板悬停显示 */}
      {showArrows && canScrollLeft && (
        <button
          onClick={() => scrollByPage(-1)}
          aria-label='向左滑动'
          className='absolute left-1 top-1/2 -translate-y-1/2 z-20 hidden md:flex
            w-11 h-11 rounded-full glass-strong items-center justify-center text-ink
            opacity-0 group-hover/row:opacity-100 hover:bg-gold hover:text-black
            hover:scale-105 transition-all duration-200'
        >
          <ChevronLeft className='w-5 h-5' />
        </button>
      )}

      {/* 右箭头 */}
      {showArrows && canScrollRight && (
        <button
          onClick={() => scrollByPage(1)}
          aria-label='向右滑动'
          className='absolute right-1 top-1/2 -translate-y-1/2 z-20 hidden md:flex
            w-11 h-11 rounded-full glass-strong items-center justify-center text-ink
            opacity-0 group-hover/row:opacity-100 hover:bg-gold hover:text-black
            hover:scale-105 transition-all duration-200'
        >
          <ChevronRight className='w-5 h-5' />
        </button>
      )}
    </div>
  );
}
