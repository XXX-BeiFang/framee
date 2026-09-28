'use client';

import { ChevronUp } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useSite } from './SiteProvider';
import { useFloatingHeaderVisibility } from '@/lib/useFloatingHeaderVisibility';

export function BackToTopButton() {
  const { mainContainerRef } = useSite();
  const isScrollingUp = useFloatingHeaderVisibility(mainContainerRef || null);
  const [isVisible, setIsVisible] = useState(false);

  const handleScroll = useCallback(() => {
    if (mainContainerRef && mainContainerRef.current) {
      const { scrollTop } = mainContainerRef.current;
      // When scrolled down more than 400px, show the button
      setIsVisible(scrollTop > 400 && isScrollingUp);
    }
  }, [mainContainerRef, isScrollingUp]);

  useEffect(() => {
    const container = mainContainerRef?.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      // Initial check
      handleScroll();
    }

    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [mainContainerRef, handleScroll]);

  const scrollToTop = () => {
    if (mainContainerRef && mainContainerRef.current) {
      mainContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  };

  return (
    <button
      onClick={scrollToTop}
      aria-label='返回顶部'
      className={`fixed bottom-6 right-6 z-[999] w-12 h-12 flex items-center justify-center rounded-full
        bg-black/60 backdrop-blur-md border border-white/10 text-ink shadow-lg
        hover:bg-gold hover:text-black hover:border-gold hover:scale-105
        transition-all duration-300 ease-in-out ${
          isVisible
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
    >
      <ChevronUp className='h-5 w-5' />
    </button>
  );
}
