'use client';

import React from 'react';
import { LogOut } from 'lucide-react';
import { useLibrary } from '@/context/LibraryContext';

interface LibraryHeaderProps {
  version: string;
  onTestConnection: () => void;
}

const LibraryHeader: React.FC<LibraryHeaderProps> = ({
  version, onTestConnection
}) => {
  const { libraryName, logout } = useLibrary();

  const handleLogout = () => {
    if (confirm('서재에서 나가시겠습니까?')) {
      logout();
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 flex justify-between items-center">
      <div className="flex items-center gap-3 min-w-0">
        <button 
          onClick={onTestConnection}
          className="text-[10px] font-mono text-zinc-300 dark:text-zinc-700 hover:text-purple-500 transition-colors flex-none"
        >
          {version} [연결 확인]
        </button>
        {libraryName && (
          <div className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-[10px] font-bold text-zinc-500 truncate">
            {libraryName}의 서재
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 flex-none">
        <button onClick={handleLogout} className="p-2 text-zinc-400 hover:text-red-500 transition-colors">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default LibraryHeader;
