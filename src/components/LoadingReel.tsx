'use client';

import * as React from 'react';

import BrandLogo from './BrandLogo';

export type LoadingStage =
  | 'searching'
  | 'fetching'
  | 'preferring'
  | 'ready';

interface LoadingReelProps {
  /** 当前加载阶段：searching/fetching → preferring → ready */
  stage: LoadingStage;
  /** 进度下方的提示文案（与 loadingMessage 同源） */
  message: string;
}

/**
 * Framee 加载页：左轮弹巢转盘（revolver cylinder）
 *
 * 设计语言：黑底圆形弹巢，6 个膛室（弹孔）均匀排布（60° 等分），
 * 依次映射网站名 "FRAMEE" 的 6 个字母 F·R·A·M·E·E。
 * - 整盘匀速旋转：4s / 圈，linear infinite，无缝循环（GPU 合成层 transform，不触发重绘）；
 *   逆时针旋转使 12 点钟方向的膛室按 F→R→A→M→E→E 顺序递进。
 * - 膛室字母各自反向自转（+360° / 4s）抵消整盘旋转，永远保持正立、清晰可读。
 * - 圆心读数：用 6 段 CSS 步进动画（step-end，与整盘同频 4s）实时显示当前最上方字母，
 *   逐字切换无淡入淡出跳变。
 * - 进度：3 阶段点（金色填充 + 当前态放大 1.5×）+ 细金线进度条，独立于字母装饰。
 * - prefers-reduced-motion: reduce 时停转，静态显示首字母 F。
 *
 * 同步保证：整盘 `animate-revolve`、字母 `revolve-counter`、圆心 `revolve-letter`
 * 三者 duration 均为 4s、同起点、linear/step-end，浏览器保其锁步，无累积漂移。
 */
const WORD = ['F', 'R', 'A', 'M', 'E', 'E'] as const;
const STAGE_ORDER: Array<'searching' | 'preferring' | 'ready'> = [
  'searching',
  'preferring',
  'ready',
];
const REVOLVE_MS = 4000;
const STEP_MS = REVOLVE_MS / WORD.length; // 每膛室 666.67ms
const CHAMBER_RADIUS = 60; // 膛室中心距转盘圆心的像素半径

function getStageIndex(stage: LoadingStage): number {
  // searching 与 fetching 共用第 1 阶段
  if (stage === 'searching' || stage === 'fetching') return 0;
  return STAGE_ORDER.indexOf(stage);
}

export default function LoadingReel({ stage, message }: LoadingReelProps) {
  const idx = getStageIndex(stage);
  const progress = idx === 0 ? 33 : idx === 1 ? 66 : 100;

  // 6 个膛室的对位坐标：0°=正上方(12 点钟)，顺时针 60° 等分
  const chambers = React.useMemo(
    () =>
      WORD.map((letter, i) => {
        const angle = (i * 60) * (Math.PI / 180);
        return {
          letter,
          dx: CHAMBER_RADIUS * Math.sin(angle),
          dy: -CHAMBER_RADIUS * Math.cos(angle),
        };
      }),
    []
  );

  return (
    <div className='flex flex-col items-center gap-6'>
      <BrandLogo variant='large' width={180} />

      <div
        className='relative h-[184px] w-[184px]'
        role='img'
        aria-label='正在加载影片'
      >
        {/* 旋转弹巢：整盘逆时针匀速旋转 */}
        <div className='motion-safe:animate-revolve absolute inset-0 rounded-full border-2 border-gold bg-obsidian-900'>
          {chambers.map((c, i) => (
            <div
              key={i}
              className='absolute left-1/2 top-1/2'
              style={{
                transform: `translate(calc(-50% + ${c.dx}px), calc(-50% + ${c.dy}px))`,
              }}
            >
              <div className='flex h-9 w-9 items-center justify-center rounded-full border border-gold/60 bg-obsidian-600'>
                {/* 字母反向自转，抵消整盘旋转，保持正立 */}
                <span
                  className='motion-safe:animate-revolve-counter inline-block font-semibold text-gold'
                  style={{ fontSize: '15px' }}
                >
                  {c.letter}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* 圆心读数：实时显示当前最上方字母（6 段步进，逐字切换） */}
        <div className='pointer-events-none absolute inset-0 flex items-center justify-center'>
          <div className='relative flex h-16 w-16 items-center justify-center rounded-full border border-gold bg-obsidian-900'>
            {WORD.map((letter, i) => (
              <span
                key={i}
                className={`motion-safe:animate-revolve-letter absolute font-bold text-gold ${
                  i === 0 ? 'opacity-100' : 'opacity-0'
                }`}
                style={{ fontSize: '24px', animationDelay: `${(i - 0.5) * STEP_MS}ms` }}
              >
                {letter}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 阶段点 */}
      <div className='flex items-center gap-2'>
        {STAGE_ORDER.map((_, i) => {
          const reached = i <= idx;
          const current = i === idx;
          return (
            <div
              key={i}
              className={`h-2 w-2 rounded-full transition-all duration-200 ease-out ${
                reached ? 'bg-gold' : 'bg-white/15'
              } ${current ? 'scale-150' : ''}`}
            />
          );
        })}
      </div>

      {/* 进度条 */}
      <div className='h-[3px] w-48 overflow-hidden rounded-full bg-white/10'>
        <div
          className='h-full rounded-full bg-gold'
          style={{
            width: `${progress}%`,
            transition: 'width 700ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </div>

      {/* 提示文案 */}
      <p className='text-sm text-ink-secondary'>{message}</p>
    </div>
  );
}
