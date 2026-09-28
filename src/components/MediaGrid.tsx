'use client';

import * as React from 'react';

interface MediaGridProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * 响应式影视流网格（Media Grid）。
 *
 * 严格控制列数，彻底拒绝 8~9 列的密集排版：
 * - H5   (<768px)    : 2 列, gap-4
 * - 平板 (768~1024)  : 3 列, gap-4
 * - 小桌面(1024~1280): 4 列, gap-5
 * - PC   (>=1280)    : 5 列, gap-6 (24px)
 * - 大屏 (>=1536)    : 6 列, gap-6
 *
 * 留出充足呼吸空间，卡片比例由 MediaCard 统一为 aspect-[2/3]。
 */
export default function MediaGrid({
  children,
  className = '',
}: MediaGridProps) {
  return (
    <div
      className={`grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5 xl:grid-cols-5 xl:gap-6 2xl:grid-cols-6 ${className}`}
    >
      {children}
    </div>
  );
}