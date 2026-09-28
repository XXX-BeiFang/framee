'use client';

import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useState,
} from 'react';

interface SidebarState {
  /** 桌面端侧边栏是否收起 */
  isCollapsed: boolean;
  setIsCollapsed: Dispatch<SetStateAction<boolean>>;
}

const SidebarStateContext = createContext<SidebarState>({
  isCollapsed: false,
  setIsCollapsed: () => {},
});

export const useSidebarState = () => useContext(SidebarStateContext);

/**
 * 侧边栏折叠状态提供者。
 *
 * **必须挂在 `app/layout.tsx`（根布局），不能放进 `Sidebar` 自己。**
 *
 * 原因：`PageLayout` 是由每个页面各自渲染的（根布局只提供 ThemeProvider / SiteProvider），
 * 而 `Sidebar` 又挂在 `PageLayout` 内部。跨顶级路由导航（/ ↔ /douban ↔ /history）时
 * Next 会卸载并重建整棵 `PageLayout` 子树，`Sidebar` 随之重建。
 * 折叠状态若存在 `Sidebar` 的局部 `useState` 里，重建时会被重新初始化为 `false`，
 * 表现就是「收起状态下点一下导航图标，侧栏突然自己弹开」。
 *
 * 根布局在客户端路由切换时不会被重建，状态因此得以跨页面保留。
 */
export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <SidebarStateContext.Provider value={{ isCollapsed, setIsCollapsed }}>
      {children}
    </SidebarStateContext.Provider>
  );
}
