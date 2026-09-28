/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import {
  Twitter,
  CircleEllipsis,
  Drama,
  Clapperboard,
  Heart,
  History,
  Home,
  Tv,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { clearAllScrollCaches } from '@/lib/scrollCache';

interface MobileBottomNavProps {
  /**
   * 主动指定当前激活的路径。当未提供时，自动使用 usePathname() 获取的路径。
   */
  activePath?: string;
}

const MobileBottomNav = ({ activePath }: MobileBottomNavProps) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 当前激活路径：优先使用传入的 activePath，否则回退到浏览器地址（含 query）
  const queryString = searchParams.toString();
  const currentActive =
    activePath ?? (queryString ? `${pathname}?${queryString}` : pathname);

  const [navItems, setNavItems] = useState([
    { icon: Home, label: '首页', href: '/' },
    { icon: History, label: '历史', href: '/history' },
    { icon: Heart, label: '收藏', href: '/?tab=favorites' },
    {
      icon: Clapperboard,
      label: '电影',
      href: '/douban?type=movie',
    },
    {
      icon: Tv,
      label: '剧集',
      href: '/douban?type=tv',
    },
    {
      icon: Twitter,
      label: '动漫',
      href: '/douban?type=anime',
    },
    {
      icon: Drama,
      label: '综艺',
      href: '/douban?type=show',
    },
  ]);

  useEffect(() => {
    const runtimeConfig = (window as any).RUNTIME_CONFIG;
    if (runtimeConfig?.CUSTOM_CATEGORIES?.length > 0) {
      setNavItems((prevItems) => [
        ...prevItems,
        {
          icon: CircleEllipsis,
          label: '更多',
          href: '/douban?type=custom',
        },
      ]);
    }
  }, []);

  const isActive = (href: string) => {
    const typeMatch = href.match(/type=([^&]+)/)?.[1];

    // 解码URL以进行正确的比较
    const decodedActive = decodeURIComponent(currentActive);
    const decodedItemHref = decodeURIComponent(href);

    if (href === '/') return decodedActive === '/';
    if (href === '/?tab=favorites') return decodedActive.includes('tab=favorites');

    return (
      decodedActive === decodedItemHref ||
      (decodedActive.startsWith('/douban') &&
        decodedActive.includes(`type=${typeMatch}`))
    );
  };

  return (
    <nav
      className='md:hidden fixed left-0 right-0 z-[600] glass-strong border-t border-white/10 overflow-hidden rounded-t-2xl'
      style={{
        /* 紧贴视口底部，同时在内部留出 iOS 安全区高度 */
        bottom: 0,
        paddingBottom: 'env(safe-area-inset-bottom)',
        minHeight: 'calc(3.5rem + env(safe-area-inset-bottom))',
      }}
    >
      {/* 项目宽度由 flex 均分：项数增加时不再溢出成横向滚动，
          用户不必「猜到」导航条还能左右滑 */}
      <ul className='flex items-stretch overflow-x-auto scrollbar-hide'>
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <li
              key={item.href}
              className='min-w-0 flex-1 basis-0'
            >
              <Link
                href={item.href}
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('clearHomepageScroll'));
                  clearAllScrollCaches();
                }}
                className='relative flex flex-col items-center justify-center w-full h-14 gap-1 text-xs'
              >
                {/* 激活态顶部金色指示条 */}
                {active && (
                  <span className='absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-gold rounded-full' />
                )}
                <item.icon
                  className={`h-[22px] w-[22px] transition-colors duration-200 ${
                    active ? 'text-gold' : 'text-ink-muted'
                  }`}
                  strokeWidth={active ? 2.2 : 1.8}
                />
                <span
                  className={`transition-colors duration-200 ${
                    active
                      ? 'text-gold font-medium'
                      : 'text-ink-secondary'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default function MobileBottomNavWrapper(props: MobileBottomNavProps) {
  return (
    <Suspense fallback={null}>
      <MobileBottomNav {...props} />
    </Suspense>
  );
}
