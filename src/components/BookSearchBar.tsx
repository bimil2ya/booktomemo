'use client';

import React, { RefObject } from 'react';
import { Search, Camera, X } from 'lucide-react';

interface BookSearchBarProps {
  query: string;
  setQuery: (val: string) => void;
  onSearch: (e: React.FormEvent) => void;
  loading: boolean;
  ocrLoading: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  saveMode: 'shortcut' | 'native';
  inputRef?: RefObject<HTMLInputElement | null>;
}

const BookSearchBar: React.FC<BookSearchBarProps> = ({
  query, setQuery, onSearch, loading, ocrLoading, fileInputRef, onPhotoUpload, saveMode, inputRef
}) => {
  return (
    <div className="space-y-8 max-w-lg mx-auto">
      <header className="text-center space-y-2 pt-4">
        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">읽고픈 책들</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">
          {saveMode === 'shortcut' ? '검색하고 애플 메모로 전송' : '검색하고 클라우드 서재에 저장'}
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
            className="w-full pl-12 pr-24 py-4 rounded-2xl border-none bg-white dark:bg-zinc-900 shadow-xl shadow-zinc-200/50 dark:shadow-none text-lg text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-purple-500"
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
            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-zinc-500 hover:text-purple-500 transition-colors">
              {ocrLoading ? <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /> : <Camera className="w-5 h-5" />}
            </button>
          </div>
        </div>
        <button type="submit" disabled={loading || !query} className={`w-full py-4 text-white rounded-2xl font-bold text-lg shadow-lg ${saveMode === 'shortcut' ? 'bg-blue-600' : 'bg-purple-600'}`}>
          {loading ? '검색 중...' : '검색 시작'}
        </button>
      </form>
      <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={onPhotoUpload} className="hidden" />
    </div>
  );
};

export default BookSearchBar;
