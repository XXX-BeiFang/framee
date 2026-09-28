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
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ElementType, useEffect, useState } from 'react';

import { clearScrollCache } from '@/lib/scrollCache';
import BrandWordmark from './BrandWordmark';
import { useSidebarState } from './SidebarProvider';

interface MenuItem {
  icon: ElementType;
  label: string;
  href: string;
  onClick?: () => void;
}

/**
 * 导航字标区。
 *
 * 展开态完整字标与收起态首字母**同时挂载**，靠 opacity 交叉淡入淡出。
 * 原先按状态条件渲染（`<BrandWordmark collapsed={isCollapsed} />`）会在切换瞬间
 * 硬替换 DOM，视觉上就是一次跳变；交叉淡入才能让两个方向都连续。
 * 两层都放在同一个 Link 内，收起态点击首字母同样回首页。
 */
const SidebarBrand = ({ isCollapsed }: { isCollapsed: boolean }) => {
  return (
    <Link
      href='/'
      aria-label='Framee 首页'
      className='absolute inset-0 select-none transition-opacity duration-200 ease-out hover:opacity-90'
    >
      {/* 展开态：完整字标，居中于整个侧栏宽度 */}
      <span
        className={`absolute inset-y-0 left-0 flex w-full items-center justify-center transition-opacity duration-200 ease-out ${
          isCollapsed ? 'opacity-0' : 'opacity-100 delay-100'
        }`}
      >
        <BrandWordmark />
      </span>
      {/* 收起态：首字母靠左固定，避开右上角的切换按钮 */}
      <span
        aria-hidden='true'
        className={`absolute inset-y-0 left-2.5 flex items-center transition-opacity duration-200 ease-out ${
          isCollapsed ? 'opacity-100 delay-100' : 'opacity-0'
        }`}
      >
        <BrandWordmark collapsed />
      </span>
    </Link>
  );
};

interface SidebarProps {
  activePath?: string;
  isTabletMode?: boolean;
  onCategorySelect?: () => void;
}

const Sidebar = ({
  activePath = '/',
  isTabletMode = false,
  onCategorySelect,
}: SidebarProps) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // 折叠状态来自根布局的 SidebarProvider，而非本组件的局部 state：
  // PageLayout 由每个页面各自渲染，跨顶级路由导航时本组件会被重建，
  // 局部 state 会被重置回展开态（即「点图标后侧栏自己弹开」的根因）。
  const { isCollapsed, setIsCollapsed } = useSidebarState();
  const [active, setActive] = useState(activePath);

  useEffect(() => {
    if (activePath) {
      setActive(activePath);
    } else {
      const queryString = searchParams.toString();
      setActive(queryString ? `${pathname}?${queryString}` : pathname);
    }
  }, [activePath, pathname, searchParams]);

  // 首页/收藏共用 '/' 路径，靠 ?tab 区分；PageLayout 传入的 activePath 不含 tab，
  // 因此这里以浏览器实际 URL 为准，保证「收藏」高亮正确。
  useEffect(() => {
    const queryString = searchParams.toString();
    setActive(queryString ? `${pathname}?${queryString}` : pathname);
  }, [pathname, searchParams]);

  const [menuItems, setMenuItems] = useState<MenuItem[]>([
    { icon: Clapperboard, label: '电影', href: '/douban?type=movie' },
    { icon: Tv, label: '剧集', href: '/douban?type=tv' },
    { icon: Twitter, label: '动漫', href: '/douban?type=anime' },
    { icon: Drama, label: '综艺', href: '/douban?type=show' },
  ]);

  useEffect(() => {
    const runtimeConfig = (window as any).RUNTIME_CONFIG;
    if (runtimeConfig?.CUSTOM_CATEGORIES?.length > 0) {
      setMenuItems((prevItems) => [
        ...prevItems,
        {
          icon: CircleEllipsis,
          label: '更多',
          href: '/douban?type=custom',
        },
      ]);
    }
  }, []);

  const handleMenuClick = (href: string) => {
    const targetPathname = href.split('?')[0];
    if (targetPathname) {
      clearScrollCache(targetPathname);
    }
    window.dispatchEvent(new CustomEvent('clearHomepageScroll'));
    setActive(href);
    onCategorySelect?.();
  };

  // 收起态宽度 72px（纯图标），展开态 220px
  const widthClass = isCollapsed ? 'w-[72px]' : 'w-[220px]';

  // 将当前侧边栏宽度写入 CSS 变量，供顶部悬浮头 / 主内容对齐使用
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty(
        '--sidebar-width',
        isCollapsed ? '72px' : '220px'
      );
    }
  }, [isCollapsed]);

  return (
    <>
      {/* 可见性由外层容器控制：桌面端常驻 / 平板端抽屉内嵌
          aside 为 fixed 定位，后面的占位 div 负责撑开主内容偏移 */}
      <div className='flex'>
        <aside
          data-sidebar
          className={`fixed top-0 left-0 h-screen glass-strong z-10 ${widthClass} flex flex-col overflow-hidden transition-[width] duration-300 ease-in-out`}
        >
          {/* 顶部 Logo / 字标区域 */}
          <div className='relative h-16 shrink-0'>
            <SidebarBrand isCollapsed={isCollapsed} />
            {/* 折叠切换按钮：常驻右上角。收起态首字母靠左，两者不再重叠 */}
            <button
              onClick={() => setIsCollapsed((prev) => !prev)}
              className='absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-muted transition-colors duration-200 hover:bg-white/10 hover:text-ink'
              aria-label={isCollapsed ? '展开侧边栏' : '收起侧边栏'}
              title={isCollapsed ? '展开侧边栏' : '收起侧边栏'}
            >
              {isCollapsed ? (
                <PanelLeftOpen className='h-4 w-4' />
              ) : (
                <PanelLeftClose className='h-4 w-4' />
              )}
            </button>
          </div>

          {/* 分隔线 */}
          <div className='mx-3 h-px bg-white/10 shrink-0' />

          {/* 导航菜单 */}
          <nav className='flex-1 overflow-y-auto overflow-x-hidden px-2 mt-4 space-y-1'>
            {[
              {
                icon: Home,
                label: '首页',
                href: '/',
                onClick: () => {
                  setActive('/');
                  window.dispatchEvent(
                    new CustomEvent('clearHomepageScroll')
                  );
                },
              },
              {
                icon: Heart,
                label: '收藏',
                href: '/?tab=favorites',
              },
              {
                icon: History,
                label: '观看历史',
                href: '/history',
              },
              ...menuItems,
            ].map((item) => {
              const typeMatch = item.href.match(/type=([^&]+)/)?.[1];
              const decodedActive = decodeURIComponent(active);
              const decodedItemHref = decodeURIComponent(item.href);
              const isHome = item.href === '/';
              const isFavorites = item.href === '/?tab=favorites';
              const isActive = isHome
                ? active === '/'
                : isFavorites
                  ? active.includes('tab=favorites')
                  : decodedActive === decodedItemHref ||
                    (decodedActive.startsWith('/douban') &&
                      decodedActive.includes(`type=${typeMatch}`));
              const Icon = item.icon;
              /* 图标横向位置改用 padding-left 过渡（justify-content 不可动画）。
                 收起态 19px：导航容器 px-2(8) + 19 + 图标 18/2 = 36px，正好居中于 72px 栏。
                 颜色反馈 150ms、布局位移 300ms，与侧栏宽度同频同步。 */
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() =>
                    item.onClick ? item.onClick() : handleMenuClick(item.href)
                  }
                  data-active={isActive}
                  title={isCollapsed ? item.label : undefined}
                  style={{
                    transition:
                      'padding-left 300ms cubic-bezier(0.4, 0, 0.2, 1), background-color 150ms ease-out, color 150ms ease-out',
                  }}
                  className={`group relative flex min-h-[44px] items-center gap-3 rounded-lg py-2.5 pr-3 font-medium
                    ${
                      isActive
                        ? 'bg-amber-400/10 text-amber-400'
                        : 'text-ink-secondary hover:bg-white/8 hover:text-ink'
                    }
                    ${isCollapsed ? 'pl-[19px]' : 'pl-3.5'}
                  `}
                >
                  {/* 激活态：仅保留左侧 3px 琥珀金光标指示条 */}
                  {isActive && (
                    <span className='absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-amber-400' />
                  )}
                  <Icon
                    className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                      isActive
                        ? 'text-amber-400'
                        : 'text-ink-muted group-hover:text-amber-300'
                    }`}
                  />
                  {/* 文案常驻挂载、只做淡出位移：条件渲染会在切换瞬间硬插拔 DOM 造成跳变。
                      展开时延迟 100ms 再淡入——先让侧栏撑开，文字才不会被裁切边缘「削」到。 */}
                  <span
                    aria-hidden={isCollapsed}
                    className={`whitespace-nowrap text-[14px] transition-[opacity,transform] duration-200 ease-out ${
                      isCollapsed
                        ? '-translate-x-1.5 opacity-0'
                        : 'translate-x-0 opacity-100 delay-100'
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* 占位，保持主内容不被侧边栏遮挡；宽度与 aside 同步过渡，避免主内容区跳变 */}
        <div
          className={`sidebar-offset shrink-0 transition-[width] duration-300 ease-in-out ${widthClass}`}
        ></div>
      </div>
    </>
  );
};

export default Sidebar;