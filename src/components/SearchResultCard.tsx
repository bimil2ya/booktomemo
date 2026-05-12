'use client';

import React from 'react';
import { Book } from '@/types';
import BookThumbnail from './BookThumbnail';
import { Check } from 'lucide-react';

interface SearchResultCardProps {
  book: Book;
  onSelect: () => void;
  onSave: (book: Book) => void;
  savingIsbn: string | null;
  onAuthorClick?: (author: string) => void;
  isSaved?: boolean;
}

const SearchResultCard: React.FC<SearchResultCardProps> = ({
  book, onSelect, onSave, savingIsbn, onAuthorClick, isSaved = false
}) => {
  return (
    <div 
      onClick={onSelect} 
      className={`flex gap-4 p-3 bg-white dark:bg-zinc-900 rounded-[1.5rem] border shadow-sm cursor-pointer transition-all overflow-hidden ${isSaved ? 'border-purple-200 dark:border-purple-900/30 bg-purple-50/30 dark:bg-purple-900/5' : 'border-zinc-100 dark:border-zinc-800 hover:border-purple-200 dark:hover:border-purple-900/50'}`}
    >
      <BookThumbnail src={book.thumbnail} title={book.title} className="w-16 h-24 rounded-xl shadow-xs flex-none" />
      <div className="flex-1 min-w-0 flex flex-col justify-center overflow-hidden">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-50 truncate leading-tight flex-1">{book.title}</h3>
            {isSaved && (
              <div className="flex-none bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 p-1 rounded-full">
                <Check className="w-3 h-3" />
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-x-1">
            {book.authors && book.authors.length > 0 ? (
              book.authors.map((author, idx) => (
                <span 
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); onAuthorClick?.(author); }}
                  className="text-purple-600 text-[11px] font-bold hover:underline cursor-pointer"
                >
                  {author}{idx < book.authors.length - 1 ? ',' : ''}
                </span>
              ))
            ) : (
              <span className="text-zinc-400 text-[10px]">저자 정보 없음</span>
            )}
          </div>
          <p className="text-zinc-400 text-[9px] truncate">{book.publisher}</p>
          <p className="text-zinc-500 text-[11px] line-clamp-1 leading-relaxed break-all">{book.contents}</p>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); if(!isSaved) onSave(book); }} 
          disabled={savingIsbn === book.isbn || isSaved}
          className={`mt-2 w-full py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 ${
            savingIsbn === book.isbn 
              ? 'bg-zinc-100 text-zinc-400 animate-pulse' 
              : isSaved 
                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-default' 
                : 'bg-purple-600 text-white shadow-sm shadow-purple-500/20 active:scale-[0.98]'
          }`}
        >
          {savingIsbn === book.isbn ? (
            '저장 중...'
          ) : isSaved ? (
            <>보관함에 있음</>
          ) : (
            '서재에 저장'
          )}
        </button>
      </div>
    </div>
  );
};

export default SearchResultCard;
