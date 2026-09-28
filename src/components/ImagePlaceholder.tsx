// 图片占位符组件 - 骨架屏（影院深色主题）
const ImagePlaceholder = ({ aspectRatio }: { aspectRatio: string }) => (
  <div
    className={`w-full ${aspectRatio} rounded-xl`}
    style={{
      background:
        'linear-gradient(90deg, var(--skeleton-color) 25%, var(--skeleton-highlight) 50%, var(--skeleton-color) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shine 1.5s infinite',
    }}
  >
    <style>{`
      @keyframes shine {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      
      /* 影院深色主题骨架配色 */
      :root {
        --skeleton-color: #161822;
        --skeleton-highlight: #1E2130;
      }
      
      .dark {
        --skeleton-color: #161822;
        --skeleton-highlight: #1E2130;
      }
    `}</style>
  </div>
);

export { ImagePlaceholder };
