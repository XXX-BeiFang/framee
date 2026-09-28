import React from 'react';

interface VideoCardSkeletonProps {
  className?: string;
  showYear?: boolean;
}

/**
 * 海报骨架屏（影院深色主题）。
 * 与 VideoCard 的 aspect-[2/3] + rounded-xl + border-white/10 严格对齐，
 * 文本骨架同样保持两行（片名 / 年份·类型）。
 */
const VideoCardSkeleton: React.FC<VideoCardSkeletonProps> = ({
  className = '',
  showYear = false,
}) => {
  return (
    <div className={className}>
      <div className='relative aspect-[2/3] w-full animate-pulse overflow-hidden rounded-xl border border-white/10 bg-obsidian-600'>
        <div className='absolute inset-0 bg-gradient-to-t from-white/5 via-transparent to-white/5' />
      </div>
      <div className='mx-auto mt-2.5 h-3.5 w-3/4 animate-pulse rounded bg-obsidian-500' />
      {showYear && (
        <div className='mx-auto mt-1.5 h-3 w-1/2 animate-pulse rounded bg-obsidian-500/70' />
      )}
    </div>
  );
};

export default VideoCardSkeleton;
