'use client';

import React, { useState } from 'react';
import { SavedBook } from '@/types';
import BookThumbnail from './BookThumbnail';
import { Trash2, Edit2, Check, X } from 'lucide-react';
import { updateBookAction } from '@/app/actions';
import { useLibrary } from '@/context/LibraryContext';
import { useToast } from '@/context/ToastContext';

interface LibraryBookCardProps {
  book: SavedBook;
  onSelect: () => void;
  onDelete: (id: number) => void;
  selectedIds: number[];
  onToggleSelect: (id: number) => void;
  swipingId: number | null;
  setSwipingId: (id: number | null) => void;
  touchStartX: React.MutableRefObject<number>;
  viewMode?: 'grid' | 'list';
}

const LibraryBookCard: React.FC<LibraryBookCardProps> = ({
  book, onSelect, onDelete,
  selectedIds, onToggleSelect, swipingId, setSwipingId, touchStartX, viewMode = 'grid'
}) => {
  const { libraryName, updateBookOptimistic } = useLibrary();
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<SavedBook>>({});

  const isSwiping = swipingId === book.id;
  const isSelected = selectedIds.includes(book.id!);

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditFormData(book);
    setIsEditing(true);
  };

  const handleSaveEdit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (book.id! < 0) {
      showToast('아직 서버에 저장 중인 책입니다. 잠시 후 다시 시도해 주세요.', 'info');
      return;
    }
    const originalData = { ...book };
    const cleanUpdateData = {
      title: editFormData.title,
      authors: editFormData.authors,
      publisher: editFormData.publisher,
      personal_memo: editFormData.personal_memo
    };
    updateBookOptimistic(book.id!, cleanUpdateData);
    setIsEditing(false);
    showToast('수정사항이 반영되었습니다.');
    try {
      const { error } = await updateBookAction(book.id!, cleanUpdateData, libraryName || '');
      if (error) throw new Error(error);
    } catch {
      updateBookOptimistic(book.id!, originalData);
      showToast('수정 중 오류가 발생했습니다. 원래대로 복구합니다.', 'error');
    }
  };

  const isGrid = viewMode === 'grid';

  return (
    <div 
      className='relative overflow-hidden group'
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
      }}
      onTouchMove={(e) => {
        const touchX = e.touches[0].clientX;
        const diff = touchStartX.current - touchX;
        if (diff > 50) setSwipingId(book.id!);
        if (diff < -50) setSwipingId(null);
      }}
    >
      <div className={'absolute inset-0 flex justify-end transition-opacity duration-300 ' + (isSwiping ? 'opacity-100' : 'opacity-0 pointer-events-none')}>
        <div className='flex flex-col w-1/2 h-full'>
          <button onClick={() => setSwipingId(null)} className='flex-1 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 font-bold text-sm border-b border-white/10'>취소</button>
          <button onClick={() => { onDelete(book.id!); setSwipingId(null); }} className='flex-1 bg-red-500 text-white font-bold text-sm'>삭제</button>
        </div>
      </div>

      <div 
        onClick={() => !isSwiping && !isEditing && onSelect()} 
        className={'flex flex-col transition-transform duration-300 cursor-pointer overflow-hidden h-full ' + (isSwiping ? '-translate-x-1/2' : 'translate-x-0') + ' ' + (isGrid ? 'bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-sm rounded-3xl' : 'bg-transparent border-none shadow-none')}
      >
        <div className={'flex gap-4 relative ' + (isGrid ? 'p-4' : 'py-3 px-1')}>
          {/* 목록형에서는 표지를 숨김 */}
          {isGrid && (
            <div className='relative flex-none'>
              <BookThumbnail src={book.thumbnail} title={book.title} className='w-20 h-28 rounded-xl shadow-xs' />
            </div>
          )}
          
          <div className='flex-1 min-w-0 flex flex-col justify-between overflow-hidden'>
            <div className='space-y-1 min-w-0'>
              <div className='flex items-start justify-between gap-2'>
                <div className='flex-1 min-w-0'>
                  {isEditing ? (
                    <input value={editFormData.title || ''} onChange={e => setEditFormData({...editFormData, title: e.target.value})} className='w-full px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm font-bold border-none focus:ring-1 focus:ring-purple-500' onClick={(e) => e.stopPropagation()} />
                  ) : (
                    <h3 className={'font-bold text-zinc-900 dark:text-zinc-50 break-all leading-tight ' + (isGrid ? 'text-sm line-clamp-2' : 'text-base truncate')}>{book.title}</h3>
                  )}
                </div>
                <div className='flex-none pt-0.5'>
                  <input type='checkbox' checked={isSelected} onClick={(e) => e.stopPropagation()} onChange={() => { onToggleSelect(book.id!); }} className='w-5 h-5 rounded-lg border-zinc-300 text-purple-600 focus:ring-purple-500 bg-white dark:bg-zinc-800 transition-colors cursor-pointer' />
                </div>
              </div>
              <div className='flex items-center gap-2 flex-wrap'>
                  {isEditing ? (
                    <input value={editFormData.authors || ''} onChange={e => setEditFormData({...editFormData, authors: e.target.value})} className='w-full px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-xs border-none focus:ring-1 focus:ring-purple-500' onClick={(e) => e.stopPropagation()} />
                  ) : (
                    <p className='text-purple-600 text-[11px] font-bold truncate'>{book.authors}</p>
                  )}
                  <span className='text-zinc-300 dark:text-zinc-700'>·</span>
                  <p className='text-zinc-400 text-[10px] truncate'>{book.publisher} · {new Date(book.created_at!).toLocaleDateString()}</p>
                </div>
            </div>
            
            <div className={'flex items-center justify-end gap-1 ' + (isGrid ? 'mt-2' : 'mt-1')}>
              {isEditing ? (
                <><button onClick={handleSaveEdit} className='p-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors'><Check className='w-4 h-4'/></button><button onClick={(e) => { e.stopPropagation(); setIsEditing(false); }} className='p-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-xl'><X className='w-4 h-4'/></button></>
              ) : (
                <><button onClick={handleStartEdit} className='p-2 text-zinc-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-xl transition-colors'><Edit2 className='w-4 h-4'/></button><button onClick={(e) => { e.stopPropagation(); onDelete(book.id!); }} className='p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors'><Trash2 className='w-4 h-4'/></button></>
              )}
            </div>
          </div>
        </div>

        {/* 목록형에서는 메모 칸을 숨김 */}
        {isGrid && (
          <div className='mt-auto px-4 pb-4'>
            {isEditing ? (
              <textarea value={editFormData.personal_memo || ''} onChange={e => setEditFormData({...editFormData, personal_memo: e.target.value})} placeholder='개인 메모를 입력하세요...' className='w-full h-24 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-2xl text-sm border-none focus:ring-1 focus:ring-purple-500 resize-none' onClick={(e) => e.stopPropagation()} />
            ) : (
              <div onClick={handleStartEdit} className='p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl min-h-[60px] cursor-text hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group/memo'>
                <p className='text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed italic break-all'>{book.personal_memo || '남겨진 메모가 없습니다.'}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LibraryBookCard;