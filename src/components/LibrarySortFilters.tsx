'use client';

import React from 'react';
import { Library, Trash2, List, LayoutGrid, ChevronUp, ChevronDown, Search, X } from 'lucide-react';
import { SortColumn, SortOrder } from '@/types';

interface LibrarySortFiltersProps {
  savedBooksCount: number;
  selectedIdsCount: number;
  onToggleSelectAll: () => void;
  onDeleteSelected: () => void;
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  sortColumn: SortColumn;
  sortOrder: SortOrder;
  onToggleSort: (column: SortColumn) => void;
  libSearchQuery: string;
  setLibSearchQuery: (val: string) => void;
}

const LibrarySortFilters: React.FC<LibrarySortFiltersProps> = ({
  savedBooksCount, selectedIdsCount, onToggleSelectAll, onDeleteSelected,
  viewMode, setViewMode, sortColumn, sortOrder, onToggleSort,
  libSearchQuery, setLibSearchQuery
}) => {
  return (
    <div className="space-y-6 pt-4">
      <header className="flex items-center justify-between">
        <h2 className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          <Library className="w-8 h-8 text-purple-600" />내 보관함
        </h2>
        <div className="flex items-center gap-2">
          {savedBooksCount > 0 && (
            <button 
              onClick={onToggleSelectAll}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${selectedIdsCount === savedBooksCount ? 'bg-zinc-900 text-white' : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900'}`}
            >
              {selectedIdsCount === savedBooksCount ? '전체 해제' : '전체 선택'}
            </button>
          )}
          {selectedIdsCount > 0 && (
            <button 
              onClick={onDeleteSelected}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-xl text-xs font-bold transition-all hover:bg-red-100"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {selectedIdsCount}개 삭제
            </button>
          )}
          <button 
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-500 hover:text-purple-600 transition-all"
          >
            {viewMode === 'grid' ? <List className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* 보관함 내 실시간 검색 입력창 */}
      <div className="relative group">
        <input 
          type="text"
          value={libSearchQuery}
          onChange={(e) => setLibSearchQuery(e.target.value)}
          placeholder="보관함에서 책 찾기 (제목, 저자, 메모...)"
          className="w-full pl-10 pr-10 py-3 bg-zinc-100 dark:bg-zinc-800/50 border-none rounded-2xl text-base sm:text-sm focus:ring-2 focus:ring-purple-500/50 transition-all placeholder:text-sm"
        />
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-purple-500 transition-colors" />
        
        {libSearchQuery && (
          <button 
            onClick={() => setLibSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar border-b border-zinc-100 dark:border-zinc-800">
        <button onClick={() => onToggleSort('created_at')} className={`flex-none px-3 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1 ${sortColumn === 'created_at' ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500'}`}>
          저장일 {sortColumn === 'created_at' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>)}
        </button>
        <button onClick={() => onToggleSort('title')} className={`flex-none px-3 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1 ${sortColumn === 'title' ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500'}`}>
          제목 {sortColumn === 'title' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>)}
        </button>
        <button onClick={() => onToggleSort('authors')} className={`flex-none px-3 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1 ${sortColumn === 'authors' ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500'}`}>
          저자 {sortColumn === 'authors' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>)}
        </button>
      </div>
    </div>
  );
};

export default LibrarySortFilters;
