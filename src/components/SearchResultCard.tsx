'use client';

import React from 'react';
import { Book } from '@/types';
import BookThumbnail from './BookThumbnail';

interface SearchResultCardProps {
  book: Book;
  onSelect: () => void;
  onSave: (book: Book) => void;
  savingIsbn: string | null;
  saveMode: 'shortcut' | 'native';
  onAuthorClick?: (author: string) => void;
}

const SearchResultCard: React.FC<SearchResultCardProps> = ({
  book, onSelect, onSave, savingIsbn, saveMode, onAuthorClick
}) => {
  return (
    <div 
      onClick={onSelect} 
      className="flex gap-4 p-3 bg-white dark:bg-zinc-900 rounded-[1.5rem] border border-zinc-100 dark:border-zinc-800 shadow-sm cursor-pointer hover:border-purple-200 dark:hover:border-purple-900/50 transition-all overflow-hidden"
    >
      <BookThumbnail src={book.thumbnail} title={book.title} className="w-16 h-24 rounded-xl shadow-xs flex-none" />
      <div className="flex-1 min-w-0 flex flex-col justify-center overflow-hidden">
        <div className="space-y-0.5 min-w-0">
          <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-50 truncate leading-tight">{book.title}</h3>
          <div className="flex flex-wrap gap-x-1">
            {book.authors.map((author, idx) => (
              <span 
                key={idx}
                onClick={(e) => { e.stopPropagation(); onAuthorClick?.(author); }}
                className="text-purple-600 text-[11px] font-bold hover:underline cursor-pointer"
              >
                {author}{idx < book.authors.length - 1 ? ',' : ''}
              </span>
            ))}
          </div>
          <p className="text-zinc-400 text-[9px] truncate">{book.publisher}</p>
          <p className="text-zinc-500 text-[11px] line-clamp-1 leading-relaxed break-all">{book.contents}</p>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onSave(book); }} 
          disabled={savingIsbn === book.isbn}
          className={`mt-2 w-full py-1.5 text-white rounded-lg text-[11px] font-bold transition-all ${savingIsbn === book.isbn ? 'bg-zinc-400 animate-pulse' : (saveMode === 'shortcut' ? 'bg-zinc-900' : 'bg-purple-600')}`}
        >
          {savingIsbn === book.isbn ? '저장 중...' : (saveMode === 'shortcut' ? '애플 메모로 보내기' : '서재에 저장')}
        </button>
      </div>
    </div>
  );
};

export default SearchResultCard;
