'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/**
 * 判断当前是否为 macOS（用于展示 ⌘ 而非 Ctrl）。
 * SSR 阶段统一返回 false，避免 hydration 不一致。
 */
export const useIsMac = () => {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    const platform =
      (navigator as any)?.userAgentData?.platform || navigator.platform || '';
    setIsMac(/mac|iphone|ipad|ipod/i.test(String(platform)));
  }, []);

  return isMac;
};

interface SearchShortcutHintProps {
  className?: string;
}

/**
 * 搜索框右侧的快捷键提示胶囊（桌面端展示）。
 */
export const SearchShortcutHint = ({ className = '' }: SearchShortcutHintProps) => {
  const isMac = useIsMac();

  return (
    <span
      className={`hidden sm:flex items-center gap-1 pointer-events-none select-none ${className}`}
      aria-hidden='true'
    >
      <kbd className='rounded-md border border-white/15 bg-white/8 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-ink-secondary'>
        {isMac ? '⌘' : 'Ctrl'}
      </kbd>
      <kbd className='rounded-md border border-white/15 bg-white/8 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-ink-secondary'>
        K
      </kbd>
    </span>
  );
};

/**
 * 全局搜索快捷键：Ctrl / ⌘ + K
 * - 播放页不拦截（播放页有自己的快捷键体系）
 * - 已在搜索页：聚焦并全选输入框
 * - 其它页面：跳转到搜索页
 */
const GlobalSearchShortcut = () => {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key !== 'k' && event.key !== 'K') return;
      if (pathname?.startsWith('/play')) return;

      event.preventDefault();

      if (pathname === '/search') {
        const input = document.getElementById(
          'searchInput'
        ) as HTMLInputElement | null;
        if (input) {
          input.focus();
          input.select();
        }
        return;
      }

      router.push('/search');
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [pathname, router]);

  return null;
};

export default GlobalSearchShortcut;
