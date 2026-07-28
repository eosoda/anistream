'use client';

import React, { useState, ReactNode } from 'react';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  delay?: number;
}

export function Tooltip({
  content,
  children,
  position = 'top',
  className = '',
  delay = 200,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

  if (!content) return <>{children}</>;

  const handleMouseEnter = () => {
    const timeout = setTimeout(() => {
      setIsVisible(true);
    }, delay);
    setTimer(timeout);
  };

  const handleMouseLeave = () => {
    if (timer) clearTimeout(timer);
    setIsVisible(false);
  };

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-neutral-800 border-x-transparent border-b-transparent border-t-4 border-x-4',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-neutral-800 border-x-transparent border-a-transparent border-b-4 border-x-4',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-neutral-800 border-y-transparent border-r-transparent border-l-4 border-y-4',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-neutral-800 border-y-transparent border-l-transparent border-r-4 border-y-4',
  };

  return (
    <div
      className={`relative inline-flex ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {children}

      {isVisible && (
        <div
          role="tooltip"
          className={`absolute z-50 pointer-events-none whitespace-nowrap rounded-lg bg-neutral-900 border border-white/15 px-2.5 py-1 text-[11px] font-bold text-gray-100 shadow-xl shadow-black/60 transition-all duration-200 animate-fade-in ${positionClasses[position]}`}
        >
          {content}
          <div className={`absolute w-0 h-0 ${arrowClasses[position]}`} />
        </div>
      )}
    </div>
  );
}
