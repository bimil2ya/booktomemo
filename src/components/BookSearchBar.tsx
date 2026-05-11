'use client';

import React, { RefObject } from 'react';
import { Search, X } from 'lucide-react';

interface BookSearchBarProps {
  query: string;
  setQuery: (val: string) => void;
  onSearch: (e: React.FormEvent) => void;
  loading: boolean;
  searchWithin: boolean;
  setSearchWithin: (val: boolean) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
}

const BookSearchBar: React.FC<BookSearchBarProps> = ({
  query, setQuery, onSearch, loading, searchWithin, setSearchWithin, inputRef
}) => {
  return (
    <div className="space-y-8 max-w-lg mx-auto">
      <header className="text-center space-y-2 pt-4">
        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">읽고픈 책들</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">
          검색하고 클라우드 서재에 저장
        </p>
      </header>

      <form onSubmit={onSearch} className="flex flex-col gap-3">
        <div className="relative group">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="책 제목, 저자 입력..."
            className="w-full pl-12 pr-12 py-4 rounded-2xl border-none bg-white dark:bg-zinc-900 shadow-xl shadow-zinc-200/50 dark:shadow-none text-lg text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-purple-500"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
          
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {query && (
              <button 
                type="button" 
                onClick={() => { setQuery(''); inputRef?.current?.focus(); }} 
                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-end gap-2 px-1">
          <input
            type="checkbox"
            id="searchWithin"
            checked={searchWithin}
            onChange={(e) => setSearchWithin(e.target.checked)}
            className="w-4 h-4 text-purple-600 rounded-sm border-zinc-300 focus:ring-purple-500 cursor-pointer"
          />
          <label htmlFor="searchWithin" className="text-xs font-bold text-zinc-500 dark:text-zinc-400 cursor-pointer select-none">
            결과내 재검색
          </label>
        </div>

        <button type="submit" disabled={loading || !query} className="w-full py-4 text-white rounded-2xl font-bold text-lg shadow-lg bg-purple-600 hover:bg-purple-700 transition-colors">
          {loading ? '검색 중...' : '검색 시작'}
        </button>
      </form>
    </div>
  );
};

export default BookSearchBar;
