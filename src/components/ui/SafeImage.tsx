'use client';

import React, { useState } from 'react';
import Image, { ImageProps } from 'next/image';

interface SafeImageProps extends Omit<ImageProps, 'src'> {
  src: string | null | undefined;
  fallbackSrc?: string | null;
  animeId?: number;
}

function getAnimePosterSvgFallback(title?: string | React.ReactNode): string {
  const displayTitle = typeof title === 'string' && title.trim() ? title.trim() : 'Anime';
  const safeTitle = displayTitle.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450">
    <rect width="300" height="450" fill="#0D0E15" />
    <circle cx="150" cy="180" r="48" fill="#FF6B00" fill-opacity="0.12" stroke="#FF6B00" stroke-width="2" stroke-opacity="0.4" />
    <polygon points="142,162 168,180 142,198" fill="#FF6B00" />
    <rect x="30" y="310" width="240" height="3" fill="#FF6B00" rx="1.5" />
    <text x="150" y="348" font-family="system-ui, sans-serif" font-size="16" font-weight="700" fill="#FFFFFF" text-anchor="middle">${safeTitle.length > 25 ? `${safeTitle.substring(0, 23)}...` : safeTitle}</text>
    <text x="150" y="372" font-family="system-ui, sans-serif" font-size="12" font-weight="500" fill="#FF6B00" text-anchor="middle">AniStream</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function cleanImageUrl(url: string | null | undefined): string {
  return url?.trim() || '';
}

export function SafeImage({ src, fallbackSrc, alt, className, unoptimized, ...props }: SafeImageProps) {
  const getSvgFallback = () => getAnimePosterSvgFallback(alt);
  const cleanedSrc = cleanImageUrl(src);
  const cleanedFallback = cleanImageUrl(fallbackSrc);
  const initialSrc = cleanedSrc || cleanedFallback || getSvgFallback();
  const [prevSrc, setPrevSrc] = useState<string | null | undefined>(src);
  const [currentSrc, setCurrentSrc] = useState<string>(initialSrc);
  const [errorCount, setErrorCount] = useState(0);

  if (prevSrc !== src) {
    setPrevSrc(src);
    setCurrentSrc(cleanedSrc || cleanedFallback || getSvgFallback());
    setErrorCount(0);
  }

  const handleError = () => {
    if (errorCount === 0 && cleanedFallback && cleanedFallback !== currentSrc) {
      setCurrentSrc(cleanedFallback);
      setErrorCount(1);
      return;
    }
    setCurrentSrc(getSvgFallback());
    setErrorCount(2);
  };

  return (
    <Image
      {...props}
      src={currentSrc}
      alt={alt || 'Anime Cover'}
      className={className}
      unoptimized={unoptimized}
      referrerPolicy="no-referrer"
      draggable={false}
      onError={handleError}
    />
  );
}
