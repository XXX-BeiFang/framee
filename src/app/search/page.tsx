/* eslint-disable react-hooks/exhaustive-deps, @typescript/eslint-no-explicit-any */
'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { ChevronUp, Search, X, Trash2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  addSearchHistory,
  clearSearchHistory,
  deleteSearchHistory,
  getSearchHistory,
  subscribeToDataUpdates,
} from '@/lib/db.client';
import { DoubanItem, SearchResult } from '@/lib/types';
import { getDoubanCategories } from '@/lib/douban.client';
import { formatRating } from '@/lib/utils';

import MediaRow from '@/components/MediaRow';
import PageLayout from '@/components/PageLayout';
import SearchSuggestions from '@/components/SearchSuggestions';
import SectionHeader from '@/components/SectionHeader';
import VideoCard from '@/components/VideoCard';
import VideoCardSkeleton from '@/components/VideoCardSkeleton';
import { SearchShortcutHint } from '@/components/SearchShortcut';

/**
 * 热门搜索词兜底列表。
 *
 * 当 `/api/recommendations` 不可用（网络受限 / 接口异常）时，
 * 仍然渲染一批高热度的影视关键词胶囊，避免出现「暂无推荐」的空窗。
 * 每次从列表中随机抽取若干条，保证多次访问时的呈现有新鲜感。
 */
const FALLBACK_HOT_KEYWORDS: string[] = [
  '肖申克的救赎',
  '霸王别姬',
  '阿甘正传',
  '泰坦尼克号',
  '盗梦空间',
  '星际穿越',
  '楚门的世界',
  '千与千寻',
  '让子弹飞',
  '流浪地球',
  '疯狂的石头',
  '无间道',
  '权力的游戏',
  '甄嬛传',
  '亮剑',
  '老友记',
  '怪奇物语',
  '狂飙',
  '漫长的季节',
  '庆余年',
];

/** 从兜底词库中随机抽取 n 条（去重）。 */
const pickFallbackKeywords = (n = 12): string[] => {
  const pool = [...FALLBACK_HOT_KEYWORDS];
  const picked: string[] = [];
  while (picked.length < n && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
};

const SearchPageClient: React.FC = () => {
  // 搜索历史
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  // 返回顶部按钮显示状态
  const [showBackToTop, setShowBackToTop] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false); // 新增：追踪流状态
  const [showResults, setShowResults] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  // 热门搜索词：只需要 id / title 两个字段用于渲染胶囊
  const [recommendedSearches, setRecommendedSearches] = useState<
    Array<{ id: string; title: string }>
  >([]);
  const [isRecommendationsLoading, setIsRecommendationsLoading] = useState(true);
  // 实时热播榜（空状态填充）
  const [hotList, setHotList] = useState<DoubanItem[]>([]);
  const [isHotListLoading, setIsHotListLoading] = useState(true);
  
  // 聚合后的结果（按标题和年份分组）
  const aggregatedResults = useMemo(() => {
    const map = new Map<string, SearchResult[]>();
    searchResults.forEach((item) => {
      // 使用 title + year 作为键进行聚合，year 必然存在，但依然兜底 'unknown'
      const key = `${item.title.replaceAll(' ', '')}-${
        item.year || 'unknown'
      }`;
      const arr = map.get(key) || [];
      arr.push(item);
      map.set(key, arr);
    });
    return Array.from(map.entries()).sort((a, b) => {
      const normalizedSearchQuery = searchQuery.trim().replaceAll(' ', '');
      const aTitleNormalized = a[1][0].title.replaceAll(' ', '');
      const bTitleNormalized = b[1][0].title.replaceAll(' ', '');

      // 新增首要排序：标题与搜索词完全一致的排在最前面
      const aPerfectMatch = aTitleNormalized === normalizedSearchQuery;
      const bPerfectMatch = bTitleNormalized === normalizedSearchQuery;

      if (aPerfectMatch && !bPerfectMatch) return -1;
      if (!aPerfectMatch && bPerfectMatch) return 1;

      // 次要排序：标题包含搜索词
      const aContainsMatch = aTitleNormalized.includes(normalizedSearchQuery);
      const bContainsMatch = bTitleNormalized.includes(normalizedSearchQuery);

      if (aContainsMatch && !bContainsMatch) return -1;
      if (!aContainsMatch && bContainsMatch) return 1;

      // 年份排序
      if (a[1][0].year === b[1][0].year) {
        return a[0].localeCompare(b[0]);
      } else {
        // 处理 unknown 的情况
        const aYear = a[1][0].year;
        const bYear = b[1][0].year;

        if (aYear === 'unknown' && bYear === 'unknown') {
          return 0;
        } else if (aYear === 'unknown') {
          return 1; // a 排在后面
        } else if (bYear === 'unknown') {
          return -1; // b 排在后面
        } else {
          // 都是数字年份，按数字大小排序（大的在前面）
          return aYear > bYear ? -1 : 1;
        }
      }
    });
  }, [searchResults, searchQuery]);

  useEffect(() => {
    // 初始加载搜索历史
    getSearchHistory().then(setSearchHistory);

    // 监听搜索历史更新事件
    const unsubscribe = subscribeToDataUpdates(
      'searchHistoryUpdated',
      (newHistory: string[]) => {
        setSearchHistory(newHistory);
      }
    );

    // 获取滚动位置的函数 - 专门针对 body 滚动
    const getScrollTop = () => {
      return document.body.scrollTop || 0;
    };

    // 使用 requestAnimationFrame 持续检测滚动位置
    let isRunning = false;
    const checkScrollPosition = () => {
      if (!isRunning) return;

      const scrollTop = getScrollTop();
      const shouldShow = scrollTop > 300;
      setShowBackToTop(shouldShow);

      requestAnimationFrame(checkScrollPosition);
    };

    // 启动持续检测
    isRunning = true;
    checkScrollPosition();

    // 监听 body 元素的滚动事件
    const handleScroll = () => {
      const scrollTop = getScrollTop();
      setShowBackToTop(scrollTop > 300);
    };

    document.body.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      unsubscribe();
      isRunning = false; // 停止 requestAnimationFrame 循环

      // 移除 body 滚动事件监听器
      document.body.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    // 获取推荐；接口异常或返回为空时，回退到本地热门关键词兜底
    const fetchRecommended = async () => {
      try {
        const response = await fetch('/api/recommendations');
        const data = response.ok ? await response.json() : { list: [] };
        const list: string[] = Array.isArray(data.list) ? data.list : [];

        setRecommendedSearches(
          list.length > 0
            ? list.map((title: string) => ({ id: title, title }))
            : pickFallbackKeywords().map((title) => ({ id: title, title }))
        );
      } catch (error) {
        console.error('Failed to fetch recommended searches:', error);
        setRecommendedSearches(
          pickFallbackKeywords().map((title) => ({ id: title, title }))
        );
      } finally {
        setIsRecommendationsLoading(false);
      }
    };

    fetchRecommended();
  }, []);

  // 拉取实时热播榜，用于搜索空状态推荐
  useEffect(() => {
    const fetchHotList = async () => {
      try {
        const data = await getDoubanCategories({
          kind: 'movie',
          category: '热门',
          type: '全部',
        });
        if (data.code === 200) setHotList(data.list);
      } catch (error) {
        console.error('Failed to fetch hot list:', error);
      } finally {
        setIsHotListLoading(false);
      }
    };

    fetchHotList();
  }, []);

  useEffect(() => {
    // 当搜索参数变化时更新搜索状态
    const query = searchParams.get('q');
    if (query) {
      setSearchQuery(query);
      fetchSearchResults(query);
      setShowSuggestions(false);

      // 保存到搜索历史 (事件监听会自动更新界面)
      addSearchHistory(query);
    } else {
      setShowResults(false);
      setShowSuggestions(false);
    }
  }, [searchParams]);

  const fetchSearchResults = async (query: string) => {
    try {
      // 立即设置加载和显示状态，清空旧结果
      setIsLoading(true);
      setIsStreaming(true); // 开始流
      setShowResults(true);
      setSearchResults([]);

      const response = await fetch(
        `/api/searchstream?q=${encodeURIComponent(query.trim())}`
      );

      if (!response.body) {
        throw new Error('Streaming not supported');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let hasSetLoadingFalse = false; // 标记是否已关闭骨架屏

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;
          try {
            const newResultsChunk: SearchResult[] = JSON.parse(line);

            let filteredResults = newResultsChunk.filter((result) => {
              const lowerCaseQuery = query.trim().toLowerCase();
              const lowerCaseTitle = result.title.toLowerCase();
              return lowerCaseTitle.includes(lowerCaseQuery);
            });

            const filterKeywords = ['电影解说', '剧情解说', '预告片', '解说'];
            filteredResults = filteredResults.filter(
              (result) =>
                !filterKeywords.some((keyword) => result.title.includes(keyword))
            );

            if (filteredResults.length > 0) {
              // 收到第一个有效数据块后，立即关闭骨架屏
              if (!hasSetLoadingFalse) {
                setIsLoading(false);
                hasSetLoadingFalse = true;
              }

              setSearchResults((prevResults) => {
                const allResults = [...prevResults, ...filteredResults];
                return allResults.sort((a, b) => {
                  const aExactMatch = a.title === query.trim();
                  const bExactMatch = b.title === query.trim();
                  if (aExactMatch && !bExactMatch) return -1;
                  if (!aExactMatch && bExactMatch) return 1;

                  if (a.year === b.year) {
                    return a.title.localeCompare(b.title);
                  } else {
                    if (a.year === 'unknown') return 1;
                    if (b.year === 'unknown') return -1;
                    return parseInt(b.year) - parseInt(a.year);
                  }
                });
              });
            }
          } catch (e) {
            console.error('Error parsing streaming JSON', e);
          }
        }
      }
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      // 确保在流程最后（如无结果时）骨架屏和流状态也能被关闭
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  // 输入框内容变化时触发，显示搜索建议
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (value.trim()) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  // 搜索框聚焦时触发，显示搜索建议
  const handleInputFocus = () => {
    if (searchQuery.trim()) {
      setShowSuggestions(true);
    }
  };

  // 搜索表单提交时触发，处理搜索逻辑
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim().replace(/\s+/g, ' ');
    if (!trimmed) return;

    // 回显搜索框
    setSearchQuery(trimmed);
    setIsLoading(true);
    setShowResults(true);
    setShowSuggestions(false);

    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    // 直接发请求
    fetchSearchResults(trimmed);

    // 保存到搜索历史 (事件监听会自动更新界面)
    addSearchHistory(trimmed);
  };

  const handleSuggestionSelect = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);

    // 自动执行搜索
    setIsLoading(true);
    setShowResults(true);

    router.push(`/search?q=${encodeURIComponent(suggestion)}`);
    fetchSearchResults(suggestion);
    addSearchHistory(suggestion);
  };

  // 返回顶部功能
  const scrollToTop = () => {
    try {
      // 根据调试结果，真正的滚动容器是 document.body
      document.body.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } catch (error) {
      // 如果平滑滚动完全失败，使用立即滚动
      document.body.scrollTop = 0;
    }
  };

  return (
    <PageLayout activePath="/search">
      <div className="px-4 sm:px-10 py-4 sm:py-8 pt-5 md:pt-[4.5rem] overflow-visible mb-10">
        {/* 搜索框 */}
        <div className="mb-8">
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted z-10" />
              <input
                id="searchInput"
                type="text"
                value={searchQuery}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                placeholder="剧荒别犯难，好剧搜出来～"
                className="w-full h-12 rounded-full glass-subtle py-3 pl-10 pr-4 sm:pr-24 text-sm text-ink placeholder-ink-muted focus:outline-none focus:ring-2 focus:ring-gold/60 focus:bg-white/10 shadow-sm"
              />

              {/* 快捷键提示 */}
              <SearchShortcutHint className="absolute right-3 top-1/2 -translate-y-1/2 z-10" />

              {/* 搜索建议 */}
              <SearchSuggestions
                query={searchQuery}
                isVisible={showSuggestions}
                onSelect={handleSuggestionSelect}
                onClose={() => setShowSuggestions(false)}
              />
            </div>
          </form>
        </div>

        {/* 搜索结果或搜索历史 */}
        <div className="max-w-[96%] mx-auto mt-12 overflow-visible">
          {searchParams.get('q') ? (
            <section className="mb-12">
              {/* 标题 + 统计 + 加载圈 */}
              <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-ink">
                    搜索结果
                  </h2>
                  {isStreaming && !isLoading && (
                    <div
                      className="w-5 h-5 border-2 border-white/15 border-t-gold rounded-full animate-spin"
                      role="status"
                    >
                      <span className="sr-only">加载中...</span>
                    </div>
                  )}
                </div>

              </div>
              {isLoading ? (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5 xl:grid-cols-5 xl:gap-6 2xl:grid-cols-6">
                  {Array.from({ length: 12 }).map((_, index) => (
                    <VideoCardSkeleton 
                      key={index} 
                      className="w-full"
                      showYear={true}
                    />
                  ))}
                </div>
              ) : (
                <div
                  key="search-results-aggregated"
                  className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5 xl:grid-cols-5 xl:gap-6 2xl:grid-cols-6"
                >
                  {aggregatedResults.map(([mapKey, group]) => {
                        return (
                          <div key={`agg-${mapKey}`} className="w-full">
                            <VideoCard
                              from="search"
                              items={group}
                              query={
                                searchQuery.trim() !== group[0].title
                                  ? searchQuery.trim()
                                  : ''
                              }
                            />
                          </div>
                        );
                      })}
                  {searchResults.length === 0 && !isStreaming && (
                    <div className="col-span-full text-center text-ink-muted py-8">
                      未找到相关结果
                    </div>
                  )}
                </div>
              )}
            </section>
          ) : (
            <>
              {/* 实时热播榜：单行海报推荐，填补空状态留白 */}
              <section className='mb-12'>
                <SectionHeader title='实时热播榜' href='/douban?type=movie' />
                <MediaRow>
                  {isHotListLoading
                    ? Array.from({ length: 6 }).map((_, index) => (
                        <VideoCardSkeleton key={index} showYear />
                      ))
                    : hotList.map((item, index) => (
                        <VideoCard
                          key={`${item.id}-${index}`}
                          from='douban'
                          title={item.title}
                          poster={item.poster}
                          douban_id={Number(item.id)}
                          rate={formatRating(item.rate)}
                          year={item.year}
                          type='movie'
                        />
                      ))}
                </MediaRow>
              </section>

              {searchHistory.length > 0 && (
                <section className="mb-12">
                  <h2 className="mb-4 text-xl font-bold text-ink text-left flex items-center"> {/* Added flex items-center */}
                    搜索历史
                    {searchHistory.length > 0 && (
                      <button
                        onClick={() => {
                          clearSearchHistory(); // 事件监听会自动更新界面
                        }}
                        className="ml-3" // Keep margin
                      >
                        <Trash2
                          size={20}
                          className='text-gray-500 dark:text-gray-400 transition-all duration-300 ease-out hover:stroke-red-500 hover:scale-[1.1]'
                        />
                      </button>
                    )}
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {searchHistory.map((item) => (
                      <div key={item} className="relative group">
                        <button
                          onClick={() => {
                            setSearchQuery(item);
                            router.push(
                              `/search?q=${encodeURIComponent(item.trim())}`
                            );
                          }}
                          className="px-3.5 py-1.5 rounded-full glass-subtle text-[13px] text-ink-secondary hover:text-black hover:bg-gold hover:border-gold transition-all duration-200"
                        >
                          {item}
                        </button>
                        {/* 删除按钮 */}
                        <button
                          aria-label="删除搜索历史"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            deleteSearchHistory(item); // 事件监听会自动更新界面
                          }}
                          className="absolute -top-1 -right-1 w-4 h-4 opacity-0 group-hover:opacity-100 bg-obsidian-500 hover:bg-crimson text-white rounded-full flex items-center justify-center text-[10px] transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {/* 热门搜索词：紧凑圆角微透胶囊。
                  永远渲染一批热门关键词，不再出现「暂无推荐」空窗 */}
              <section className='mb-12'>
                <SectionHeader title='热门搜索' />
                {isRecommendationsLoading ? (
                  <div className='flex flex-wrap gap-2'>
                    {[...Array(8)].map((_, index) => (
                      <div
                        key={index}
                        className='h-8 w-20 rounded-full bg-white/[0.06] animate-pulse'
                      />
                    ))}
                  </div>
                ) : (
                  <div className='flex flex-wrap gap-2'>
                    {(recommendedSearches.length > 0
                      ? recommendedSearches
                      : pickFallbackKeywords().map((title) => ({
                          id: title,
                          title,
                        }))
                    ).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setSearchQuery(item.title);
                          router.push(
                            `/search?q=${encodeURIComponent(item.title.trim())}`
                          );
                        }}
                        className='px-3.5 py-1.5 rounded-full glass-subtle text-[13px] text-ink-secondary
                          hover:text-black hover:bg-gold hover:border-gold transition-all duration-200'
                      >
                        {item.title}
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        {/* 返回顶部悬浮按钮：黑色毛玻璃吸底右下角 */}
        <button
          onClick={scrollToTop}
          className={`fixed bottom-20 md:bottom-6 right-6 z-[500] w-12 h-12 rounded-full
            bg-black/60 backdrop-blur-md border border-white/10 text-ink shadow-lg
            hover:bg-gold hover:text-black hover:border-gold transition-all duration-300 ease-in-out
            flex items-center justify-center group ${
              showBackToTop
                ? 'opacity-100 translate-y-0 pointer-events-auto'
                : 'opacity-0 translate-y-4 pointer-events-none'
            }`}
          aria-label="返回顶部"
        >
          <ChevronUp className="w-5 h-5 transition-transform group-hover:scale-110" />
        </button>
      </div>
    </PageLayout>
  );
};

const SearchPage: React.FC = () => {
  return (
    <Suspense>
      <SearchPageClient />
    </Suspense>
  );
};

export default SearchPage;
