'use client';

import React from 'react';
import { Search, Library, BarChart2 } from 'lucide-react';
import { useLibrary } from '@/context/LibraryContext';

interface BottomNavProps {
  activeTab: 'search' | 'library' | 'stats';
  setActiveTab: (tab: 'search' | 'library' | 'stats') => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const { savedBooks } = useLibrary();
  const savedBooksCount = savedBooks.length;
  const readBooksCount = savedBooks.filter(b => !!b.read_at).length;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-t border-zinc-200 dark:border-zinc-800 safe-area-pb z-50">
      <div className="max-w-md mx-auto flex justify-around py-3 px-6">
        <button
          onClick={() => setActiveTab('search')}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'search' ? 'text-purple-600 scale-110' : 'text-zinc-400'}`}
        >
          <Search className="w-6 h-6" />
          <span className="text-[10px] font-bold">검색</span>
        </button>
        <button
          onClick={() => setActiveTab('library')}
          className={`flex flex-col items-center gap-1 transition-all relative ${activeTab === 'library' ? 'text-purple-600 scale-110' : 'text-zinc-400'}`}
        >
          <Library className="w-6 h-6" />
          <span className="text-[10px] font-bold">내 서재</span>
          {savedBooksCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] flex items-center justify-center rounded-full font-bold border-2 border-white dark:border-zinc-900">
              {savedBooksCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex flex-col items-center gap-1 transition-all relative ${activeTab === 'stats' ? 'text-purple-600 scale-110' : 'text-zinc-400'}`}
        >
          <BarChart2 className="w-6 h-6" />
          <span className="text-[10px] font-bold">통계</span>
          {readBooksCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white text-[8px] flex items-center justify-center rounded-full font-bold border-2 border-white dark:border-zinc-900">
              {readBooksCount}
            </span>
          )}
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;
