'use client';

import { usePathname, useRouter } from 'next/navigation';
import { clearScrollCache } from '@/lib/scrollCache';
import { UserMenu } from './UserMenu';
import TopSearchBar from './TopSearchBar';
import React from 'react';

interface TabletHeaderActionsProps {
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isOpen: boolean;
  title?: string;
}

export function TabletHeaderActions({ setIsOpen, isOpen, title }: TabletHeaderActionsProps) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <>
      {/* Left side */}
      <div className="flex items-center gap-4"> {/* Increased gap for title */}
        {/* Home button - only shown on douban and search pages */}
        {(pathname === '/douban' || pathname === '/search') && (
          <button
            onClick={() => { clearScrollCache('/douban'); router.push('/'); }}
            className="w-10 h-10 p-2 rounded-full bg-transparent hover:bg-white/10 transition-colors"
            aria-label="Go to homepage"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-house h-6 w-6 text-gray-600 dark:text-gray-300 md:text-gray-800 md:dark:text-gray-200">
              <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"></path>
              <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            </svg>
          </button>
        )}

        {/* Hamburger button — 桌面端(lg+)侧边栏常驻，无需汉堡菜单 */}
        {!(pathname || '').startsWith('/detail') && pathname !== '/play' && (
          <button
            onClick={() => setIsOpen((prev: boolean) => !prev)}
            className="w-10 h-10 p-2 rounded-full bg-transparent hover:bg-white/10 transition-colors lg:hidden"
            aria-label="Open sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-menu h-6 w-6 text-gray-600 dark:text-gray-300 md:text-gray-800 md:dark:text-gray-200">
              <line x1="4" x2="20" y1="12" y2="12"></line>
              <line x1="4" x2="20" y1="6" y2="6"></line>
              <line x1="4" x2="20" y1="18" y2="18"></line>
            </svg>
          </button>
        )}
        
        {/* Page Title */}
        {title && (
          <h2 className="text-xl font-bold text-ink whitespace-nowrap">
            {title}
          </h2>
        )}
      </div>

      {/* Right side — 常驻搜索输入框（替代原先孤立的放大镜图标）+ 用户菜单 */}
      <div className="flex items-center gap-3">
        <TopSearchBar className="hidden sm:flex w-56 lg:w-72" />
        <UserMenu className="text-ink-secondary" />
      </div>
    </>
  );
}
