'use client';

import React, { useState } from 'react';
import Image, { ImageProps } from 'next/image';

interface SafeImageProps extends Omit<ImageProps, 'src'> {
  src: string | null | undefined;
  fallbackSrc?: string | null;
  animeId?: number;
}

const ANILIST_COVER_MAP: Record<number, string> = {
  16498: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx16498-buvcRTBx4NSm.jpg',
  52299: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx151807-it355ZgzquUd.png',
  52991: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx154587-qQTzQnEJJ3oB.jpg',
  5114: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx5114-nSWCgQlmOMtj.jpg',
  38000: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx101922-WBsBl0ClmgYL.jpg',
  40748: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx113415-LHBAeoZDIsnF.jpg',
  44511: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx127230-DdP4vAdssLoz.png',
  50265: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx140960-Kb6R5nYQfjmP.jpg',
  21: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx21-ELSYx3yMPcKM.jpg',
  52034: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx150672-WqmmwZ4nMzAy.png',
  31964: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx21459-nYh85uj2Fuwr.jpg',
  269: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx269-d2GmRkJbMopq.png',
  9253: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx9253-tIUXF2gfU8Sg.jpg',
  37521: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx101348-2fhDFPCuMNiz.jpg',
  30276: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx21087-B5DHjqZ3kW4b.jpg',
};

function getAnimePosterSvgFallback(title?: string | React.ReactNode): string {
  const displayTitle = typeof title === 'string' && title.trim() ? title.trim() : 'Anime';
  const safeTitle = displayTitle
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#181824" />
        <stop offset="50%" stop-color="#12131C" />
        <stop offset="100%" stop-color="#090A0F" />
      </linearGradient>
      <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#FF6B00" />
        <stop offset="100%" stop-color="#FF8800" />
      </linearGradient>
    </defs>
    <rect width="300" height="450" fill="url(#bg)" />
    <circle cx="150" cy="180" r="48" fill="#FF6B00" fill-opacity="0.12" stroke="#FF6B00" stroke-width="2" stroke-opacity="0.4" />
    <polygon points="142,162 168,180 142,198" fill="#FF6B00" />
    <rect x="30" y="310" width="240" height="3" fill="url(#accent)" rx="1.5" />
    <text x="150" y="348" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="700" fill="#FFFFFF" text-anchor="middle">
      ${safeTitle.length > 25 ? safeTitle.substring(0, 23) + '...' : safeTitle}
    </text>
    <text x="150" y="372" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="500" fill="#FF6B00" text-anchor="middle">
      AnimesBR
    </text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function cleanImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  let cleaned = url.trim();
  if (cleaned.includes('cdn.myanimelist.net')) {
    if (cleaned.endsWith('l.jpg')) {
      cleaned = cleaned.slice(0, -5) + '.jpg';
    } else if (cleaned.endsWith('l.webp')) {
      cleaned = cleaned.slice(0, -6) + '.webp';
    }
  }
  return cleaned;
}

export function SafeImage({
  src,
  fallbackSrc,
  alt,
  animeId,
  className,
  unoptimized,
  ...props
}: SafeImageProps) {
  const aniListCover = animeId ? ANILIST_COVER_MAP[animeId] : undefined;
  const svgFallback = getAnimePosterSvgFallback(alt);

  const cleanedSrc = cleanImageUrl(src);
  const cleanedFallback = cleanImageUrl(fallbackSrc);

  const initialSrc = cleanedSrc || aniListCover || cleanedFallback || svgFallback;

  const [prevSrc, setPrevSrc] = useState<string | null | undefined>(src);
  const [currentSrc, setCurrentSrc] = useState<string>(initialSrc);
  const [errorCount, setErrorCount] = useState<number>(0);

  if (prevSrc !== src) {
    setPrevSrc(src);
    setCurrentSrc(cleanedSrc || aniListCover || cleanedFallback || svgFallback);
    setErrorCount(0);
  }

  const handleError = () => {
    if (errorCount === 0) {
      // Step 1: If URL is webp, try converting to .jpg
      if (typeof currentSrc === 'string' && currentSrc.endsWith('.webp')) {
        const jpgUrl = currentSrc.slice(0, -5) + '.jpg';
        setCurrentSrc(jpgUrl);
        setErrorCount(1);
        return;
      }

      // Step 2: Try AniList cover if available
      if (aniListCover && aniListCover !== currentSrc) {
        setCurrentSrc(aniListCover);
        setErrorCount(1);
        return;
      }

      // Step 3: Try fallbackSrc if provided
      if (cleanedFallback && cleanedFallback !== currentSrc) {
        setCurrentSrc(cleanedFallback);
        setErrorCount(1);
        return;
      }

      // Step 4: Anime poster SVG fallback
      setCurrentSrc(svgFallback);
      setErrorCount(2);
    } else if (errorCount === 1) {
      if (aniListCover && aniListCover !== currentSrc) {
        setCurrentSrc(aniListCover);
        setErrorCount(2);
        return;
      }
      if (cleanedFallback && cleanedFallback !== currentSrc) {
        setCurrentSrc(cleanedFallback);
        setErrorCount(2);
        return;
      }
      setCurrentSrc(svgFallback);
      setErrorCount(2);
    } else {
      setCurrentSrc(svgFallback);
    }
  };

  const isExternalCdn =
    typeof currentSrc === 'string' &&
    (currentSrc.includes('jikan.moe') ||
      currentSrc.includes('myanimelist') ||
      currentSrc.includes('anilist') ||
      currentSrc.includes('kitsu'));

  return (
    <Image
      {...props}
      src={currentSrc}
      alt={alt || 'Anime Cover'}
      className={className}
      unoptimized={unoptimized !== undefined ? unoptimized : isExternalCdn}
      referrerPolicy="no-referrer"
      draggable={false}
      onError={handleError}
    />
  );
}



