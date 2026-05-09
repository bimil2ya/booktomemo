'use client';

import React, { useState, useEffect } from 'react';
import { Book, SavedBook, AvailabilityStatus } from '@/types';
import BookThumbnail from './BookThumbnail';
import { X, Building2, Loader2, Check, BookOpen, Edit2, Save } from 'lucide-react';
import { useLibrary } from '@/context/LibraryContext';
import { useToast } from '@/context/ToastContext';
import { updateBookAction } from '@/app/actions';

interface BookDetailModalProps {
  book: Book | SavedBook;
  onClose: () => void;
  myPrimaryLib: { code: string; name: string } | null;
  availabilityStatus: AvailabilityStatus | null;
  onSave?: (book: Book) => void;
  savingIsbn?: string | null;
  onAuthorClick?: (author: string) => void;
}

const BookDetailModal: React.FC<BookDetailModalProps> = ({
  book, onClose, myPrimaryLib, availabilityStatus, onSave, savingIsbn, onAuthorClick
}) => {
  const { libraryName, updateBookOptimistic } = useLibrary();
  const { showToast } = useToast();
  const [memo, setMemo] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const isSavedBook = 'id' in book;
  const isCurrentlySaving = savingIsbn === book.isbn;

  useEffect(() => {
    if (isSavedBook) {
      setMemo((book as SavedBook).personal_memo || '');
    }
  }, [book, isSavedBook]);

  const handleSaveMemo = async () => {
    if (!isSavedBook || !book.id) return;
    
    setIsSaving(true);
    const originalMemo = (book as SavedBook).personal_memo || '';
    
    // Optimistic UI
    updateBookOptimistic(book.id, { personal_memo: memo });

    try {
      const { error } = await updateBookAction(book.id, { personal_memo: memo }, libraryName || '');
      if (error) throw new Error(error);
      showToast('메모가 저장되었습니다.');
    } catch {
      // Rollback
      updateBookOptimistic(book.id, { personal_memo: originalMemo });
      showToast('메모 저장에 실패했습니다.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const safeSrc = book.thumbnail || '';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 w-full max-w-lg max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="relative h-48 sm:h-64 flex-none overflow-hidden bg-purple-50 dark:bg-purple-900/10 flex items-center justify-center">
          {book.thumbnail && (
            <div className="absolute inset-0 opacity-20 blur-xl scale-110">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={safeSrc} 
                alt=""
                className="w-full h-full object-cover p-8"
              />
            </div>
          )}
          <BookThumbnail 
            src={book.thumbnail} 
            title={book.title} 
            isContain={true} 
            noOverflow={true} 
            className="aspect-[3/4.5] h-[80%] relative z-10 drop-shadow-2xl bg-transparent dark:bg-transparent" 
          />
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-white/20 dark:bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-all z-20"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-8 overflow-y-auto no-scrollbar flex-1 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 leading-tight">
              {book.title}
            </h2>
            <div className="flex flex-wrap justify-center gap-2 text-sm">
              <div className="flex flex-wrap gap-2">
                {(Array.isArray(book.authors) ? book.authors : [book.authors]).map((author, idx) => (
                  <button 
                    key={idx}
                    onClick={() => onAuthorClick?.(author as string)}
                    className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full font-bold hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
                  >
                    {author}
                  </button>
                ))}
              </div>
              <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-full">
                {book.publisher}
              </span>
            </div>
          </div>

          {myPrimaryLib && availabilityStatus && (
            <div className="p-5 bg-zinc-50 dark:bg-zinc-800/50 rounded-3xl border border-zinc-100 dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-purple-500" />
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-50">{myPrimaryLib.name} 현황</span>
                </div>
                {availabilityStatus.status === 'loading' && <Loader2 className="w-3.5 h-3.5 text-purple-500 animate-spin" />}
              </div>

              <div className="flex items-center gap-3">
                {availabilityStatus.status === 'available' && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl text-[11px] font-bold">
                    <Check className="w-3.5 h-3.5" /> 지금 바로 빌릴 수 있어요!
                  </div>
                )}
                {availabilityStatus.status === 'loaned' && (
                  <div className="flex flex-col gap-2 w-full">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-[11px] font-bold w-fit">
                      <X className="w-3.5 h-3.5" /> 현재 대출 중입니다.
                    </div>
                    {availabilityStatus.otherLibsInfo && (
                      <div className="mt-1 px-1">
                        <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                          💡 상호대차 추천: {availabilityStatus.otherLibsInfo}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {availabilityStatus.status === 'not_found' && (
                  <div className="flex flex-col gap-2 w-full">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 rounded-xl text-[11px] font-bold w-fit">
                      소장하고 있지 않습니다.
                    </div>
                    {availabilityStatus.otherLibsInfo && (
                      <div className="mt-1 px-1">
                        <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                          💡 상호대차 가능 도서관: {availabilityStatus.otherLibsInfo}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {availabilityStatus.status === 'error' && (
                  <div className="text-[10px] text-zinc-400 italic">정보를 불러올 수 없습니다.</div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-50 font-bold border-b border-zinc-100 dark:border-zinc-800 pb-2">
              <BookOpen className="w-4 h-4 text-purple-500" />
              <span>책 소개</span>
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed text-justify">
              {book.contents || '등록된 정보가 없습니다.'}
            </p>
          </div>

          {isSavedBook && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-50 font-bold">
                  <Edit2 className="w-4 h-4 text-purple-500" />
                  <span>나의 메모</span>
                </div>
                {memo !== ((book as SavedBook).personal_memo || '') && (
                  <button
                    onClick={handleSaveMemo}
                    disabled={isSaving}
                    className="flex items-center gap-1 px-3 py-1 bg-purple-600 text-white text-[10px] font-bold rounded-full hover:bg-purple-700 transition-all disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    저장하기
                  </button>
                )}
              </div>
              <div className="relative">
                <textarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="이 책에 대한 생각을 남겨보세요..."
                  className="w-full h-32 p-5 bg-zinc-50 dark:bg-zinc-800/50 rounded-[2rem] text-sm text-zinc-700 dark:text-zinc-300 border-none focus:ring-2 focus:ring-purple-500/50 resize-none italic leading-relaxed"
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-100 dark:border-zinc-800 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-4 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 rounded-2xl font-bold text-lg hover:scale-[0.98] transition-all"
          >
            닫기
          </button>
          {!isSavedBook && onSave && (
            <button 
              onClick={() => onSave(book as Book)}
              disabled={isCurrentlySaving}
              className="flex-[2] py-4 bg-purple-600 text-white rounded-2xl font-bold text-lg hover:bg-purple-700 hover:scale-[0.98] transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
            >
              {isCurrentlySaving ? <Loader2 className="w-5 h-5 animate-spin" /> : '서재에 저장'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookDetailModal;
