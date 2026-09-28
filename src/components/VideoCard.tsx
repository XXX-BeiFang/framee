/* eslint-disable @typescript-eslint/no-explicit-any */

import { Heart, PlayCircleIcon, Star, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  deleteFavorite,
  deletePlayRecord,
  generateStorageKey,
  isFavorited,
  saveFavorite,
  subscribeToDataUpdates,
} from '@/lib/db.client';
import { SearchResult } from '@/lib/types';
import { formatRating, processImageUrl } from '@/lib/utils';

import { ImagePlaceholder } from '@/components/ImagePlaceholder';

interface VideoCardProps {
  id?: string;
  source?: string;
  title?: string;
  query?: string;
  poster?: string;
  episodes?: number;
  source_name?: string;
  progress?: number;
  year?: string;
  from: 'playrecord' | 'favorite' | 'search' | 'douban' | 'recommendation';
  currentEpisode?: number;
  douban_id?: number;
  onDelete?: () => void;
  onNavigate?: () => void; // 添加 onNavigate 回调
  rate?: string;
  items?: SearchResult[];
  /** 内容类型：movie / tv / show / anime（决定第二行的分类标签） */
  type?: string;
  isBangumi?: boolean;
}

export default function VideoCard({
  id,
  title = '',
  query = '',
  poster = '',
  episodes,
  source,
  source_name,
  progress = 0,
  year,
  from,
  currentEpisode,
  douban_id,
  onDelete,
  onNavigate, // 接收 onNavigate
  rate,
  items,
  type = '',
  isBangumi = false,
}: VideoCardProps) {
  const isValidArabicYear = (year: string | undefined) => {
    if (!year) return false;
    return /^\d+$/.test(year);
  };

  const router = useRouter();
  const [favorited, setFavorited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const userAgent = navigator.userAgent;
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isTabletDevice = (/(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|((macintosh.*(?!mobile).*safari.*(?!iphone|ipod))))/i.test(userAgent)) && hasTouch;
    setIsTablet(isTabletDevice);
  }, []);

  const isAggregate = from === 'search' && !!items?.length;

  const aggregateData = useMemo(() => {
    if (!isAggregate || !items) return null;
    const countMap = new Map<number, number>();
    const episodeCountMap = new Map<number, number>();
    items.forEach((item) => {
      if (item.douban_id && item.douban_id !== 0) {
        countMap.set(item.douban_id, (countMap.get(item.douban_id) || 0) + 1);
      }
      const len = item.episodes?.length || 0;
      if (len > 0) {
        episodeCountMap.set(len, (episodeCountMap.get(len) || 0) + 1);
      }
    });

    const getMostFrequent = (map: Map<number, number>) => {
      let maxCount = 0;
      let result: number | undefined;
      map.forEach((cnt, key) => {
        if (cnt > maxCount) {
          maxCount = cnt;
          result = key;
        }
      });
      return result;
    };

    return {
      first: items[0],
      mostFrequentDoubanId: getMostFrequent(countMap),
      mostFrequentEpisodes: getMostFrequent(episodeCountMap) || 0,
    };
  }, [isAggregate, items]);

  const actualTitle = aggregateData?.first.title ?? title;
  const actualPoster = aggregateData?.first.poster ?? poster;
  const actualSource = aggregateData?.first.source ?? source;
  const actualId = aggregateData?.first.id ?? id;
  const actualDoubanId = aggregateData?.mostFrequentDoubanId ?? douban_id;
  const actualEpisodes = aggregateData?.mostFrequentEpisodes ?? episodes;
  const actualYear = aggregateData?.first.year ?? year;
  const actualQuery = query || '';
  const actualSearchType = isAggregate
    ? aggregateData?.first.episodes?.length === 1
      ? 'movie'
      : 'tv'
    : type;

  // 获取收藏状态
  useEffect(() => {
    if (from === 'douban' || !actualSource || !actualId) return;

    const fetchFavoriteStatus = async () => {
      try {
        const fav = await isFavorited(actualSource, actualId);
        setFavorited(fav);
      } catch (err) {
        throw new Error('检查收藏状态失败');
      }
    };

    fetchFavoriteStatus();

    // 监听收藏状态更新事件
    const storageKey = generateStorageKey(actualSource, actualId);
    const unsubscribe = subscribeToDataUpdates(
      'favoritesUpdated',
      (newFavorites: Record<string, any>) => {
        // 检查当前项目是否在新的收藏列表中
        const isNowFavorited = !!newFavorites[storageKey];
        setFavorited(isNowFavorited);
      }
    );

    return unsubscribe;
  }, [from, actualSource, actualId]);

  const handleToggleFavorite = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (from === 'douban' || !actualSource || !actualId) return;
      try {
        if (favorited) {
          // 如果已收藏，删除收藏
          await deleteFavorite(actualSource, actualId);
          setFavorited(false);
        } else {
          // 如果未收藏，添加收藏
          await saveFavorite(actualSource, actualId, {
            title: actualTitle,
            source_name: source_name || '',
            year: actualYear || '',
            cover: actualPoster,
            total_episodes: actualEpisodes ?? 1,
            save_time: Date.now(),
          });
          setFavorited(true);
        }
      } catch (err) {
        throw new Error('切换收藏状态失败');
      }
    },
    [
      from,
      actualSource,
      actualId,
      actualTitle,
      source_name,
      actualYear,
      actualPoster,
      actualEpisodes,
      favorited,
    ]
  );

  const handleDeleteRecord = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (from !== 'playrecord' || !actualSource || !actualId) return;
      try {
        await deletePlayRecord(actualSource, actualId);
        onDelete?.();
      } catch (err) {
        throw new Error('删除播放记录失败');
      }
    },
    [from, actualSource, actualId, onDelete]
  );

  const handleClick = useCallback(() => {
    // 在导航前调用回调
    onNavigate?.();

    // “继续观看”卡片直接播放
    if (from === 'playrecord') {
      if (actualSource && actualId) {
        router.push(
          `/play?source=${actualSource}&id=${actualId}&title=${encodeURIComponent(
            actualTitle
          )}`
        );
      }
      return;
    }

    // 其他所有卡片都跳转到新的详情页
    const detailParams = new URLSearchParams();

    if (from === 'douban') {
      // 豆瓣卡片，传递 title 和 year 等信息
      detailParams.set('title', actualTitle.trim());
      if (actualYear) {
        detailParams.set('year', actualYear);
      }
      if (actualSearchType) {
        detailParams.set('stype', actualSearchType);
      }
      if (actualPoster) {
        detailParams.set('poster', actualPoster);
      }
    } else {
      // For 'favorite' and 'search' cards
      if (from === 'favorite') {
        if (source_name !== '收藏') {
          const playParams = new URLSearchParams();
          if (actualSource) {
            playParams.set('source', actualSource);
          }
          if (actualId) {
            playParams.set('id', actualId);
          }
          playParams.set('title', actualTitle);
          if (actualYear) {
            playParams.set('year', actualYear);
          }
          router.push(`/play?${playParams.toString()}`);
          return;
        }
        // For all favorites, only send title, year, poster, and stype.
        detailParams.set('title', actualTitle.trim());
        if (actualYear) {
          detailParams.set('year', actualYear);
        }
        if (episodes) {
          detailParams.set('stype', episodes > 1 ? 'tv' : 'movie');
        } else {
          detailParams.set('stype', 'movie'); // Default to movie if no episode info
        }
        if (actualPoster) {
          detailParams.set('poster', actualPoster);
        }
      } else {
        // Original logic for search results (and other non-favorite cards)
        if (actualSource && !isAggregate) {
          detailParams.set('source', actualSource);
        }
        if (actualId) {
          detailParams.set('id', actualId);
        }
        detailParams.set('title', actualTitle);
        if (actualYear) {
          detailParams.set('year', actualYear);
        }
        if (isAggregate) {
          detailParams.set('prefer', 'true');
        }
        if (actualQuery) {
          detailParams.set('stitle', actualQuery.trim());
        }
        // Ensure stype is set for others
        if (episodes) {
          detailParams.set('stype', episodes > 1 ? 'tv' : 'movie');
        } else if (actualSearchType) {
          detailParams.set('stype', actualSearchType);
        }
        if (actualPoster) {
          detailParams.set('poster', actualPoster);
        }
      }
    }

    if (actualDoubanId) {
      detailParams.set('doubanId', actualDoubanId.toString());
    }
    if (rate) {
      detailParams.set('rate', rate);
    }
    router.push(`/detail?${detailParams.toString()}`);
  }, [
    from,
    actualSource,
    actualId,
    router,
    actualTitle,
    actualYear,
    isAggregate,
    actualQuery,
    actualSearchType,
    onNavigate, // 添加依赖
  ]);

  const config = useMemo(() => {
    const configs = {
      playrecord: {
        showSourceName: false,
        showProgress: true,
        showPlayButton: true,
        showHeart: false,
        showCheckCircle: true,
        
        showRating: false,
      },
      favorite: {
        showSourceName: true,
        showProgress: false,
        showPlayButton: true,
        showHeart: false,
        showCheckCircle: true,
        
        showRating: false,
      },
      search: {
        showSourceName: true,
        showProgress: false,
        showPlayButton: true,
        showHeart: !isAggregate,
        showCheckCircle: false,
        
        showRating: false,
      },
      douban: {
        showSourceName: false,
        showProgress: false,
        showPlayButton: true,
        showHeart: false,
        showCheckCircle: false,
        
        showRating: !!rate,
      },
      recommendation: {
        showSourceName: false,
        showProgress: false,
        showPlayButton: false,
        showHeart: false,
        showCheckCircle: false,
        
        showRating: !!rate,
      },
    };
    return configs[from] || configs.search;
  }, [from, isAggregate, actualDoubanId, rate, isTablet]);

  // 评分统一格式化为一位小数（"7" -> "7.0"）
  const formattedRate = useMemo(() => formatRating(rate), [rate]);

  // 低分（< 6.0）星标降级为中性灰，避免高分色滥用于烂片
  const numericRate = useMemo(() => {
    if (!formattedRate) return null;
    const n = parseFloat(formattedRate);
    return Number.isNaN(n) ? null : n;
  }, [formattedRate]);
  const isLowRated = numericRate !== null && numericRate < 6.0;

  // 副标题：年份 · 分类。分类需覆盖 movie / tv / show / anime 四种内容类型，
  // 严禁把综艺（show）误标为「剧集」；年份缺失时保留分类兜底，保证第二行不丢失。
  const secondaryLine = useMemo(() => {
    const parts: string[] = [];
    if (actualYear && isValidArabicYear(actualYear)) parts.push(actualYear);

    let label = '';
    switch (actualSearchType) {
      case 'movie':
        label = '电影';
        break;
      case 'tv':
        label = '剧集';
        break;
      case 'show':
        label = '综艺';
        break;
      case 'anime':
        label = '动漫';
        break;
      default:
        label = isBangumi ? '动漫' : '';
    }
    if (!label && isBangumi) label = '动漫';
    if (label) parts.push(label);

    return parts.join(' · ');
  }, [actualYear, actualSearchType, isBangumi]);

  return (
    <div
      className='group relative w-full cursor-pointer transition-all duration-300 ease-out
        rounded-xl hover:scale-[1.05] hover:z-[500]
        hover:shadow-glow-gold hover:ring-1 hover:ring-gold/40'
      onClick={handleClick}
    >
      {/* 海报容器：统一 1px 半透明白描边 + 内阴影，
          让《霸王别姬》《阿甘正传》这类大面积白底海报自然沉入暗色背景 */}
      <div className='relative aspect-[2/3] w-full overflow-hidden rounded-xl border border-white/10 bg-obsidian-600 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.35),inset_0_0_24px_rgba(0,0,0,0.55)]'>
        {/* 骨架屏：绝对定位，避免参与容器高度计算造成海报被拉长 */}
        {!isLoading && <ImagePlaceholder aspectRatio='absolute inset-0' />}
        {/* 白底海报融合层：极淡的暗角压住高亮边缘 */}
        <div className='pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black/35 via-transparent to-black/15 mix-blend-multiply' />
        {/* 图片 */}
        <Image
          src={processImageUrl(actualPoster)}
          alt={actualTitle}
          fill
          className='object-cover'
          referrerPolicy='no-referrer'
          loading='lazy'
          onLoadingComplete={() => setIsLoading(true)}
          onError={(e) => {
            // 图片加载失败时的重试机制
            const img = e.target as HTMLImageElement;
            if (!img.dataset.retried) {
              img.dataset.retried = 'true';
              setTimeout(() => {
                img.src = processImageUrl(actualPoster);
              }, 2000);
            }
          }}
        />

        {/* 悬浮遮罩 */}
        <div className='absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100' />

        {/* 播放按钮 */}
        {config.showPlayButton && !isTablet && (
          <div className='absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-300 ease-in-out delay-75 group-hover:opacity-100 group-hover:scale-100'>
            <PlayCircleIcon
              size={50}
              strokeWidth={0.8}
              className='text-white fill-transparent transition-all duration-300 ease-out hover:fill-gold hover:text-gold hover:scale-[1.1] hidden sm:block'
              onClick={(e) => {
                e.stopPropagation(); // Prevent card click
                onNavigate?.(); // Call onNavigate before navigating to /play

                if (from === 'favorite') {
                  if (source_name === '收藏') { // 新增条件
                    // 如果是自定义收藏，始终跳转到详情页
                    handleClick();
                  } else {
                    // 如果是真实收藏，播放按钮跳转到 /play
                    const playParams = new URLSearchParams();
                    if (actualSource) {
                      playParams.set('source', actualSource);
                    }
                    if (actualId) {
                      playParams.set('id', actualId);
                    }
                    playParams.set('title', actualTitle);
                    if (actualYear) {
                      playParams.set('year', actualYear);
                    }
                    router.push(`/play?${playParams.toString()}`);
                  }
                } else {
                  // 非收藏卡片的原始逻辑（例如，播放记录）
                  const playParams = new URLSearchParams();
                  if (actualSource && !(from === 'search' && isAggregate)) {
                    playParams.set('source', actualSource);
                  }
                  if (actualId) {
                    playParams.set('id', actualId);
                  }
                  playParams.set('title', actualTitle);
                  if (actualYear) {
                    playParams.set('year', actualYear);
                  }
                  router.push(`/play?${playParams.toString()}`);
                }
              }}
            />
          </div>
        )}

        {/* 操作按钮 */}
        {(config.showHeart || config.showCheckCircle) && (
          <div className='absolute bottom-3 right-3 flex gap-3 opacity-0 translate-y-2 transition-all duration-300 ease-in-out group-hover:opacity-100 group-hover:translate-y-0'>
            {config.showHeart && (
              <Heart
                onClick={handleToggleFavorite}
                size={20}
                className={`transition-all duration-300 ease-out ${
                  favorited
                    ? 'fill-red-600 stroke-red-600'
                    : 'fill-transparent stroke-white hover:stroke-red-400'
                } hover:scale-[1.1]`}
              />
            )}
            {config.showCheckCircle && (
              <Trash2
                onClick={from === 'favorite' ? handleToggleFavorite : handleDeleteRecord}
                size={20}
                className='text-white transition-all duration-300 ease-out hover:stroke-red-500 hover:scale-[1.1]'
              />
            )}
          </div>
        )}

        {/* 评分角标：统一 top-2.5 right-2.5 / 半透明黑底毛玻璃胶囊；
            低于 6.0 时星标降级为中性灰，不再使用高饱和亮黄 */}
        {config.showRating && formattedRate && (
          <div className='absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-[3px] backdrop-blur-md transition-all duration-300 ease-out group-hover:scale-110'>
            <Star
              className={`h-3 w-3 ${
                isLowRated
                  ? 'fill-slate-400 text-slate-400'
                  : 'fill-gold text-gold'
              }`}
            />
            <span className='text-[12px] font-semibold leading-none text-white'>
              {formattedRate}
            </span>
          </div>
        )}

        {/* 集数角标：左上角，避免与评分角标重叠 */}
        {actualEpisodes && actualEpisodes > 1 && (
          <div className='absolute top-2.5 left-2.5 rounded-full border border-white/20 bg-black/60 px-2 py-[3px] text-[11px] font-semibold text-white backdrop-blur-md transition-all duration-300 ease-out group-hover:scale-110'>
            {currentEpisode
              ? `${currentEpisode}/${actualEpisodes}`
              : `${actualEpisodes} 集`}
          </div>
        )}
      </div>

      {/* 进度条 */}
      {config.showProgress && progress !== undefined && (
        <div className='mt-2 h-1 w-full bg-white/12 rounded-full overflow-hidden'>
          <div
            className='h-full bg-gold rounded-full transition-all duration-500 ease-out'
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* 文本信息排版：严格两行
          第一行 = 片名（text-sm font-semibold text-white truncate）
          第二行 = 年份 · 类型/地区（text-xs text-slate-400） */}
      <div className='mt-2.5 text-center px-0.5'>
        <div className='relative'>
          <span className='peer block truncate text-sm font-semibold leading-snug text-white transition-colors duration-200 ease-out group-hover:text-gold'>
            {actualTitle}
          </span>
          {secondaryLine && (
            <span className='mt-0.5 block w-full truncate text-xs leading-snug text-slate-400'>
              {secondaryLine}
            </span>
          )}
          {/* 自定义 tooltip */}
          <div className='pointer-events-none invisible absolute bottom-full left-1/2 mb-2 -translate-x-1/2 transform whitespace-nowrap rounded-lg px-3 py-1 text-xs text-ink opacity-0 shadow-lg transition-all duration-200 ease-out delay-100 glass-strong peer-hover:visible peer-hover:opacity-100'>
            {actualTitle}
          </div>
        </div>
        {config.showSourceName && source_name && source_name !== '收藏' && (
          <span className='mt-1 block'>
            <span className='inline-block rounded-md px-2 py-0.5 text-[11px] font-medium text-ink-muted transition-all duration-300 ease-out glass-subtle group-hover:text-ink-secondary'>
              {source_name}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
