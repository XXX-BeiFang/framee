'use client';

import { History, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import ConfirmationDialog from '@/components/ConfirmationDialog';
import PageLayout from '@/components/PageLayout';
import SectionHeader from '@/components/SectionHeader';
import VideoCard from '@/components/VideoCard';
import VideoCardSkeleton from '@/components/VideoCardSkeleton';
import type { PlayRecord } from '@/lib/db.client';
import {
  clearAllPlayRecords,
  getAllPlayRecords,
  subscribeToDataUpdates,
} from '@/lib/db.client';

type HistoryItem = PlayRecord & { key: string };

const DAY_MS = 24 * 60 * 60 * 1000;

/** 分桶顺序：由近及远 */
const BUCKET_ORDER = ['今天', '昨天', '近 7 天', '更早'] as const;
type Bucket = (typeof BUCKET_ORDER)[number];

/** 按「上次观看时间」归入时间段，避免在每张卡片上重复印时间戳 */
function bucketOf(saveTime: number, now: number): Bucket {
  const startOfToday = new Date(now).setHours(0, 0, 0, 0);
  if (saveTime >= startOfToday) return '今天';
  if (saveTime >= startOfToday - DAY_MS) return '昨天';
  if (saveTime >= startOfToday - 6 * DAY_MS) return '近 7 天';
  return '更早';
}

/** 从 `source+id` 组合键中还原出播放页需要的两个参数 */
function parseKey(key: string): { source: string; id: string } {
  const plusIndex = key.indexOf('+');
  if (plusIndex < 0) return { source: key, id: '' };
  return { source: key.slice(0, plusIndex), id: key.slice(plusIndex + 1) };
}

function HistoryClient() {
  const [records, setRecords] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [now, setNow] = useState(0);

  /**
   * 归一化播放记录：
   * 1. 按 save_time 倒序（最近看的在前）
   * 2. 以「片名 + 年份」去重——同一部片换源或换集会产生多条记录
   */
  const applyRecords = (allRecords: Record<string, PlayRecord>) => {
    const sorted = Object.entries(allRecords)
      .map(([key, record]) => ({ ...record, key }))
      .sort((a, b) => b.save_time - a.save_time);

    const seen = new Set<string>();
    const deduped: HistoryItem[] = [];
    for (const item of sorted) {
      const identity = `${item.title}-${item.year}`;
      if (seen.has(identity)) continue;
      seen.add(identity);
      deduped.push(item);
    }
    setRecords(deduped);
  };

  useEffect(() => {
    setNow(Date.now());
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const allRecords = await getAllPlayRecords();
        if (!cancelled) applyRecords(allRecords);
      } catch (error) {
        console.error('获取观看历史失败:', error);
        if (!cancelled) setRecords([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    const unsubscribe = subscribeToDataUpdates(
      'playRecordsUpdated',
      (next: Record<string, PlayRecord>) => {
        if (!cancelled) applyRecords(next);
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const groups = useMemo(() => {
    if (!now) return [];
    const map = new Map<Bucket, HistoryItem[]>();
    for (const item of records) {
      const bucket = bucketOf(item.save_time, now);
      const bucketItems = map.get(bucket);
      if (bucketItems) {
        bucketItems.push(item);
      } else {
        map.set(bucket, [item]);
      }
    }
    return BUCKET_ORDER.filter((bucket) => map.has(bucket)).map((bucket) => ({
      bucket,
      items: map.get(bucket) as HistoryItem[],
    }));
  }, [records, now]);

  const handleDeleteOne = (key: string) => {
    setRecords((prev) => prev.filter((item) => item.key !== key));
  };

  return (
    <PageLayout activePath='/history' title='观看历史'>
      <div className='overflow-x-hidden px-4 py-0 sm:px-6 sm:py-6 md:pt-[4.5rem] lg:px-8'>
        <div className='mx-auto max-w-[98%] xl:max-w-[96%]'>
          {loading ? (
            <section className='mb-12'>
              <SectionHeader title='观看历史' />
              <div className='grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5 xl:grid-cols-5 xl:gap-6 2xl:grid-cols-6'>
                {Array.from({ length: 10 }).map((_, index) => (
                  <VideoCardSkeleton key={index} showYear />
                ))}
              </div>
            </section>
          ) : records.length === 0 ? (
            /* 空状态：与「收藏」保持一致的中性空状态卡片 */
            <div className='flex items-center justify-center py-10'>
              <div className='glass-strong flex w-full max-w-md flex-col items-center rounded-2xl border border-white/10 px-8 py-12 text-center shadow-xl'>
                <div className='mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white/5 text-ink-muted ring-1 ring-white/10'>
                  <History className='h-7 w-7' strokeWidth={1.6} />
                </div>
                <p className='text-base font-semibold text-ink'>还没有观看记录</p>
                <p className='mt-1.5 text-[13px] leading-relaxed text-ink-muted'>
                  播放任意影片后，这里会按时间记录你的进度，方便随时续看
                </p>
                <Link
                  href='/'
                  className='mt-6 inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-[13px] font-semibold text-black shadow-glow-gold transition-all duration-200 hover:scale-[1.03] hover:bg-gold-400 hover:shadow-glow-gold-strong active:scale-[0.98]'
                >
                  去首页探索
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* 页头总览：条数 + 清空全部（二次确认后执行） */}
              <div className='mb-8 flex items-center justify-between gap-4'>
                <p className='text-[13px] text-ink-muted'>
                  共 <span className='font-medium text-ink'>{records.length}</span>{' '}
                  部影视有观看记录
                </p>
                <button
                  type='button'
                  onClick={() => setShowClearConfirm(true)}
                  className='inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[13px] font-medium text-ink-secondary transition-colors duration-200 hover:border-crimson/40 hover:text-crimson'
                >
                  <Trash2 size={15} />
                  清空全部
                </button>
              </div>

              {groups.map((group) => (
                <section key={group.bucket} className='mb-12'>
                  <SectionHeader title={group.bucket} />
                  <div className='grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5 xl:grid-cols-5 xl:gap-6 2xl:grid-cols-6'>
                    {group.items.map((item) => {
                      const { source, id } = parseKey(item.key);
                      return (
                        <VideoCard
                          key={item.key}
                          id={id}
                          source={source}
                          title={item.title}
                          poster={item.cover}
                          year={item.year}
                          source_name={item.source_name}
                          progress={
                            item.total_time > 0
                              ? (item.play_time / item.total_time) * 100
                              : 0
                          }
                          episodes={item.total_episodes}
                          currentEpisode={item.index}
                          query={item.search_title}
                          from='playrecord'
                          onDelete={() => handleDeleteOne(item.key)}
                          /* PlayRecord 未持久化内容类型，多集记录无法区分
                             剧集 / 综艺 / 动漫，此处宁可不标也不误标「剧集」 */
                          type={item.total_episodes > 1 ? '' : 'movie'}
                        />
                      );
                    })}
                  </div>
                </section>
              ))}
            </>
          )}
        </div>
      </div>

      <ConfirmationDialog
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={async () => {
          setShowClearConfirm(false);
          await clearAllPlayRecords();
          setRecords([]);
        }}
        title='清空观看历史'
        message='将删除全部观看记录与播放进度，此操作不可撤销。确定继续吗？'
      />
    </PageLayout>
  );
}

export default function HistoryPage() {
  return <HistoryClient />;
}
