/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, no-console */

'use client';

import { Heart, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';

import ConfirmationDialog from '@/components/ConfirmationDialog';

import {
  BangumiCalendarData,
  GetBangumiCalendarData,
} from '@/lib/bangumi.client';
import { clearScrollCache } from '@/lib/scrollCache'; // 导入 clearScrollCache
import { useHomepageScrollRestoration } from '@/lib/useHomepageScrollRestoration';
// 客户端收藏 API
import {
  clearAllFavorites,
  getAllFavorites,
  getAllPlayRecords,
  subscribeToDataUpdates,
} from '@/lib/db.client';
import { getDoubanCategories, getDoubanList } from '@/lib/douban.client';
import { DoubanItem } from '@/lib/types';
import {
  formatRating,
  parseCardSubtitle,
  upgradePosterResolution,
} from '@/lib/utils';

import HeroBanner, { HeroItem } from '@/components/HeroBanner';
import MediaRow from '@/components/MediaRow';
import PageLayout from '@/components/PageLayout';
import SectionHeader from '@/components/SectionHeader';
import { useSite } from '@/components/SiteProvider';
import VideoCard from '@/components/VideoCard';
import VideoCardSkeleton from '@/components/VideoCardSkeleton';

function HomeClient() {
  const { mainContainerRef } = useSite();
  const pathname = usePathname(); // Get current pathname
  const searchParams = useSearchParams();
  if (mainContainerRef) {
    useHomepageScrollRestoration(mainContainerRef);
  }
  // 首页 / 收藏 通过 ?tab=favorites 驱动，入口位于侧边栏与移动端底部导航
  const activeTab: 'home' | 'favorites' =
    searchParams.get('tab') === 'favorites' ? 'favorites' : 'home';
  const [hotMovies, setHotMovies] = useState<DoubanItem[]>([]);
  const [hotTvShows, setHotTvShows] = useState<DoubanItem[]>([]);
  const [hotVarietyShows, setHotVarietyShows] = useState<DoubanItem[]>([]);
  const [hotCustomCategory, setHotCustomCategory] = useState<DoubanItem[]>([]);
  const [bangumiCalendarData, setBangumiCalendarData] = useState<
    BangumiCalendarData[]
  >([]);
  const [loading, setLoading] = useState(true);
  const { announcement } = useSite();

  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [showClearFavConfirm, setShowClearFavConfirm] = useState(false);

  // 检查公告弹窗状态
  useEffect(() => {
    if (typeof window !== 'undefined' && announcement) {
      const hasSeenAnnouncement = localStorage.getItem('hasSeenAnnouncement');
      if (hasSeenAnnouncement !== announcement) {
        setShowAnnouncement(true);
      } else {
        setShowAnnouncement(Boolean(!hasSeenAnnouncement && announcement));
      }
    }
  }, [announcement]);

  // 当导航到首页时清除豆瓣页面的滚动缓存
  useEffect(() => {
    if (pathname === '/') {
      clearScrollCache('/douban');
    }
  }, [pathname]);

  // 收藏数据
  type FavoriteItem = {
    id: string;
    source: string;
    title: string;
    poster: string;
    episodes: number;
    source_name: string;
    currentEpisode?: number;
    search_title?: string;
    douban_id?: number; // 添加 douban_id
  };

  const [favoriteItems, setFavoriteItems] = useState<FavoriteItem[]>([]);

  useEffect(() => {
    const fetchRecommendData = async () => {
      try {
        setLoading(true);

        // 并行获取热门电影、热门剧集和热门综艺
        const [moviesData, tvShowsData, varietyShowsData, bangumiCalendarData] =
          await Promise.all([
            getDoubanCategories({
              kind: 'movie',
              category: '热门',
              type: '全部',
            }),
            getDoubanCategories({ kind: 'tv', category: 'tv', type: 'tv' }),
            getDoubanCategories({ kind: 'tv', category: 'show', type: 'show' }),
            GetBangumiCalendarData(),
          ]);

        if (moviesData.code === 200) {
          setHotMovies(moviesData.list);
        }

        if (tvShowsData.code === 200) {
          setHotTvShows(tvShowsData.list);
        }

        if (varietyShowsData.code === 200) {
          setHotVarietyShows(varietyShowsData.list);
        }
        setBangumiCalendarData(bangumiCalendarData);

        // 获取自定义分类数据：电影 - 华语
        const customCategoryData = await getDoubanList({
          tag: '华语',
          type: 'movie',
          pageLimit: 25,
          pageStart: 0,
        });
        if (customCategoryData.code === 200) {
          setHotCustomCategory(customCategoryData.list);
        }
      } catch (error) {
        console.error('获取推荐数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendData();
  }, []);

  // 处理收藏数据更新的函数
  const updateFavoriteItems = async (allFavorites: Record<string, any>) => {
    const allPlayRecords = await getAllPlayRecords();

    // 根据保存时间排序（从近到远）
    const sorted = Object.entries(allFavorites)
      .sort(([, a], [, b]) => b.save_time - a.save_time)
      .map(([key, fav]) => {
        const plusIndex = key.indexOf('+');
        const source = key.slice(0, plusIndex);
        const id = key.slice(plusIndex + 1);

        // 查找对应的播放记录，获取当前集数
        const playRecord = allPlayRecords[key];
        const currentEpisode = playRecord?.index;

        return {
          id,
          source,
          title: fav.title,
          year: fav.year,
          poster: fav.cover,
          episodes: fav.total_episodes,
          source_name: fav.source_name,
          currentEpisode,
          search_title: fav?.search_title,
          douban_id: fav.doubanId ? Number(fav.doubanId) : undefined, // 添加 douban_id
        } as FavoriteItem;
      });
    setFavoriteItems(sorted);
  };

  // 当切换到收藏时加载收藏数据
  useEffect(() => {
    if (activeTab !== 'favorites') return;

    const loadFavorites = async () => {
      const allFavorites = await getAllFavorites();
      await updateFavoriteItems(allFavorites);
    };

    loadFavorites();

    // 监听收藏更新事件
    const unsubscribe = subscribeToDataUpdates(
      'favoritesUpdated',
      (newFavorites: Record<string, any>) => {
        updateFavoriteItems(newFavorites);
      }
    );

    return unsubscribe;
  }, [activeTab]);

  const handleCloseAnnouncement = (announcement: string) => {
    setShowAnnouncement(false);
    localStorage.setItem('hasSeenAnnouncement', announcement); // 记录已查看弹窗
  };

  // Hero 巨幕：多片轮播（热门电影 / 剧集 / 综艺 前几位混合），复用已拉取的榜单，零新增请求
  const heroItems: HeroItem[] = useMemo(() => {
    const toItem = (it: DoubanItem, typeLabel: string): HeroItem => {
      // 列表接口没有剧情简介，唯一可用的「影视信息」是 card_subtitle
      // （形如 `2026 / 中国大陆 / 喜剧 / 董润年 / 张若昀 白客`）
      const { region, genres, director, cast } = parseCardSubtitle(
        it.cardSubtitle
      );
      const description = [region, genres, it.episodesInfo]
        .filter(Boolean)
        .join(' · ');
      const castLine = [
        director ? `导演 ${director}` : '',
        cast ? `主演 ${cast}` : '',
      ]
        .filter(Boolean)
        .join(' · ');

      return {
        title: it.title,
        // Hero 铺满巨幕，用 1080px 高图替代 540px 中图，避免放大发虚
        poster: upgradePosterResolution(it.poster),
        rate: formatRating(it.rate),
        year: it.year,
        id: it.id,
        typeLabel,
        description: description || undefined,
        cast: castLine || undefined,
      };
    };
    return [
      ...hotMovies.slice(0, 2).map((it) => toItem(it, '电影')),
      ...hotTvShows.slice(0, 2).map((it) => toItem(it, '剧集')),
      ...hotVarietyShows.slice(0, 1).map((it) => toItem(it, '综艺')),
    ];
  }, [hotMovies, hotTvShows, hotVarietyShows]);

  return (
    <PageLayout>
      <div className='px-0 sm:px-6 lg:px-8 py-0 sm:py-6 md:pt-[4.5rem] overflow-x-hidden'>
        <div className='max-w-[98%] xl:max-w-[96%] mx-auto'>
          {activeTab === 'favorites' ? (
            // 收藏视图
            <section className='mb-12'>
              <SectionHeader
                title='收藏列表'
                action={
                  favoriteItems.length > 0 ? (
                    <button
                      onClick={() => setShowClearFavConfirm(true)}
                      aria-label='清空收藏'
                      title='清空全部收藏'
                    >
                      <Trash2
                        size={18}
                        className='text-ink-muted transition-all duration-300 ease-out hover:stroke-crimson hover:scale-[1.1]'
                      />
                    </button>
                  ) : undefined
                }
              />
              {loading ? (
                <MediaRow>
                  {Array.from({ length: 6 }).map((_, index) => (
                    <VideoCardSkeleton key={index} showYear={false} />
                  ))}
                </MediaRow>
              ) : favoriteItems.length > 0 ? (
                <MediaRow>
                  {favoriteItems.map((item) => (
                    <VideoCard
                      key={item.id + item.source}
                      query={item.search_title}
                      {...item}
                      from='favorite'
                      type={item.episodes > 1 ? 'tv' : ''}
                    />
                  ))}
                </MediaRow>
              ) : (
                /* 收藏空状态：居中毛玻璃卡片 + 占位图标 + 行动按钮 */
                <div className='flex items-center justify-center py-10'>
                  <div className='glass-strong flex w-full max-w-md flex-col items-center rounded-2xl border border-white/10 px-8 py-12 text-center shadow-xl'>
                    <div className='mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white/5 text-ink-muted ring-1 ring-white/10'>
                      <Heart className='h-7 w-7' strokeWidth={1.6} />
                    </div>
                    <p className='text-base font-semibold text-ink'>
                      暂无收藏片源
                    </p>
                    <p className='mt-1.5 text-[13px] leading-relaxed text-ink-muted'>
                      点击海报上的收藏按钮，把喜欢的影片收进这里
                    </p>
                    <Link
                      href='/'
                      onClick={() =>
                        window.dispatchEvent(
                          new CustomEvent('clearHomepageScroll')
                        )
                      }
                      className='mt-6 inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-[13px] font-semibold text-black shadow-glow-gold transition-all duration-200 hover:bg-gold-400 hover:shadow-glow-gold-strong hover:scale-[1.03] active:scale-[0.98]'
                    >
                      去首页探索
                    </Link>
                  </div>
                </div>
              )}
            </section>
          ) : (
            // 首页视图
            <>
              {/* Hero 巨幕 Banner — 首屏视觉重心 */}
              <HeroBanner items={heroItems} loading={loading} />

              {/* 热门电影 */}
              <section className='mb-12'>
                <SectionHeader title='热门电影' href='/douban?type=movie' />
                <MediaRow showArrows={false}>
                  {loading
                    ? Array.from({ length: 6 }).map((_, index) => (
                        <VideoCardSkeleton key={index} showYear />
                      ))
                    : hotMovies.map((movie, index) => (
                        <VideoCard
                          key={index}
                          from='douban'
                          title={movie.title}
                          poster={movie.poster}
                          douban_id={Number(movie.id)}
                          rate={movie.rate}
                          year={movie.year}
                          type='movie'
                        />
                      ))}
                </MediaRow>
              </section>

              {/* 热门剧集 */}
              <section className='mb-12'>
                <SectionHeader title='热门剧集' href='/douban?type=tv' />
                <MediaRow showArrows={false}>
                  {loading
                    ? Array.from({ length: 6 }).map((_, index) => (
                        <VideoCardSkeleton key={index} showYear />
                      ))
                    : hotTvShows.map((show, index) => (
                        <VideoCard
                          key={index}
                          from='douban'
                          title={show.title}
                          poster={show.poster}
                          douban_id={Number(show.id)}
                          rate={show.rate}
                          year={show.year}
                          type='tv'
                        />
                      ))}
                </MediaRow>
              </section>

              {/* 每日新番放送 */}
              <section className='mb-12'>
                <SectionHeader title='热门动漫' href='/douban?type=anime' />
                <MediaRow showArrows={false}>
                  {loading
                    ? Array.from({ length: 6 }).map((_, index) => (
                        <VideoCardSkeleton key={index} showYear />
                      ))
                    : (() => {
                        // 获取当前日期对应的星期
                        const today = new Date();
                        const weekdays = [
                          'Sun',
                          'Mon',
                          'Tue',
                          'Wed',
                          'Thu',
                          'Fri',
                          'Sat',
                        ];
                        const currentWeekday = weekdays[today.getDay()];

                        // 找到当前星期对应的番剧数据
                        const todayAnimes =
                          bangumiCalendarData.find(
                            (item) => item.weekday.en === currentWeekday
                          )?.items || [];

                        return todayAnimes.map((anime, index) => (
                          <VideoCard
                            key={`${anime.id}-${index}`}
                            from='douban'
                            title={anime.name_cn || anime.name}
                            poster={
                              anime.images?.large ||
                              anime.images?.common ||
                              anime.images?.medium ||
                              anime.images?.small ||
                              anime.images?.grid
                            }
                            douban_id={anime.id}
                            rate={formatRating(anime.rating?.score ?? '')}
                            year={anime.air_date?.split('-')?.[0] || ''}
                            isBangumi
                          />
                        ));
                      })()}
                </MediaRow>
              </section>

              {/* 热门综艺 */}
              <section className='mb-12'>
                <SectionHeader title='热门综艺' href='/douban?type=show' />
                <MediaRow showArrows={false}>
                  {loading
                    ? Array.from({ length: 6 }).map((_, index) => (
                        <VideoCardSkeleton key={index} showYear />
                      ))
                    : hotVarietyShows.map((show, index) => (
                        <VideoCard
                          key={index}
                          from='douban'
                          title={show.title}
                          poster={show.poster}
                          douban_id={Number(show.id)}
                          rate={show.rate}
                          year={show.year}
                          type='show'
                        />
                      ))}
                </MediaRow>
              </section>

              {/* 更多热门 */}
              <section className='mb-12'>
                <SectionHeader title='更多热门' href='/douban?type=custom' />
                <MediaRow showArrows={false}>
                  {loading
                    ? Array.from({ length: 6 }).map((_, index) => (
                        <VideoCardSkeleton key={index} showYear />
                      ))
                    : hotCustomCategory.map((show, index) => (
                        <VideoCard
                          key={index}
                          from='douban'
                          title={show.title}
                          poster={show.poster}
                          douban_id={Number(show.id)}
                          rate={show.rate}
                          year={show.year}
                        />
                      ))}
                </MediaRow>
              </section>
            </>
          )}
        </div>
      </div>
      {announcement && (
        <ConfirmationDialog
          isOpen={showAnnouncement}
          onClose={() => handleCloseAnnouncement(announcement)}
          onConfirm={() => handleCloseAnnouncement(announcement)}
          title="提示"
          message={announcement}
          showCancelButton={false}
        />
      )}
      <ConfirmationDialog
        isOpen={showClearFavConfirm}
        onClose={() => setShowClearFavConfirm(false)}
        onConfirm={async () => {
          setShowClearFavConfirm(false);
          await clearAllFavorites();
          setFavoriteItems([]);
        }}
        title='清空收藏'
        message='将删除全部收藏记录，此操作不可撤销。确定继续吗？'
      />
    </PageLayout>
  );
}

export default function Home() {
  return (
    <Suspense>
      <HomeClient />
    </Suspense>
  );
}
