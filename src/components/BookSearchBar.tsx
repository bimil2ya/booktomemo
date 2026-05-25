'use client';

import React, { useRef, useEffect } from 'react';
import { Search, X, Undo2, Loader2, ChevronRight } from 'lucide-react';
import { Book } from '@/types';
import BookThumbnail from './BookThumbnail';

interface BookSearchBarProps {
  query: string;
  setQuery: (val: string) => void;
  onSearch: (e: React.FormEvent) => void;
  loading: boolean;
  searchWithin: boolean;
  setSearchWithin: (val: boolean) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  lastPerformedQuery?: string;
  totalSearchCount?: number;
  onBack?: () => void;
  canGoBack?: boolean;
  // 자동완성 props
  onQueryChange?: (value: string) => void;
  suggestions?: Book[];
  showSuggestions?: boolean;
  suggestionsLoading?: boolean;
  suggestionsTotal?: number;
  onSuggestionSelect?: (book: Book) => void;
  onFullSearch?: () => void;
  onSuggestionsClose?: () => void;
}

const BookSearchBar: React.FC<BookSearchBarProps> = ({
  query, setQuery, onSearch, loading, searchWithin, setSearchWithin, inputRef,
  lastPerformedQuery, totalSearchCount, onBack, canGoBack,
  onQueryChange, suggestions = [], showSuggestions = false,
  suggestionsLoading = false, suggestionsTotal = 0,
  onSuggestionSelect, onFullSearch, onSuggestionsClose,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        onSuggestionsClose?.();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onSuggestionsClose]);

  // ESC 키로 드롭다운 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSuggestionsClose?.();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onSuggestionsClose]);

  const hasDropdown = showSuggestions && (suggestionsLoading || suggestions.length > 0);

  return (
    <div className="max-w-lg mx-auto">
      <header className="text-center space-y-1 pt-2 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">읽고픈 책들</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-xs">
          검색하고 클라우드 서재에 저장
        </p>
      </header>

      <form onSubmit={onSearch} className="flex flex-col gap-3">
        <div className="space-y-1.5" ref={wrapperRef}>
          {/* 검색 입력창 + 드롭다운 컨테이너 */}
          <div className="relative group">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                onQueryChange?.(e.target.value);
              }}
              placeholder="책 제목, 저자 입력..."
              className="w-full pl-11 pr-11 py-3.5 rounded-2xl border-none bg-white dark:bg-zinc-900 shadow-lg shadow-zinc-200/50 dark:shadow-none text-base text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-purple-500 transition-all"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-4.5 h-4.5" />

            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    onQueryChange?.('');
                    inputRef?.current?.focus();
                  }}
                  className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              )}
            </div>

            {/* 자동완성 드롭다운 */}
            {hasDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
                {/* 로딩 스켈레톤 */}
                {suggestionsLoading && suggestions.length === 0 && (
                  <div className="px-4 py-3 space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3 animate-pulse">
                        <div className="w-8 h-11 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex-none" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-3/4" />
                          <div className="h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 검색 결과 목록 */}
                {suggestions.map((book, idx) => (
                  <button
                    key={book.isbn || idx}
                    type="button"
                    onClick={() => onSuggestionSelect?.(book)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left border-b border-zinc-50 dark:border-zinc-800/50 last:border-b-0"
                  >
                    <div className="flex-none">
                      <BookThumbnail
                        src={book.thumbnail}
                        title={book.title}
                        className="w-8 h-11 rounded-lg shadow-xs"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50 truncate leading-tight">
                        {book.title}
                      </p>
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                        {book.authors?.join(', ')} · {book.publisher}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-300 flex-none" />
                  </button>
                ))}

                {/* 전체 결과 보기 버튼 */}
                {suggestions.length > 0 && (
                  <button
                    type="button"
                    onClick={onFullSearch}
                    className="w-full px-4 py-3 flex items-center justify-between bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                  >
                    <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                      전체 결과 보기
                      {suggestionsTotal > 0 && <span className="ml-1 text-purple-400 dark:text-purple-500">({suggestionsTotal.toLocaleString()}건)</span>}
                    </span>
                    <Loader2 className={`w-3.5 h-3.5 text-purple-400 ${suggestionsLoading ? 'animate-spin' : 'hidden'}`} />
                    <ChevronRight className={`w-4 h-4 text-purple-400 ${suggestionsLoading ? 'hidden' : ''}`} />
                  </button>
                )}
              </div>
            )}
          </div>

          {!loading && lastPerformedQuery && (
            <div className="px-1 flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
              <div className="text-zinc-500 dark:text-zinc-400 text-[10.5px] leading-relaxed">
                요청하신 <span className="bg-yellow-100/80 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-500 px-0.5 font-bold rounded-sm">&apos;{lastPerformedQuery}&apos;</span> 에 대한 결과이며 총 <span className="text-purple-600 dark:text-purple-400 font-bold">{totalSearchCount?.toLocaleString()}건</span>이 검색되었습니다.
              </div>
              {canGoBack && onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="flex-none flex items-center gap-1 px-2 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-500 dark:text-zinc-400 text-[9px] font-bold hover:text-purple-600 transition-colors shadow-sm"
                >
                  <Undo2 className="w-3 h-3" /> 이전 검색
                </button>
              )}
            </div>
          )}
        </div>

        <div className="relative flex items-center">
          <button
            type="submit"
            disabled={loading || !query}
            className="w-full py-4 text-white rounded-2xl font-bold text-base shadow-md bg-purple-600 hover:bg-purple-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
          >
            {loading ? '검색 중...' : '검색 시작'}
          </button>

          <div
            className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 cursor-pointer select-none py-2"
            onClick={() => setSearchWithin(!searchWithin)}
          >
            <input
              type="checkbox"
              id="searchWithin"
              checked={searchWithin}
              onChange={(e) => {
                e.stopPropagation();
                setSearchWithin(e.target.checked);
              }}
              className="w-3.5 h-3.5 accent-white rounded-sm border-none cursor-pointer"
            />
            <label
              htmlFor="searchWithin"
              className="text-[10px] font-bold text-white/90 cursor-pointer whitespace-nowrap"
              onClick={(e) => e.stopPropagation()}
            >
              결과내 재검색
            </label>
          </div>
        </div>
      </form>
    </div>
  );
};

export default BookSearchBar;
