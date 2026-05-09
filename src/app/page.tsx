'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import imageCompression from 'browser-image-compression';
import { Loader2 } from 'lucide-react';

// 서버 액션 및 컨텍스트 임포트
import { 
  saveBookAction, 
  deleteBookAction, 
  deleteBooksAction, 
  checkBookAvailabilityAction, 
  searchLibrariesByBookAction,
  searchBooksAction,
  analyzeImageAction,
  checkLibraryExistsAction
} from './actions';
import { useLibrary } from '@/context/LibraryContext';
import { useToast } from '@/context/ToastContext';

// 타입, 상수, 컴포넌트, 유틸 임포트
import { Book, SavedBook, AvailabilityStatus } from '@/types';
import LibraryLogin from '@/components/LibraryLogin';
import LibraryHeader from '@/components/LibraryHeader';
import BookSearchBar from '@/components/BookSearchBar';
import SearchResultCard from '@/components/SearchResultCard';
import LibraryBookCard from '@/components/LibraryBookCard';
import LibrarySortFilters from '@/components/LibrarySortFilters';
import BookDetailModal from '@/components/BookDetailModal';
import BottomNav from '@/components/BottomNav';
import PWAInstallGuide from '@/components/PWAInstallGuide';
import { BookCardSkeleton } from '@/components/Skeleton';

export default function Home() {
  const { 
    libraryName, 
    savedBooks, 
    refreshBooks, 
    loadMoreBooks,
    hasMoreBooks,
    isLoading,
    myPrimaryLib, 
    selectedRegion, 
    selectedSubRegion,
    removeBookOptimistic,
    addBookOptimistic,
    isFetchingNextPage,
    sortColumn,
    sortOrder,
    setSort
  } = useLibrary();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'search' | 'library'>('search');
  const [query, setQuery] = useState('');
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [lastPerformedQuery, setLastPerformedQuery] = useState('');
  const [hasMoreSearch, setHasMoreSearch] = useState(false);
  const [savingIsbn, setSavingIsbn] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [saveMode, setSaveMode] = useState<'shortcut' | 'native'>('native');
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [swipingId, setSwipingId] = useState<number | null>(null);
  const touchStartX = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedBook, setSelectedBook] = useState<SavedBook | Book | null>(null);
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus | null>(null);

  const currentSelectedBook = useMemo(() => {
    if (selectedBookId) {
      return savedBooks.find(b => b.id === selectedBookId) || selectedBook;
    }
    return selectedBook;
  }, [selectedBookId, savedBooks, selectedBook]);

  const VERSION = "v2.0.9"; 

  const searchBooks = useCallback(async (searchQuery: string, updateUrl = true) => {
    if (!searchQuery || searchQuery.trim() === '[') return;
    setLoading(true);
    setSearchPage(1);
    setLastPerformedQuery(searchQuery);
    
    searchInputRef.current?.blur();
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    if (updateUrl) {
      localStorage.setItem('last_search_query', searchQuery);
      const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?q=' + encodeURIComponent(searchQuery);
      window.history.replaceState({ path: newUrl }, '', newUrl);
    }

    try {
      const { data, meta, error } = await searchBooksAction(searchQuery, libraryName || "", 1);
      if (error) throw new Error(error);
      setBooks(data || []);
      setHasMoreSearch(meta ? !meta.is_end : false);
    } catch (_error) {
      console.error('Search failed:', _error);
      showToast(_error instanceof Error ? _error.message : '도서 검색 실패', 'error');
    } finally {
      setLoading(false);
    }
  }, [libraryName, showToast]);

  const handleAuthorClick = useCallback((author: string) => {
    const cleanName = author.split(/[(\[]/)[0].trim();
    if (!cleanName) return;
    setSelectedBook(null);
    setSelectedBookId(null);
    setActiveTab('search');
    setQuery(cleanName);
    searchBooks(cleanName);
  }, [searchBooks]);

  const loadMoreSearch = useCallback(async () => {
    if (loading || !hasMoreSearch) return;
    const nextPage = searchPage + 1;
    setLoading(true);
    try {
      const { data, meta, error } = await searchBooksAction(lastPerformedQuery, libraryName || "", nextPage);
      if (error) throw new Error(error);
      setBooks(prev => [...prev, ...(data || [])]);
      setSearchPage(nextPage);
      setHasMoreSearch(meta ? !meta.is_end : false);
    } catch (_error) {
      console.error('Load more failed:', _error);
      showToast('추가 검색 실패', 'error');
    } finally {
      setLoading(false);
    }
  }, [loading, hasMoreSearch, searchPage, lastPerformedQuery, libraryName, showToast, searchBooks]);

  const checkAvailability = useCallback(async (book: SavedBook | Book) => {
    if (!myPrimaryLib) return;
    const isbn13 = book.isbn.split(' ').find(s => s.length === 13);
    if (!isbn13) {
      setAvailabilityStatus({ status: 'error' });
      return;
    }
    setAvailabilityStatus({ status: 'loading' });
    try {
      const { data: avail, error } = await checkBookAvailabilityAction(isbn13, myPrimaryLib.code, libraryName || '');
      if (error) throw new Error(error);
      if (avail?.hasBook === 'N') {
        const { data: others, error: othersError } = await searchLibrariesByBookAction(isbn13, selectedRegion, selectedSubRegion, libraryName || '');
        if (othersError) throw othersError;
        let otherLibsInfo = '';
        if (others && others.length > 0 && others[0]?.lib?.libName) {
          const firstLibName = others[0].lib.libName.replace(/.*시\s+/, '').replace(/도서관$/, '');
          otherLibsInfo = others.length > 1 ? `${firstLibName} 외 ${others.length - 1}곳` : firstLibName;
        }
        setAvailabilityStatus({ status: 'not_found', otherLibsInfo });
      } else if (avail?.loanAvailable === 'N') {
        const { data: others, error: othersError } = await searchLibrariesByBookAction(isbn13, selectedRegion, selectedSubRegion, libraryName || '');
        if (othersError) throw othersError;
        let otherLibsInfo = '';
        if (others && others.length > 0 && others[0]?.lib?.libName) {
          const firstLibName = others[0].lib.libName.replace(/.*시\s+/, '').replace(/도서관$/, '');
          otherLibsInfo = others.length > 1 ? `${firstLibName} 외 ${others.length - 1}곳` : firstLibName;
        }
        setAvailabilityStatus({ status: 'loaned', otherLibsInfo });
      } else if (avail?.hasBook === 'Y') {
        setAvailabilityStatus({ status: 'available' });
      } else {
        setAvailabilityStatus({ status: 'error' });
      }
    } catch (_error) {
      console.error(_error);
      setAvailabilityStatus({ status: 'error' });
    }
  }, [myPrimaryLib, selectedRegion, selectedSubRegion, libraryName]);

  useEffect(() => {
    const lastMode = localStorage.getItem('save_mode') as 'shortcut' | 'native';
    if (lastMode) setSaveMode(lastMode);
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q && q !== '' && q !== '[') {
      setQuery(q);
      searchBooks(q, false);
    }
  }, [searchBooks]);

  useEffect(() => {
    if (currentSelectedBook) checkAvailability(currentSelectedBook);
    else setAvailabilityStatus(null);
  }, [currentSelectedBook, checkAvailability]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;
    if (rawFile.size > 10 * 1024 * 1024) {
      showToast('파일 용량 너무 큼 (최대 10MB)', 'error');
      return;
    }
    setOcrLoading(true);
    try {
      const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true };
      const compressedFile = await imageCompression(rawFile, options);
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      });
      reader.readAsDataURL(compressedFile);
      const base64Image = await base64Promise;
      const { data, error } = await analyzeImageAction(base64Image, compressedFile.type, libraryName || "");
      if (error) throw new Error(error);
      if (data && (data.title || data.author)) {
        const optimizedQuery = `${data.title} ${data.author}`.trim();
        setQuery(optimizedQuery);
        searchBooks(optimizedQuery);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      } else {
        showToast('책 정보 찾지 못함', 'info');
      }
    } catch (_error) {
      console.error('OCR Error:', _error);
      showToast('사진 인식 오류', 'error');
    } finally {
      setOcrLoading(false);
    }
  };

  const handleSave = async (book: Book) => {
    if (!libraryName) return;
    setSavingIsbn(book.isbn);
    const newBookData: SavedBook = {
      isbn: book.isbn, title: book.title, authors: book.authors.join(', '),
      thumbnail: book.thumbnail || '', contents: book.contents || '',
      publisher: book.publisher || '', owner_name: libraryName
    };
    const tempId = addBookOptimistic(newBookData);
    showToast('보관함 추가 중...');
    try {
      const { error } = await saveBookAction(newBookData);
      if (error === 'ALREADY_EXISTS') {
        removeBookOptimistic(tempId as number);
        showToast('이미 저장된 책', 'info');
        return;
      }
      if (error) throw new Error(error);
      showToast('보관함 저장 완료');
      refreshBooks();
    } catch (_error) {
      removeBookOptimistic(tempId as number);
      console.error('Save Error:', _error);
      showToast('저장 실패', 'error');
    } finally {
      setSavingIsbn(null);
    }
  };

  const deleteSavedBook = async (id: number) => {
    if (!confirm('삭제하시겠습니까?')) return;
    removeBookOptimistic(id);
    setSelectedIds(prev => prev.filter(item => item !== id));
    showToast('책 삭제됨');
    try {
      const { error } = await deleteBookAction(id, libraryName as string);
      if (error) {
        refreshBooks();
        showToast('삭제 오류', 'error');
      }
    } catch {
      refreshBooks();
      showToast('네트워크 오류', 'error');
    }
  };

  const deleteSelectedBooks = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`${selectedIds.length}권 삭제하시겠습니까?`)) return;
    const idsToDelete = [...selectedIds];
    idsToDelete.forEach(id => removeBookOptimistic(id));
    setSelectedIds([]);
    showToast(`${idsToDelete.length}권 삭제됨`);
    try {
      const { error } = await deleteBooksAction(idsToDelete, libraryName as string);
      if (error) {
        refreshBooks();
        showToast('일부 삭제 실패', 'error');
      }
    } catch {
      refreshBooks();
      showToast('네트워크 오류', 'error');
    }
  };

  if (!libraryName) return <LibraryLogin />;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-32 font-sans transition-colors">
      <LibraryHeader 
        version={VERSION} activeTab={activeTab} saveMode={saveMode}
        onTestConnection={async () => {
          const { error } = await checkLibraryExistsAction(libraryName || '');
          if (error) showToast('서버 연결 실패', 'error');
          else showToast('서버 연결 양호');
        }}
        onToggleSaveMode={() => {
          const newMode = saveMode === 'shortcut' ? 'native' : 'shortcut';
          setSaveMode(newMode);
          localStorage.setItem('save_mode', newMode);
        }}
      />

      <main className="max-w-4xl mx-auto">
        {activeTab === 'search' ? (
          <div className="space-y-8 px-4">
            <BookSearchBar 
              query={query} setQuery={setQuery} 
              onSearch={(e) => { e.preventDefault(); searchBooks(query); }}
              loading={loading} ocrLoading={ocrLoading}
              fileInputRef={fileInputRef} onPhotoUpload={handlePhotoUpload}
              saveMode={saveMode} inputRef={searchInputRef}
            />

            {loading && books.length === 0 && (
              <div className="grid gap-3 max-w-lg mx-auto">
                {[...Array(5)].map((_, i) => <BookCardSkeleton key={i} />)}
              </div>
            )}
            <div className="grid gap-3 max-w-lg mx-auto">
              {books.map((book, idx) => (
                <SearchResultCard 
                  key={idx} book={book} 
                  onSelect={() => { setSelectedBook(book); setSelectedBookId(null); }}
                  onSave={handleSave} savingIsbn={savingIsbn} saveMode={saveMode}
                  onAuthorClick={handleAuthorClick}
                />
              ))}
              {!loading && query && books.length === 0 && (
                <div className="py-20 text-center text-zinc-400 text-sm">검색 결과 없음</div>
              )}
              {hasMoreSearch && (
                <button onClick={loadMoreSearch} disabled={loading} className="w-full py-4 mt-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-600 dark:text-zinc-400 font-bold text-sm flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "검색 결과 더 보기"}
                </button>
              )}
            </div>
          </div>
        ) : (
          <section className="space-y-6 px-4">
            <LibrarySortFilters 
              savedBooksCount={savedBooks.length} selectedIdsCount={selectedIds.length}
              onToggleSelectAll={() => {
                if (selectedIds.length === savedBooks.length && savedBooks.length > 0) setSelectedIds([]);
                else setSelectedIds(savedBooks.map(book => book.id!));
              }}
              onDeleteSelected={deleteSelectedBooks} viewMode={viewMode} setViewMode={setViewMode}
              sortColumn={sortColumn} sortOrder={sortOrder}
              onToggleSort={(column) => {
                if (sortColumn === column) setSort(column, sortOrder === 'asc' ? 'desc' : 'asc');
                else { setSort(column, 'asc'); }
              }}
            />

            {isLoading && savedBooks.length === 0 ? (
              <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-4"}>
                {[...Array(6)].map((_, i) => <BookCardSkeleton key={i} />)}
              </div>
            ) : (
              <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
                {savedBooks.map((book) => (
                  <LibraryBookCard 
                    key={book.id} book={book} onSelect={() => { setSelectedBook(book); setSelectedBookId(book.id || null); }}
                    onDelete={deleteSavedBook} selectedIds={selectedIds} 
                    onToggleSelect={(id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])}
                    swipingId={swipingId} setSwipingId={setSwipingId} touchStartX={touchStartX} viewMode={viewMode} onAuthorClick={handleAuthorClick}
                  />
                ))}
              </div>
            )}
            
            {savedBooks.length === 0 && <div className="py-20 text-center text-zinc-400 text-sm">저장된 책 없음</div>}
            {hasMoreBooks && (
              <button onClick={() => loadMoreBooks()} disabled={isLoading} className="w-full py-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-600 dark:text-zinc-400 font-bold text-sm flex items-center justify-center gap-2">
                {isFetchingNextPage ? <Loader2 className="w-4 h-4 animate-spin" /> : "서재 목록 더 보기"}
              </button>
            )}
          </section>
        )}
      </main>
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
      <PWAInstallGuide />
      {currentSelectedBook && (
        <BookDetailModal book={currentSelectedBook} onClose={() => { setSelectedBook(null); setSelectedBookId(null); }} myPrimaryLib={myPrimaryLib} availabilityStatus={availabilityStatus} onSave={handleSave} savingIsbn={savingIsbn} onAuthorClick={handleAuthorClick} />
      )}
    </div>
  );
}
