'use client';

import React, { useState } from 'react';
import Image, { ImageProps } from 'next/image';

export interface SafeImageProps extends Omit<ImageProps, 'src'> {
  src: string | null | undefined;
  fallbackSrc?: string | null;
  animeId?: number;
  showSkeleton?: boolean;
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

export function SafeImage({
  src,
  fallbackSrc,
  alt,
  className,
  unoptimized,
  onLoad,
  onError,
  showSkeleton = true,
  priority,
  loading: requestedLoading,
  ...props
}: SafeImageProps) {
  const getSvgFallback = () => getAnimePosterSvgFallback(alt);
  const cleanedSrc = cleanImageUrl(src);
  const cleanedFallback = cleanImageUrl(fallbackSrc);
  const initialSrc = cleanedSrc || cleanedFallback || getSvgFallback();
  const sourceKey = `${src ?? ''}\u0000${fallbackSrc ?? ''}\u0000${alt ?? ''}`;
  const [imageState, setImageState] = useState({ sourceKey, currentSrc: initialSrc, errorCount: 0, isLoaded: false });

  // Derive the initial state for a new URL during render. This avoids a
  // second render/effect cycle while still resetting skeleton/fallback state
  // when a card reuses the component with another image.
  const isCurrentSource = imageState.sourceKey === sourceKey;
  const currentSrc = isCurrentSource ? imageState.currentSrc : initialSrc;
  const errorCount = isCurrentSource ? imageState.errorCount : 0;
  const isLoaded = isCurrentSource && imageState.isLoaded;

  const handleLoad: NonNullable<ImageProps['onLoad']> = (event) => {
    setImageState({ sourceKey, currentSrc, errorCount, isLoaded: true });
    onLoad?.(event);
  };

  const handleError: NonNullable<ImageProps['onError']> = (event) => {
    onError?.(event);

    if (errorCount === 0 && cleanedFallback && cleanedFallback !== currentSrc) {
      setImageState({ sourceKey, currentSrc: cleanedFallback, errorCount: 1, isLoaded: false });
      return;
    }

    setImageState({ sourceKey, currentSrc: getSvgFallback(), errorCount: 2, isLoaded: false });
  };

  const imageClassName = [
    className,
    ...(showSkeleton && props.fill
      ? ['transition-opacity duration-300', isLoaded ? 'opacity-100' : 'opacity-0']
      : []),
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      {showSkeleton && props.fill && (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 bg-white/[0.06] animate-pulse transition-opacity duration-300 ${isLoaded ? 'opacity-0' : 'opacity-100'}`}
        />
      )}
      <Image
        {...props}
        src={currentSrc}
        alt={alt || 'Anime Cover'}
        className={imageClassName}
        priority={priority}
        loading={priority ? undefined : requestedLoading ?? 'lazy'}
        fetchPriority={priority ? 'high' : props.fetchPriority}
        unoptimized={unoptimized}
        referrerPolicy="no-referrer"
        draggable={false}
        onLoad={handleLoad}
        onError={handleError}
      />
    </>
  );
}
