'use client';

import { useFloatingHeaderVisibility } from '@/lib/useFloatingHeaderVisibility';

import { TabletHeaderActions } from './TabletHeaderActions';
import React from 'react';

interface FloatingHeaderProps {
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  scrollContainerRef: React.RefObject<HTMLElement> | null;
  isOpen: boolean;
  title?: string;
  /**
   * 常驻模式：为 true 时顶部栏始终可见（页面进入即显示、滚动不隐藏），
   * 保证搜索输入框在首屏也能第一时间被看到。
   */
  pinned?: boolean;
}

export function FloatingHeader({ setIsOpen, scrollContainerRef, isOpen, title, pinned = false }: FloatingHeaderProps) {
  const autoVisible = useFloatingHeaderVisibility(scrollContainerRef);
  const isVisible = pinned || autoVisible;


  return (
    <header
      className={`safe-padding-top hidden md:flex fixed top-0 right-0 z-[999] h-14 items-center justify-between px-4 transition-[left,transform] duration-300 ease-in-out
        left-0 lg:[left:var(--sidebar-width,220px)]
        ${isVisible ? 'translate-y-0' : '-translate-y-full'}
      `}
    >
      {/* Background with blur — 深色毛玻璃 */}
      <div className="absolute inset-0 w-full h-full glass-strong border-b border-white/10" />

      {/* Actions */}
      <div className="relative z-10 flex w-full items-center justify-between">
        <TabletHeaderActions setIsOpen={setIsOpen} isOpen={isOpen} title={title} />
      </div>
    </header>
  );
}

export default FloatingHeader;
