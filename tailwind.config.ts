import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        'mobile-landscape': {
          raw: '(orientation: landscape) and (max-height: 700px)',
        },
      },
      fontFamily: {
        primary: ['Inter', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        blue: { // Adding the blue palette
          350: '#70a9f9', // A shade between 300 and 400
          400: '#60a5fa',
        },
        'joyflix-blue': '#7ac0e0',
        'joyflix-blue-dark': '#6a9ecf',
        dark: '#222222',

        // ===== 影院级设计令牌 (Cinema Design Tokens) =====
        // 极深黑曜石背景色阶
        obsidian: {
          DEFAULT: '#0A0B10',
          900: '#0A0B10', // 页面主背景
          800: '#0F1017', // 顶部渐变起点
          700: '#131622', // 渐变中段
          600: '#161822', // 容器/卡片玻璃底
          500: '#1E2130', // 悬浮态
        },
        // 品牌强调色：琥珀金 / 影院黄（评分、主行动点）
        gold: {
          DEFAULT: '#F5C518',
          300: '#FBE071',
          400: '#F7D046',
          500: '#F5C518',
          600: '#D9AC0F',
          700: '#B8900C',
        },
        // 流媒体红（备选强调色）
        crimson: {
          DEFAULT: '#E50914',
          500: '#E50914',
          600: '#C40811',
        },
        // 文字层级
        ink: {
          DEFAULT: '#FFFFFF', // 主文字：高对比纯白
          secondary: '#94A3B8', // 次级文字：中性浅灰
          muted: '#64748B', // 弱化辅助：暗灰
        },
      },
      boxShadow: {
        // 海报悬浮微光阴影
        'glow-gold':
          '0 12px 32px -4px rgba(0, 0, 0, 0.6), 0 0 16px rgba(245, 197, 24, 0.15)',
        'glow-gold-strong':
          '0 16px 40px -4px rgba(0, 0, 0, 0.7), 0 0 24px rgba(245, 197, 24, 0.28)',
        card: '0 8px 24px -6px rgba(0, 0, 0, 0.5)',
        glass: '0 8px 32px -8px rgba(0, 0, 0, 0.6)',
      },
      spacing: {
        sidebar: '220px',
        'sidebar-collapsed': '72px',
      },
      keyframes: {
        flicker: {
          '0%, 19.999%, 22%, 62.999%, 64%, 64.999%, 70%, 100%': {
            opacity: '0.99',
            filter:
              'drop-shadow(0 0 1px rgba(252, 211, 77)) drop-shadow(0 0 15px rgba(245, 158, 11)) drop-shadow(0 0 1px rgba(252, 211, 77))',
          },
          '20%, 21.999%, 63%, 63.999%, 65%, 69.999%': {
            opacity: '0.4',
            filter: 'none',
          },
        },
        shimmer: {
          '0%': {
            backgroundPosition: '-700px 0',
          },
          '100%': {
            backgroundPosition: '700px 0',
          },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInFromRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        // 左轮弹巢：整盘逆时针匀速旋转（4s/圈，无缝循环）
        revolve: {
          to: { transform: 'rotate(-360deg)' },
        },
        // 膛室字母反向自转，抵消整盘旋转以保持正立
        'revolve-counter': {
          to: { transform: 'rotate(360deg)' },
        },
        // 圆心读数：6 段步进，逐字切换最上方字母
        'revolve-letter': {
          '0%, 16.666%': { opacity: '1' },
          '16.667%, 100%': { opacity: '0' },
        },
      },
      animation: {
        flicker: 'flicker 3s linear infinite',
        shimmer: 'shimmer 1.3s linear infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-in-out',
        'slide-down': 'slideDown 0.3s ease-in-out',
        'slide-in-from-right': 'slideInFromRight 0.3s ease-out',
        revolve: 'revolve 4s linear infinite',
        'revolve-counter': 'revolve-counter 4s linear infinite',
        'revolve-letter': 'revolve-letter 4s step-end infinite',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
} satisfies Config;

export default config;
