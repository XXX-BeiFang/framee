'use client';

import { ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';

interface SectionHeaderProps {
  title: string;
  /** 「查看全部 >」跳转地址 */
  href?: string;
  /** 右侧额外操作区（如清空按钮） */
  action?: React.ReactNode;
  className?: string;
}

/**
 * 分区标题栏（Section Header）。
 *
 * - 左侧：`w-1 h-5` amber 高亮竖条 + 22px 纯白加粗标题
 * - 右侧：浅灰色「查看全部 >」链接，hover 变纯白
 */
export default function SectionHeader({
  title,
  href,
  action,
  className = '',
}: SectionHeaderProps) {
  const router = useRouter();

  return (
    <div
      className={`mb-5 flex items-center justify-between gap-3 ${className}`}
    >
      <h2 className='flex items-center gap-3 text-[22px] font-bold text-white leading-none tracking-tight'>
        <span className='w-1 h-5 bg-amber-400 rounded-full shrink-0' />
        {title}
      </h2>

      <div className='flex items-center gap-3'>
        {action}
        {href && (
          <button
            onClick={() => router.push(href)}
            className='group inline-flex items-center gap-0.5 text-[13px] font-medium text-[#94A3B8] hover:text-white transition-colors duration-200'
          >
            查看全部
            <ChevronRight className='h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5' />
          </button>
        )}
      </div>
    </div>
  );
}
