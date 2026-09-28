'use client';

import React, { useState } from 'react';

import {
  FILTER_ALL,
  SORT_DEFAULT,
  getSortOptions,
  getYearOptions,
} from '@/lib/doubanFilters';

interface MultiLevelOption {
  label: string;
  value: string;
}

interface MultiLevelCategory {
  key: string;
  label: string;
  options: MultiLevelOption[];
  multiSelect?: boolean;
}

interface MultiLevelSelectorProps {
  onChange: (values: Record<string, string>) => void;
  contentType?: 'movie' | 'tv' | 'show' | 'anime-tv' | 'anime-movie';
}

/* ============================================================
   标签样式常量 —— 与 DoubanSelector / 电影页保持完全一致
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
 * 多级筛选器（无界微透版）。
 *
 * 已从"悬浮下拉菜单"重构为「每组一行、扁平化胶囊标签」：
 * 每一个筛选维度（类型 / 地区 / 年份 / 平台 / 排序）各自占一行，
 * 行内选项横向可滚动，与电影页 / 剧集页的筛选样式完全统一，
 * 彻底移除孤立的 `类型 ∨` / `地区 ∨` 下拉浮层。
 */
const MultiLevelSelector: React.FC<MultiLevelSelectorProps> = ({
  onChange,
  contentType = 'movie',
}) => {
  const [values, setValues] = useState<Record<string, string>>({});

  // 根据内容类型获取对应的类型选项
  const getTypeOptions = (
    contentType: 'movie' | 'tv' | 'show' | 'anime-tv' | 'anime-movie'
  ) => {
    const baseOptions = [{ label: '全部', value: 'all' }];

    switch (contentType) {
      case 'movie':
        return [
          ...baseOptions,
          { label: '喜剧', value: 'comedy' },
          { label: '爱情', value: 'romance' },
          { label: '动作', value: 'action' },
          { label: '科幻', value: 'sci-fi' },
          { label: '悬疑', value: 'suspense' },
          { label: '犯罪', value: 'crime' },
          { label: '惊悚', value: 'thriller' },
          { label: '冒险', value: 'adventure' },
          { label: '音乐', value: 'music' },
          { label: '历史', value: 'history' },
          { label: '奇幻', value: 'fantasy' },
          { label: '恐怖', value: 'horror' },
          { label: '战争', value: 'war' },
          { label: '传记', value: 'biography' },
          { label: '歌舞', value: 'musical' },
          { label: '武侠', value: 'wuxia' },
          { label: '情色', value: 'erotic' },
          { label: '灾难', value: 'disaster' },
          { label: '西部', value: 'western' },
          { label: '纪录片', value: 'documentary' },
          { label: '短片', value: 'short' },
        ];
      case 'tv':
        return [
          ...baseOptions,
          { label: '喜剧', value: 'comedy' },
          { label: '爱情', value: 'romance' },
          { label: '悬疑', value: 'suspense' },
          { label: '武侠', value: 'wuxia' },
          { label: '古装', value: 'costume' },
          { label: '家庭', value: 'family' },
          { label: '犯罪', value: 'crime' },
          { label: '科幻', value: 'sci-fi' },
          { label: '恐怖', value: 'horror' },
          { label: '历史', value: 'history' },
          { label: '战争', value: 'war' },
          { label: '动作', value: 'action' },
          { label: '冒险', value: 'adventure' },
          { label: '传记', value: 'biography' },
          { label: '剧情', value: 'drama' },
          { label: '奇幻', value: 'fantasy' },
          { label: '惊悚', value: 'thriller' },
          { label: '灾难', value: 'disaster' },
          { label: '歌舞', value: 'musical' },
          { label: '音乐', value: 'music' },
        ];
      case 'show':
        return [
          ...baseOptions,
          { label: '真人秀', value: 'reality' },
          { label: '脱口秀', value: 'talkshow' },
          { label: '音乐', value: 'music' },
          { label: '歌舞', value: 'musical' },
        ];
      case 'anime-tv':
      case 'anime-movie':
      default:
        return baseOptions;
    }
  };

  // 根据内容类型获取对应的地区选项
  const getRegionOptions = (
    contentType: 'movie' | 'tv' | 'show' | 'anime-tv' | 'anime-movie'
  ) => {
    const baseOptions = [{ label: '全部', value: 'all' }];

    switch (contentType) {
      case 'movie':
      case 'anime-movie':
        return [
          ...baseOptions,
          { label: '华语', value: 'chinese' },
          { label: '欧美', value: 'western' },
          { label: '韩国', value: 'korean' },
          { label: '日本', value: 'japanese' },
          { label: '中国大陆', value: 'mainland_china' },
          { label: '美国', value: 'usa' },
          { label: '中国香港', value: 'hong_kong' },
          { label: '中国台湾', value: 'taiwan' },
          { label: '英国', value: 'uk' },
          { label: '法国', value: 'france' },
          { label: '德国', value: 'germany' },
          { label: '意大利', value: 'italy' },
          { label: '西班牙', value: 'spain' },
          { label: '印度', value: 'india' },
          { label: '泰国', value: 'thailand' },
          { label: '俄罗斯', value: 'russia' },
          { label: '加拿大', value: 'canada' },
          { label: '澳大利亚', value: 'australia' },
          { label: '爱尔兰', value: 'ireland' },
          { label: '瑞典', value: 'sweden' },
          { label: '巴西', value: 'brazil' },
          { label: '丹麦', value: 'denmark' },
        ];
      case 'tv':
      case 'anime-tv':
      case 'show':
        return [
          ...baseOptions,
          { label: '华语', value: 'chinese' },
          { label: '欧美', value: 'western' },
          { label: '国外', value: 'foreign' },
          { label: '韩国', value: 'korean' },
          { label: '日本', value: 'japanese' },
          { label: '中国大陆', value: 'mainland_china' },
          { label: '中国香港', value: 'hong_kong' },
          { label: '美国', value: 'usa' },
          { label: '英国', value: 'uk' },
          { label: '泰国', value: 'thailand' },
          { label: '中国台湾', value: 'taiwan' },
          { label: '意大利', value: 'italy' },
          { label: '法国', value: 'france' },
          { label: '德国', value: 'germany' },
          { label: '西班牙', value: 'spain' },
          { label: '俄罗斯', value: 'russia' },
          { label: '瑞典', value: 'sweden' },
          { label: '巴西', value: 'brazil' },
          { label: '丹麦', value: 'denmark' },
          { label: '印度', value: 'india' },
          { label: '加拿大', value: 'canada' },
          { label: '爱尔兰', value: 'ireland' },
          { label: '澳大利亚', value: 'australia' },
        ];
      default:
        return baseOptions;
    }
  };

  const getLabelOptions = (
    contentType: 'movie' | 'tv' | 'show' | 'anime-tv' | 'anime-movie'
  ) => {
    const baseOptions = [{ label: '全部', value: 'all' }];
    switch (contentType) {
      case 'anime-movie':
        return [
          ...baseOptions,
          { label: '定格动画', value: 'stop_motion' },
          { label: '传记', value: 'biography' },
          { label: '美国动画', value: 'us_animation' },
          { label: '爱情', value: 'romance' },
          { label: '黑色幽默', value: 'dark_humor' },
          { label: '歌舞', value: 'musical' },
          { label: '儿童', value: 'children' },
          { label: '二次元', value: 'anime' },
          { label: '动物', value: 'animal' },
          { label: '青春', value: 'youth' },
          { label: '历史', value: 'history' },
          { label: '励志', value: 'inspirational' },
          { label: '恶搞', value: 'parody' },
          { label: '治愈', value: 'healing' },
          { label: '运动', value: 'sports' },
          { label: '后宫', value: 'harem' },
          { label: '情色', value: 'erotic' },
          { label: '人性', value: 'human_nature' },
          { label: '悬疑', value: 'suspense' },
          { label: '恋爱', value: 'love' },
          { label: '魔幻', value: 'fantasy' },
          { label: '科幻', value: 'sci_fi' },
        ];
      case 'anime-tv':
        return [
          ...baseOptions,
          { label: '黑色幽默', value: 'dark_humor' },
          { label: '历史', value: 'history' },
          { label: '歌舞', value: 'musical' },
          { label: '励志', value: 'inspirational' },
          { label: '恶搞', value: 'parody' },
          { label: '治愈', value: 'healing' },
          { label: '运动', value: 'sports' },
          { label: '后宫', value: 'harem' },
          { label: '情色', value: 'erotic' },
          { label: '国漫', value: 'chinese_anime' },
          { label: '人性', value: 'human_nature' },
          { label: '悬疑', value: 'suspense' },
          { label: '恋爱', value: 'love' },
          { label: '魔幻', value: 'fantasy' },
          { label: '科幻', value: 'sci_fi' },
        ];
      default:
        return baseOptions;
    }
  };
  
  // 根据内容类型获取对应的平台选项
  const getPlatformOptions = (
    contentType: 'movie' | 'tv' | 'show' | 'anime-tv' | 'anime-movie'
  ) => {
    const baseOptions = [{ label: '全部', value: 'all' }];

    switch (contentType) {
      case 'movie':
        return baseOptions; // 电影不需要平台选项
      case 'tv':
      case 'anime-tv':
      case 'show':
        return [
          ...baseOptions,
          { label: '腾讯视频', value: 'tencent' },
          { label: '爱奇艺', value: 'iqiyi' },
          { label: '优酷', value: 'youku' },
          { label: '湖南卫视', value: 'hunan_tv' },
          { label: 'Netflix', value: 'netflix' },
          { label: 'HBO', value: 'hbo' },
          { label: 'BBC', value: 'bbc' },
          { label: 'NHK', value: 'nhk' },
          { label: 'CBS', value: 'cbs' },
          { label: 'NBC', value: 'nbc' },
          { label: 'tvN', value: 'tvn' },
        ];
      default:
        return baseOptions;
    }
  };

  // 分类配置
  const categories: MultiLevelCategory[] = [
    ...(contentType !== 'anime-tv' && contentType !== 'anime-movie'
      ? [
          {
            key: 'type',
            label: '类型',
            options: getTypeOptions(contentType),
          },
        ]
      : [
          {
            key: 'label',
            label: '类型',
            options: getLabelOptions(contentType),
          },
        ]),
    {
      key: 'region',
      label: '地区',
      options: getRegionOptions(contentType),
    },
    {
      key: 'year',
      label: '年份',
      // 词汇表集中在 lib/doubanFilters，避免各页各写一份后腐化
      options: getYearOptions(),
    },
    // 只在剧集和综艺时显示平台选项
    ...(contentType === 'tv' ||
    contentType === 'show' ||
    contentType === 'anime-tv'
      ? [
          {
            key: 'platform',
            label: '平台',
            options: getPlatformOptions(contentType),
          },
        ]
      : []),
    {
      key: 'sort',
      label: '排序',
      options: getSortOptions(
        contentType === 'tv' || contentType === 'show'
      ),
    },
  ];

  /**
   * 判断某个维度当前是否处于「默认值」状态。
   * - 排序的默认值是 `T`（综合排序）
   * - 其余维度的默认值是 `all`
   */
  const getDefaultValue = (categoryKey: string) =>
    categoryKey === 'sort' ? SORT_DEFAULT : FILTER_ALL;

  const isOptionSelected = (categoryKey: string, optionValue: string) => {
    const value = values[categoryKey] ?? getDefaultValue(categoryKey);
    return value === optionValue;
  };

  /**
   * 选中某个维度下的某个选项。
   * 组装给父组件的值：排序传 value，其余维度传 label
   * （与服务器端 recommend 接口的 tags 语义保持一致）。
   */
  const handleOptionSelect = (categoryKey: string, optionValue: string) => {
    const newValues = { ...values, [categoryKey]: optionValue };
    setValues(newValues);

    const selectionsForParent: Record<string, string> = {
      type: 'all',
      region: 'all',
      year: 'all',
      platform: 'all',
      label: 'all',
      sort: 'T',
    };

    Object.entries(newValues).forEach(([key, value]) => {
      if (value && value !== 'all' && (key !== 'sort' || value !== 'T')) {
        const category = categories.find((cat) => cat.key === key);
        const option = category?.options.find((opt) => opt.value === value);
        if (option) {
          selectionsForParent[key] =
            key === 'sort' ? option.value : option.label;
        }
      }
    });

    onChange(selectionsForParent);
  };

  return (
    <div className='flex flex-1 flex-wrap items-center gap-x-4 gap-y-2'>
      {categories.map((category) => (
        <FilterRow key={category.key} label={category.label}>
          {category.options.map((option) => {
            const isActive = isOptionSelected(category.key, option.value);
            return (
              <button
                key={option.value}
                type='button'
                onClick={() =>
                  !isActive && handleOptionSelect(category.key, option.value)
                }
                aria-pressed={isActive}
                className={`${CHIP_BASE} ${isActive ? CHIP_ACTIVE : CHIP_IDLE}`}
              >
                {option.label}
              </button>
            );
          })}
        </FilterRow>
      ))}
    </div>
  );
};

export default MultiLevelSelector;

