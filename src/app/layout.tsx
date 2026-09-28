/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

import './globals.css';
import 'sweetalert2/dist/sweetalert2.min.css';

import { getConfig } from '@/lib/config';
import RuntimeConfig from '@/lib/runtime';

import { GlobalErrorIndicator } from '../components/GlobalErrorIndicator';
import { SidebarProvider } from '../components/SidebarProvider';
import { SiteProvider } from '../components/SiteProvider';
import { ThemeProvider } from '../components/ThemeProvider';
import ThemeStatusBar from '../components/ThemeStatusBar';
import { headers } from 'next/headers'; // 导入 headers

const inter = Inter({ subsets: ['latin'] });

// 辅助函数，用于检测 Android 用户代理
function isAndroid(userAgent: string): boolean {
  return /Android/i.test(userAgent);
}

// 动态生成 metadata，支持配置更新后的标题变化
export async function generateMetadata(): Promise<Metadata> {
  let siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Framee';
  if (process.env.NEXT_PUBLIC_STORAGE_TYPE !== 'upstash') {
    const config = await getConfig();
    siteName = config.SiteConfig.SiteName;
  }

  return {
    title: siteName,
    description: '影视聚合',
    manifest: '/manifest.json',
  };
}

export const viewport: Viewport = {
  viewportFit: 'cover',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = headers();
  const userAgent = headersList.get('user-agent') || '';
  const isAndroidDevice = isAndroid(userAgent);

  let siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Framee';
  let announcement =
    process.env.ANNOUNCEMENT || '切勿分享本站，以维持使用体验哦 ʕ •ᴥ•ʔ～✰✰';
  let doubanProxyType = process.env.NEXT_PUBLIC_DOUBAN_PROXY_TYPE || 'direct';
  let doubanProxy = process.env.NEXT_PUBLIC_DOUBAN_PROXY || '';
  let doubanImageProxyType =
    process.env.NEXT_PUBLIC_DOUBAN_IMAGE_PROXY_TYPE || 'img3';
  let doubanImageProxy = process.env.NEXT_PUBLIC_DOUBAN_IMAGE_PROXY || '';
  let customCategories = (RuntimeConfig as any).custom_category?.map((category: any) => ({
      name: 'name' in category ? category.name : '',
      type: category.type,
      query: category.query,
    })) || ([] as Array<{ name: string; type: 'movie' | 'tv'; query: string }>);
  if (process.env.NEXT_PUBLIC_STORAGE_TYPE !== 'upstash') {
    const config = await getConfig();
    siteName = config.SiteConfig.SiteName;
    announcement = config.SiteConfig.Announcement;
    doubanProxyType = config.SiteConfig.DoubanProxyType;
    doubanProxy = config.SiteConfig.DoubanProxy;
    doubanImageProxyType = config.SiteConfig.DoubanImageProxyType;
    doubanImageProxy = config.SiteConfig.DoubanImageProxy;
    customCategories = config.CustomCategories.filter(
      (category) => !category.disabled
    ).map((category) => ({
      name: category.name || '',
      type: category.type,
      query: category.query,
    }));
  }

  // 将运行时配置注入到全局 window 对象，供客户端在运行时读取
  const runtimeConfig = {
    STORAGE_TYPE: process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage',
    DOUBAN_PROXY_TYPE: doubanProxyType,
    DOUBAN_PROXY: doubanProxy,
    DOUBAN_IMAGE_PROXY_TYPE: doubanImageProxyType,
    DOUBAN_IMAGE_PROXY: doubanImageProxy,
    CUSTOM_CATEGORIES: customCategories,
    // 是否开放自助注册。登录页据此决定是否显示「注册」入口。
    ENABLE_REGISTRATION:
      process.env.NEXT_PUBLIC_ENABLE_REGISTRATION === 'true',
  };

  return (
    <html lang='zh-CN' suppressHydrationWarning>
      <head>
        <meta
          name='viewport'
          content='width=device-width, initial-scale=1.0, viewport-fit=cover'
        />

        {/* Favicon — 浏览器标签页图标
            - /favicon.ico: 通用兜底（所有浏览器，包括旧版 IE/Edge）
            - logo-mark-favicon-32x32/16x16: 现代浏览器 PNG 高清版本（金色胶囊 mark）
            - logo-light/dark 192x192 + prefers-color-scheme: 跟随系统主题切换（Chrome / Firefox / Safari 14+ 支持）
            注意：仅 apple-touch-icon 不够，必须显式声明 rel="icon" 才能控制标签页。 */}
        <link rel='icon' href='/favicon.ico' sizes='any' />
        <link
          rel='icon'
          type='image/png'
          sizes='32x32'
          href='/assets/logo/logo-mark-favicon-32x32.png'
        />
        <link
          rel='icon'
          type='image/png'
          sizes='16x16'
          href='/assets/logo/logo-mark-favicon-16x16.png'
        />
        <link
          rel='icon'
          type='image/png'
          sizes='192x192'
          href='/assets/logo/logo-light-192x192.png'
          media='(prefers-color-scheme: light)'
        />
        <link
          rel='icon'
          type='image/png'
          sizes='192x192'
          href='/assets/logo/logo-dark-192x192.png'
          media='(prefers-color-scheme: dark)'
        />

        {/* iOS / iPadOS 主屏幕图标（添加到主屏时使用） */}
        <link
          rel='apple-touch-icon'
          href='/assets/logo/logo-light-192x192.png'
        />
        {/* 
          为移动端浏览器状态栏设置主题颜色。
          浅色模式下，iOS 状态栏为白色背景、深色文字，Android 为浅灰色背景、深色文字。
          深色模式下，状态栏统一为黑色背景、浅色文字。
          这确保了应用在不同设备和主题下都有一致的视觉体验。
        */}
        <meta name="theme-color" content="#0A0B10" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0A0B10" media="(prefers-color-scheme: dark)" />

        {/* 将配置序列化后直接写入脚本，浏览器端可通过 window.RUNTIME_CONFIG 获取 */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.RUNTIME_CONFIG = ${JSON.stringify(runtimeConfig)};`,
          }}
        />
      </head>
      <body
        className={`${inter.className} min-h-screen bg-obsidian text-ink antialiased`}
      >
        {/* 影院级环境光背景：黑曜石渐变 + 深蓝/暗紫径向光 */}
        <div className="app-ambient-background fixed inset-0 -z-10" />
        <ThemeProvider
          attribute='class'
          defaultTheme='dark'
          disableTransitionOnChange
        >
          <SiteProvider siteName={siteName} announcement={announcement}>
            {/* 侧栏折叠状态挂在根布局，保证跨顶级路由导航时不丢失 */}
            <SidebarProvider>
              {children}
              <ThemeStatusBar />
              <GlobalErrorIndicator />
            </SidebarProvider>
          </SiteProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
