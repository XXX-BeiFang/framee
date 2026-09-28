/* eslint-disable react-hooks/exhaustive-deps */

'use client';

import React from 'react';

import MultiLevelSelector from './MultiLevelSelector';
import WeekdaySelector from './WeekdaySelector';

interface SelectorOption {
  label: string;
  value: string;
}

interface DoubanSelectorProps {
  type: 'movie' | 'tv' | 'show' | 'anime';
  primarySelection?: string;
  secondarySelection?: string;
  onPrimaryChange: (value: string) => void;
  onSecondaryChange: (value: string) => void;
  onMultiLevelChange?: (values: Record<string, string>) => void;
  onWeekdayChange: (weekday: string) => void;
}

/* ============================================================
   标签样式常量 —— 现代无界微透（Ghost Chips）
   - 未选中：透明底 + 浅灰字，hover 转白
   - 选中：琥珀金半透明微光胶囊 + 细琥珀描边
   ============================================================ */
const CHIP_BASE =
  'inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium transition-colors duration-200 sm:px-3 sm:py-1.5 sm:text-[13px]';
const CHIP_ACTIVE =
  'bg-amber-400/20 text-amber-300 border border-amber-400/30';
const CHIP_IDLE =
  'bg-transparent text-slate-400 border border-transparent hover:text-white cursor-pointer';

/** 行：左侧固定宽度标签 + 右侧可横向滚动的标签组 */
const FilterRow = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className='flex w-full items-start gap-3 sm:gap-4'>
    <span className='w-8 shrink-0 pt-1 text-xs font-medium text-slate-500 sm:w-10 sm:pt-1.5 sm:text-[13px]'>
      {label}
    </span>
    {/* 自动换行而非横向滚动：全局隐藏了滚动条，横滚会让用户以为选项丢失 */}
    <div className='flex min-w-0 flex-1 flex-wrap items-center gap-1.5 py-0.5 sm:gap-2'>
      {children}
    </div>
  </div>
);

/**
 * 影视分类筛选栏。
 *
 * 设计约束：
 * - 无界：不包裹任何封闭背景卡片，直接落在页面背景上
 * - 轻量：选用微透标签行，让海报网格尽可能上提
 * - 稳定：不使用绝对定位的滑动指示器，彻底避免"文字被胶囊覆盖"的重叠 Bug
 */
const DoubanSelector: React.FC<DoubanSelectorProps> = ({
  type,
  primarySelection,
  secondarySelection,
  onPrimaryChange,
  onSecondaryChange,
  onMultiLevelChange,
  onWeekdayChange,
}) => {
  /* ---------- 选项定义 ---------- */

  // 电影
  const moviePrimaryOptions: SelectorOption[] = [
    { label: '全部', value: '全部' },
    { label: '热门电影', value: '热门' },
    { label: '最新电影', value: '最新' },
    { label: '豆瓣高分', value: '豆瓣高分' },
    { label: '冷门佳片', value: '冷门佳片' },
  ];
  const movieSecondaryOptions: SelectorOption[] = [
    { label: '全部', value: '全部' },
    { label: '华语', value: '华语' },
    { label: '欧美', value: '欧美' },
    { label: '韩国', value: '韩国' },
    { label: '日本', value: '日本' },
  ];

  // 剧集：第一行排序/热度，第二行地区，第三行类型（严禁混排）
  const tvSortOptions: SelectorOption[] = [
    { label: '全部', value: '全部' },
    { label: '最近热门', value: '最近热门' },
  ];
  const tvRegionOptions: SelectorOption[] = [
    { label: '全部', value: '全部' },
    { label: '国产', value: 'tv_domestic' },
    { label: '欧美', value: 'tv_american' },
    { label: '日本', value: 'tv_japanese' },
    { label: '韩国', value: 'tv_korean' },
  ];
  const tvTypeOptions: SelectorOption[] = [
    { label: '全部', value: 'tv' },
    { label: '剧集', value: 'tv_series' },
    { label: '动漫', value: 'tv_animation' },
    { label: '纪录片', value: 'tv_documentary' },
  ];

  // 综艺
  const showPrimaryOptions: SelectorOption[] = [
    { label: '全部', value: '全部' },
    { label: '最近热门', value: '最近热门' },
  ];
  const showSecondaryOptions: SelectorOption[] = [
    { label: '全部', value: 'show' },
    { label: '国内', value: 'show_domestic' },
    { label: '国外', value: 'show_foreign' },
  ];

  // 动漫
  const animePrimaryOptions: SelectorOption[] = [
    { label: '每日放送', value: '每日放送' },
    { label: '番剧', value: '番剧' },
    { label: '剧场版', value: '剧场版' },
  ];

  const handleMultiLevelChange = (values: Record<string, string>) => {
    onMultiLevelChange?.(values);
  };

  /**
   * 渲染一组微透标签。
   * 选中态由按钮自身 class 表达，不再依赖外部绝对定位指示器——
   * 这是修复文字重叠 / 错位的关键。
   */
  const renderChips = (
    options: SelectorOption[],
    activeValue: string | undefined,
    onChange: (value: string) => void
  ) => (
    <>
      {options.map((option) => {
        const isActive = activeValue === option.value;
        return (
          <button
            key={option.value}
            type='button'
            onClick={() => !isActive && onChange(option.value)}
            aria-pressed={isActive}
            className={`${CHIP_BASE} ${isActive ? CHIP_ACTIVE : CHIP_IDLE}`}
          >
            {option.label}
          </button>
        );
      })}
    </>
  );

  return (
    <div className='space-y-2 sm:space-y-2.5'>
      {/* ---------------- 电影 ---------------- */}
      {type === 'movie' && (
        <>
          <FilterRow label='分类'>
            {renderChips(moviePrimaryOptions, primarySelection || '全部', onPrimaryChange)}
          </FilterRow>

          {primarySelection !== '全部' ? (
            <FilterRow label='地区'>
              {renderChips(movieSecondaryOptions, secondarySelection || '全部', onSecondaryChange)}
            </FilterRow>
          ) : (
            <MultiLevelSelector
              key={`${type}-${primarySelection}`}
              onChange={handleMultiLevelChange}
              contentType={type}
            />
          )}
        </>
      )}

      {/* ---------------- 剧集：排序 / 地区 / 类型 三行分离 ---------------- */}
      {type === 'tv' && (
        <>
          <FilterRow label='排序'>
            {renderChips(tvSortOptions, primarySelection || '全部', onPrimaryChange)}
          </FilterRow>

          {primarySelection === '最近热门' ? (
            <>
              <FilterRow label='地区'>
                {renderChips(tvRegionOptions, secondarySelection || '全部', onSecondaryChange)}
              </FilterRow>
              <FilterRow label='类型'>
                {renderChips(tvTypeOptions, 'tv', onSecondaryChange)}
              </FilterRow>
            </>
          ) : (
            <MultiLevelSelector
              key={`${type}-${primarySelection}`}
              onChange={handleMultiLevelChange}
              contentType={type}
            />
          )}
        </>
      )}

      {/* ---------------- 动漫 ---------------- */}
      {type === 'anime' && (
        <>
          <FilterRow label='分类'>
            {renderChips(animePrimaryOptions, primarySelection || '每日放送', onPrimaryChange)}
          </FilterRow>

          {(primarySelection || '每日放送') === '每日放送' ? (
            <FilterRow label='星期'>
              <WeekdaySelector onWeekdayChange={onWeekdayChange} />
            </FilterRow>
          ) : (primarySelection || '每日放送') === '番剧' ? (
            <MultiLevelSelector
              key={`anime-tv-${primarySelection}`}
              onChange={handleMultiLevelChange}
              contentType='anime-tv'
            />
          ) : (
            <MultiLevelSelector
              key={`anime-movie-${primarySelection}`}
              onChange={handleMultiLevelChange}
              contentType='anime-movie'
            />
          )}
        </>
      )}

      {/* ---------------- 综艺 ---------------- */}
      {type === 'show' && (
        <>
          <FilterRow label='分类'>
            {renderChips(showPrimaryOptions, primarySelection || '全部', onPrimaryChange)}
          </FilterRow>

          {(primarySelection || '全部') === '最近热门' ? (
            <FilterRow label='类型'>
              {renderChips(showSecondaryOptions, secondarySelection || 'show', onSecondaryChange)}
            </FilterRow>
          ) : (
            <MultiLevelSelector
              key={`${type}-${primarySelection}`}
              onChange={handleMultiLevelChange}
              contentType={type}
            />
          )}
        </>
      )}
    </div>
  );
};

export default DoubanSelector;
