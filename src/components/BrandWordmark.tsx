'use client';

import * as React from 'react';

interface BrandWordmarkProps {
  /** 收起态（仅图标栏）时隐藏副标题并缩小字标 */
  collapsed?: boolean;
  className?: string;
  /** 副标题文案 */
  subtitle?: string;
}

/**
 * 品牌字标（Wordmark）— 用于顶部/左侧导航。
 *
 * 设计意图：去除原先土黄色块 Logo，改用优雅字标 + 小字副标，
 * 与影院级深色主题融为一体。
 *
 * - 主字标 "Framee"：衬线体、半粗、紧字距，白色渐变高亮。
 * - 副标 "SHARE A MOMENT"：极小字号、宽字距、暗灰弱化。
 */
const BrandWordmark: React.FC<BrandWordmarkProps> = ({
  collapsed = false,
  className = '',
  subtitle = 'SHARE A MOMENT',
}) => {
  if (collapsed) {
    // 收起态：仅展示首字母 F，保持图标栏语义
    return (
      <span
        className={`inline-flex items-center justify-center select-none ${className}`}
        aria-label='Framee'
      >
        <span className='text-2xl font-semibold tracking-tight text-gradient-gold'>
          F
        </span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex flex-col leading-none select-none ${className}`}
    >
      <span className='text-[22px] font-semibold tracking-tight text-gradient'>
        Framee
      </span>
      <span className='mt-1 text-[9px] font-medium uppercase tracking-[0.22em] text-ink-muted'>
        {subtitle}
      </span>
    </span>
  );
};

export default BrandWordmark;