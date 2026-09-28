/* eslint-disable react-hooks/exhaustive-deps */

'use client';

import React from 'react';

import {
  SORT_DEFAULT,
  YEAR_DEFAULT,
  getSortOptions,
  getYearOptions,
} from '@/lib/doubanFilters';

interface CustomCategory {
  name: string;
  type: 'movie' | 'tv';
  query: string;
}

interface DoubanCustomSelectorProps {
  customCategories: CustomCategory[];
  primarySelection?: string;
  secondarySelection?: string;
  /** 多级维度当前值（本组件只用 year / sort 两项） */
  multiLevelValues?: Record<string, string>;
  onPrimaryChange: (value: string) => void;
  onSecondaryChange: (value: string) => void;
  onMultiLevelChange?: (values: Record<string, string>) => void;
}

const CHIP_BASE =
  'inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium transition-colors duration-200 sm:px-3 sm:py-1.5 sm:text-[13px]';
const CHIP_ACTIVE =
  'bg-amber-400/20 text-amber-300 border border-amber-400/30';
const CHIP_IDLE =
  'bg-transparent text-slate-400 border border-transparent hover:text-white cursor-pointer';

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
    {/* 与 DoubanSelector / MultiLevelSelector 保持同一套行布局：自动换行，不横滚 */}
    <div className='flex min-w-0 flex-1 flex-wrap items-center gap-1.5 py-0.5 sm:gap-2'>
      {children}
    </div>
  </div>
);

/**
 * “更多”自定义片单筛选栏（现代无界微透样式）。
 *
 * 四行筛选：分类（电影 / 剧集）→ 片单 → 年份 → 排序。
 * 年份与排序是「镜头」维度，与片单正交：切换片单时保留，
 * 切换分类时也保留，只有用户自己改才会变。
 */
const DoubanCustomSelector: React.FC<DoubanCustomSelectorProps> = ({
  customCategories,
  primarySelection,
  secondarySelection,
  multiLevelValues,
  onPrimaryChange,
  onSecondaryChange,
  onMultiLevelChange,
}) => {
  const primaryOptions = React.useMemo(() => {
    const types = Array.from(new Set(customCategories.map((cat) => cat.type)));
    const sortedTypes = types.sort((a, b) => {
      if (a === 'movie' && b !== 'movie') return -1;
      if (a !== 'movie' && b === 'movie') return 1;
      return 0;
    });
    return sortedTypes.map((type) => ({
      label: type === 'movie' ? '电影' : '剧集',
      value: type,
    }));
  }, [customCategories]);

  const secondaryOptions = React.useMemo(() => {
    if (!primarySelection) return [];
    return customCategories
      .filter((cat) => cat.type === primarySelection)
      .map((cat) => ({ label: cat.name || cat.query, value: cat.query }));
  }, [customCategories, primarySelection]);

  const yearOptions = React.useMemo(() => getYearOptions(), []);
  // 剧集说「首播时间」，电影说「首映时间」
  const sortOptions = React.useMemo(
    () => getSortOptions(primarySelection === 'tv'),
    [primarySelection]
  );

  const yearValue = multiLevelValues?.year || YEAR_DEFAULT;
  const sortValue = multiLevelValues?.sort || SORT_DEFAULT;

  /**
   * 只上报 year / sort 两个键。
   * 父组件会用返回值整体替换 multiLevelValues，所以必须同时带上另一维的
   * 当前值，否则改年份会把排序悄悄重置掉（反之亦然）。
   */
  const emit = (next: { year?: string; sort?: string }) => {
    onMultiLevelChange?.({
      year: next.year ?? yearValue,
      sort: next.sort ?? sortValue,
    });
  };

  const renderChips = (
    options: { label: string; value: string }[],
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

  if (!customCategories || customCategories.length === 0) {
    return null;
  }

  return (
    <div className='space-y-2 sm:space-y-2.5'>
      <FilterRow label='分类'>
        {renderChips(primaryOptions, primarySelection || primaryOptions[0]?.value, onPrimaryChange)}
      </FilterRow>

      {secondaryOptions.length > 0 && (
        <FilterRow label='片单'>
          {renderChips(
            secondaryOptions,
            secondarySelection || secondaryOptions[0]?.value,
            onSecondaryChange
          )}
        </FilterRow>
      )}

      <FilterRow label='年份'>
        {renderChips(yearOptions, yearValue, (value) => emit({ year: value }))}
      </FilterRow>

      <FilterRow label='排序'>
        {renderChips(sortOptions, sortValue, (value) => emit({ sort: value }))}
      </FilterRow>
    </div>
  );
};

export default DoubanCustomSelector;
