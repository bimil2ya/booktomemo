'use client';

import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';
import Image from 'next/image';

interface BookThumbnailProps {
  src: string;
  title: string;
  className?: string;
  isContain?: boolean;
  noOverflow?: boolean;
}

const BookThumbnail = ({ src, title, className = '', isContain, noOverflow }: BookThumbnailProps) => {
  const [isImgError, setIsImgError] = useState(false);
  const [isImgLoading, setIsImgLoading] = useState(true);

  // 카카오/다음 이미지 서버에 대해 HTTPS 강제 적용 (Mixed Content 방지)
  const safeSrc = React.useMemo(() => {
    if (!src) return '';
    if (src.includes('kakaocdn.net') || src.includes('daumcdn.net')) {
      return src.replace('http://', 'https://');
    }
    return src;
  }, [src]);

  return (
    <div className={`relative bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center ${noOverflow ? '' : 'overflow-hidden'} ${className}`}>
      {isImgLoading && !isImgError && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 animate-pulse z-20">
          <BookOpen className="w-6 h-6 text-zinc-200" />
        </div>
      )}
      {!src || isImgError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-gradient-to-br from-purple-100 to-zinc-100 dark:from-purple-900/20 dark:to-zinc-900 border border-purple-50 dark:border-purple-900/30">
          <BookOpen className="w-6 h-6 text-purple-300 dark:text-purple-700 mb-1" />
          <span className="text-[10px] text-purple-900/40 dark:text-purple-100/30 font-black leading-tight line-clamp-3 uppercase tracking-tighter">
            {title}
          </span>
          <div className="absolute bottom-2 left-0 right-0 h-1 bg-purple-200/50 dark:bg-purple-900/50" />
        </div>
      ) : (
        <Image 
          src={safeSrc} 
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className={`transition-opacity duration-300 ${isContain ? 'object-contain' : 'object-cover'} ${isImgLoading ? 'opacity-0' : 'opacity-100'}`}
          onLoad={() => setIsImgLoading(false)}
          onError={() => {
            setIsImgError(true);
            setIsImgLoading(false);
          }}
        />
      )}
    </div>
  );
};

export default BookThumbnail;
