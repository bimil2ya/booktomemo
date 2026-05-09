'use client';

import React from 'react';
import { Library, Trash2, List, LayoutGrid, ChevronUp, ChevronDown } from 'lucide-react';
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
}

const LibrarySortFilters: React.FC<LibrarySortFiltersProps> = ({
  savedBooksCount, selectedIdsCount, onToggleSelectAll, onDeleteSelected,
  viewMode, setViewMode, sortColumn, sortOrder, onToggleSort
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
      
      <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar">
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
