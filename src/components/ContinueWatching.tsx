'use client';
/* eslint-disable no-console */
import { Trash2 } from 'lucide-react';

import { useEffect, useState } from 'react';

import type { PlayRecord } from '@/lib/db.client';
import {
  clearAllPlayRecords,
  getAllPlayRecords,
  subscribeToDataUpdates,
} from '@/lib/db.client';

import ConfirmationDialog from '@/components/ConfirmationDialog';
import MediaRow from '@/components/MediaRow';
import SectionHeader from '@/components/SectionHeader';
import VideoCard from '@/components/VideoCard';
import VideoCardSkeleton from '@/components/VideoCardSkeleton';

interface ContinueWatchingProps {
  className?: string;
}

export default function ContinueWatching({ className }: ContinueWatchingProps) {
  const [playRecords, setPlayRecords] = useState<
    (PlayRecord & { key: string })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // 处理播放记录数据更新的函数
  const updatePlayRecords = (allRecords: Record<string, PlayRecord>) => {
    // 将记录转换为数组并根据 save_time 由近到远排序
    const recordsArray = Object.entries(allRecords).map(([key, record]) => ({
      ...record,
      key,
    }));

    // 按 save_time 降序排序（最新的在前面）
    const sortedRecords = recordsArray.sort(
      (a, b) => b.save_time - a.save_time
    );

    // --- 添加去重逻辑 ---
    const uniqueRecordsMap = new Map<string, PlayRecord & { key: string }>();
    sortedRecords.forEach(record => {
      const key = `${record.title}-${record.year}`;
      if (!uniqueRecordsMap.has(key)) {
        uniqueRecordsMap.set(key, record);
      }
    });
    const deduplicatedAndSortedRecords = Array.from(uniqueRecordsMap.values());
    // --- 去重逻辑结束 ---

    setPlayRecords(deduplicatedAndSortedRecords);
  };

  useEffect(() => {
    const fetchPlayRecords = async () => {
      try {
        setLoading(true);

        // 从缓存或API获取所有播放记录
        const allRecords = await getAllPlayRecords();
        updatePlayRecords(allRecords);
      } catch (error) {
        console.error('获取播放记录失败:', error);
        setPlayRecords([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayRecords();

    // 监听播放记录更新事件
    const unsubscribe = subscribeToDataUpdates(
      'playRecordsUpdated',
      (newRecords: Record<string, PlayRecord>) => {
        updatePlayRecords(newRecords);
      }
    );

    return unsubscribe;
  }, []);

  // 如果没有播放记录，则不渲染组件
  if (!loading && playRecords.length === 0) {
    return null;
  }

  // 计算播放进度百分比
  const getProgress = (record: PlayRecord) => {
    if (record.total_time === 0) return 0;
    return (record.play_time / record.total_time) * 100;
  };

  // 从 key 中解析 source 和 id
  const parseKey = (key: string) => {
    const [source, id] = key.split('+');
    return { source, id };
  };

  return (
    <section className={`mb-12 ${className || ''}`}>
      <SectionHeader
        title='继续观看'
        action={
          !loading && playRecords.length > 0 ? (
            <button
              onClick={() => setShowClearConfirm(true)}
              aria-label='清空播放记录'
              title='清空全部播放记录'
            >
              <Trash2
                size={18}
                className='text-ink-muted transition-all duration-300 ease-out hover:stroke-crimson hover:scale-[1.1]'
              />
            </button>
          ) : undefined
        }
      />
      <MediaRow>
        {loading
          ? // 加载状态显示深色骨架占位
            Array.from({ length: 6 }).map((_, index) => (
              <VideoCardSkeleton key={index} showYear />
            ))
          : // 显示真实数据
            playRecords.map((record) => {
              const { source, id } = parseKey(record.key);
              return (
                <VideoCard
                  key={record.key}
                  id={id}
                  title={record.title}
                  poster={record.cover}
                  year={record.year}
                  source={source}
                  source_name={record.source_name}
                  progress={getProgress(record)}
                  episodes={record.total_episodes}
                  currentEpisode={record.index}
                  query={record.search_title}
                  from='playrecord'
                  onDelete={() =>
                    setPlayRecords((prev) =>
                      prev.filter((r) => r.key !== record.key)
                    )
                  }
                  type={record.total_episodes > 1 ? 'tv' : ''}
                />
              );
            })}
      </MediaRow>

      <ConfirmationDialog
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={async () => {
          setShowClearConfirm(false);
          await clearAllPlayRecords();
          setPlayRecords([]);
        }}
        title='清空播放记录'
        message='将删除全部观看记录与播放进度，此操作不可撤销。确定继续吗？'
      />
    </section>
  );
}
