'use client';

import { Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';

import { SearchShortcutHint } from './SearchShortcut';

interface TopSearchBarProps {
  className?: string;
}

/**
 * 顶部常驻搜索输入框（桌面 / 平板端）。
 *
 * - 替代原先顶部右上角孤立的放大镜图标，搜索入口从此「所见即所得」；
 * - 回车提交后跳转到 `/search?q=...`；
 * - 已处于搜索页时，与页面内的搜索共享关键字（受控回填）；
 * - 右侧展示 Ctrl / ⌘ + K 快捷键提示（与全局快捷键联动）。
 */
const TopSearchBar: React.FC<TopSearchBarProps> = ({ className = '' }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  const [keyword, setKeyword] = useState('');

  // 在搜索页时，回填当前 URL 中的关键字；离开搜索页则清空
  useEffect(() => {
    if (pathname === '/search') {
      setKeyword(searchParams.get('q') || '');
    } else {
      setKeyword('');
    }
  }, [pathname, searchParams]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = keyword.trim();
    if (!q) {
      router.push('/search');
      return;
    }
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <form
      onSubmit={submit}
      role='search'
      className={`group/search flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 text-sm transition-colors duration-200 focus-within:border-amber-400/40 focus-within:bg-white/12 ${className}`}
    >
      <Search className='h-4 w-4 shrink-0 text-ink-muted transition-colors group-focus-within/search:text-amber-300' />
      <input
        ref={inputRef}
        type='text'
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder='搜索片名、演员、导演'
        aria-label='搜索'
        className='min-w-0 flex-1 rounded-none border-0 bg-transparent p-0 text-ink placeholder:text-ink-muted focus:outline-none focus:ring-0'
      />
      <SearchShortcutHint />
    </form>
  );
};

export default TopSearchBar;
