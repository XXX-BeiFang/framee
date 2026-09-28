'use client';

import * as React from 'react';

export type BrandLogoVariant = 'mark' | 'large';

interface BrandLogoProps {
  /**
   * 'mark' — 简化版（仅 "Framee" 文字胶囊），用于导航/小尺寸/收起状态。
   * 'large' — 完整版（"Framee" + "FRAME A MOMENT" 副标题），用于加载页/首页大尺寸。
   *            在 dark 模式下会自动切换为 logo-dark.svg。
   */
  variant?: BrandLogoVariant;
  className?: string;
  /** 渲染宽度（CSS 值，例如 '120'、'w-32' 等）。SVG 自适应高度。 */
  width?: number | string;
  /** 渲染高度（CSS 值）。可选，未传时根据 viewBox 比例自适应。 */
  height?: number | string;
  /** 可选的 alt 文本。 */
  alt?: string;
  /** 包裹元素（默认 <span>）。 */
  as?: keyof JSX.IntrinsicElements;
}

/**
 * 统一品牌 Logo 组件。
 *
 * - mark: 始终使用 logo-mark.svg（金色胶囊 + "Framee"），与周围背景无关。
 * - large: 浅色模式使用 logo-light.svg，深色模式（html.dark）自动切换为 logo-dark.svg。
 *   副标题 "FRAME A MOMENT" 已内置在 SVG 中，无需额外 DOM 节点。
 *
 * SSR 安全：通过 Tailwind `dark:` 变体在 CSS 层切换，服务器端即可输出正确结构，
 * 避免主题水合闪烁。
 */
const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'large',
  className = '',
  width,
  height,
  alt,
  as: Tag = 'span',
}) => {
  const sizeProps =
    width !== undefined
      ? { width, height: height ?? 'auto' }
      : (variant === 'mark'
        ? { width: 120, height: 'auto' }
        : { width: 200, height: 'auto' });

  if (variant === 'mark') {
    return (
      <Tag className={`inline-flex items-center ${className}`}>
        <img
          src='/assets/logo/logo-mark.svg'
          alt={alt ?? 'Framee'}
          decoding='async'
          draggable={false}
          {...sizeProps}
          className='select-none'
        />
      </Tag>
    );
  }

  return (
    <Tag className={`inline-flex items-center ${className}`}>
      {/* 浅色模式 */}
      <img
        src='/assets/logo/logo-light.svg'
        alt={alt ?? 'Framee'}
        decoding='async'
        draggable={false}
        {...sizeProps}
        className='block dark:hidden select-none'
      />
      {/* 深色模式 */}
      <img
        src='/assets/logo/logo-dark.svg'
        alt={alt ?? 'Framee'}
        decoding='async'
        draggable={false}
        {...sizeProps}
        className='hidden dark:block select-none'
      />
    </Tag>
  );
};

export default BrandLogo;