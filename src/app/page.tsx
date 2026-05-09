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
  
  // 정렬 및 UI 상태

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [swipingId, setSwipingId] = useState<number | null>(null);
  const touchStartX = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // 상세 모달 및 가용성 상태
  const [selectedBook, setSelectedBook] = useState<SavedBook | Book | null>(null);
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus | null>(null);

  // 상세 모달용 데이터 동기화: 원본 리스트에서 최신 객체 추출
  const currentSelectedBook = useMemo(() => {
    if (selectedBookId) {
      return savedBooks.find(b => b.id === selectedBookId) || selectedBook;
    }
    return selectedBook;
  }, [selectedBookId, savedBooks, selectedBook]);

  const VERSION = "v2.0.1"; 

  /** 
   * 데이터 로딩 함수
   */
  const searchBooks = useCallback(async (searchQuery: string, updateUrl = true) => {
    if (!searchQuery || searchQuery.trim() === '[') return;
    setLoading(true);
    setSearchPage(1);
    setLastPerformedQuery(searchQuery);
    
    // 모바일 키보드 닫기 및 화면 상단 이동
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
      showToast(_error instanceof Error ? _error.message : '도서 검색 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [libraryName, showToast]);

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
      showToast('추가 검색 결과를 가져오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [loading, hasMoreSearch, searchPage, lastPerformedQuery, libraryName, showToast]);

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
    } catch (e) {
      console.error(e);
      setAvailabilityStatus({ status: 'error' });
    }
  }, [myPrimaryLib, selectedRegion, selectedSubRegion, libraryName]);

  /** 
   * Effects
   */
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
    if (currentSelectedBook) {
      checkAvailability(currentSelectedBook);
    } else {
      setAvailabilityStatus(null);
    }
  }, [currentSelectedBook, checkAvailability]);

  useEffect(() => {
    // React Query handles this automatically via sortColumn/sortOrder dependencies
  }, [libraryName, sortColumn, sortOrder, refreshBooks]);

  /** 
   * Handlers
   */
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    if (rawFile.size > 10 * 1024 * 1024) {
      showToast('파일 용량이 너무 큽니다 (최대 10MB).', 'error');
      return;
    }

    setOcrLoading(true);
    try {
      const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true };
      const compressedFile = await imageCompression(rawFile, options);
      
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
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
        showToast('이미지에서 책 정보를 찾지 못했습니다.', 'info');
      }
    } catch (error: unknown) {
      const err = error as Error;
      console.error('OCR Error:', error);
      showToast(err.message || '사진 인식 중 오류가 발생했습니다.', 'error');
    } finally {
      setOcrLoading(false);
    }
  };

  const handleSave = async (book: Book) => {
    if (!libraryName) return;
    
    setSavingIsbn(book.isbn);
    
    const newBookData: SavedBook = {
      isbn: book.isbn,
      title: book.title,
      authors: book.authors.join(', '),
      thumbnail: book.thumbnail || '',
      contents: book.contents || '',
      publisher: book.publisher || '',
      owner_name: libraryName
    };

    // 1. Optimistic UI: 즉시 리스트에 추가
    const tempId = addBookOptimistic(newBookData);
    showToast('보관함에 추가하는 중...');

    try {
      const { error } = await saveBookAction(newBookData);
      
      if (error === 'ALREADY_EXISTS') {
        // 중복 시 낙관적 업데이트 되돌리기
        removeBookOptimistic(tempId as number);
        showToast('이미 보관함에 저장된 책입니다.', 'info');
        return;
      }
      
      if (error) throw new Error(error);

      if (saveMode === 'shortcut') {
        const url = "shortcuts://run-shortcut?name=BookToMemo&input=text&text=" + 
                    encodeURIComponent(JSON.stringify({ ...newBookData, query }));
        window.location.href = url;
      } else {
        showToast('보관함에 저장되었습니다.');
      }
      
      // 실제 데이터로 교체하기 위해 캐시 무효화 (백그라운드 갱신)
      refreshBooks();
      
    } catch (_error) {
      // 실패 시 낙관적 업데이트 되돌리기
      removeBookOptimistic(tempId as number);
      console.error('Save Error:', _error);
      showToast('보관함 저장에 실패했습니다.', 'error');
    } finally {
      setSavingIsbn(null);
    }
  };

  const deleteSavedBook = async (id: number) => {
    if (!confirm('보관함에서 삭제하시겠습니까?')) return;
    
    // Optimistic UI: 먼저 UI에서 삭제
    removeBookOptimistic(id);
    setSelectedIds(prev => prev.filter(item => item !== id));
    showToast('책이 보관함에서 삭제되었습니다.');

    try {
      const { error } = await deleteBookAction(id, libraryName as string);
      if (error) {
        // 실패 시 복구 (전체 새로고침)
        refreshBooks();
        showToast('삭제 중 오류가 발생했습니다.', 'error');
      }
    } catch {
      refreshBooks();
      showToast('삭제 중 오류가 발생했습니다.', 'error');
    }
  };

  const deleteSelectedBooks = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`선택한 ${selectedIds.length}권의 책을 삭제하시겠습니까?`)) return;
    
    const idsToDelete = [...selectedIds];
    // Optimistic UI
    idsToDelete.forEach(id => removeBookOptimistic(id));
    setSelectedIds([]);
    showToast(`${idsToDelete.length}권의 책이 삭제되었습니다.`);

    try {
      const { error } = await deleteBooksAction(idsToDelete, libraryName as string);
      if (error) {
        refreshBooks();
        showToast('일부 책의 삭제를 처리하지 못했습니다.', 'error');
      }
    } catch {
      refreshBooks();
      showToast('삭제 작업 중 네트워크 오류가 발생했습니다.', 'error');
    }
  };

  if (!libraryName) {
    return <LibraryLogin />;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-32 font-sans transition-colors">
      <LibraryHeader 
        version={VERSION} 
        activeTab={activeTab}
        saveMode={saveMode}
        onTestConnection={async () => {
          const { error } = await checkLibraryExistsAction(libraryName || '');
          if (error && error.includes('API 키')) showToast(error, 'error');
          else showToast('서버와의 연결이 원활합니다.');
        }}
        onToggleSaveMode={() => {
          const newMode = saveMode === 'shortcut' ? 'native' : 'shortcut';
          setSaveMode(newMode);
          localStorage.setItem('save_mode', newMode);
        }}
      />

      <main className="max-w-4xl mx-auto px-4">
        {activeTab === 'search' ? (
          <div className="space-y-8">
            <BookSearchBar 
              query={query} setQuery={setQuery} 
              onSearch={(e) => { e.preventDefault(); searchBooks(query); }}
              loading={loading} ocrLoading={ocrLoading}
              fileInputRef={fileInputRef} onPhotoUpload={handlePhotoUpload}
              saveMode={saveMode}
              inputRef={searchInputRef}
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
                  onSave={handleSave}
                  savingIsbn={savingIsbn}
                  saveMode={saveMode}
                />
              ))}
              {!loading && query && books.length === 0 && (
                <div className="py-20 text-center text-zinc-400 text-sm">검색 결과가 없습니다.</div>
              )}
              {hasMoreSearch && (
                <button 
                  onClick={loadMoreSearch}
                  disabled={loading}
                  className="w-full py-4 mt-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-600 dark:text-zinc-400 font-bold text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "검색 결과 더 보기"}
                </button>
              )}
            </div>
          </div>
        ) : (
          <section className="space-y-6">
            <LibrarySortFilters 
              savedBooksCount={savedBooks.length}
              selectedIdsCount={selectedIds.length}
              onToggleSelectAll={() => {
                if (selectedIds.length === savedBooks.length && savedBooks.length > 0) setSelectedIds([]);
                else setSelectedIds(savedBooks.map(book => book.id!));
              }}
              onDeleteSelected={deleteSelectedBooks}
              viewMode={viewMode} setViewMode={setViewMode}
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
              <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm divide-y divide-zinc-100 dark:divide-zinc-800"}>
                {savedBooks.map((book) => (
                  <LibraryBookCard 
                    key={book.id} book={book}
                    onSelect={() => { setSelectedBook(book); setSelectedBookId(null); }}
                    onDelete={deleteSavedBook}
                    selectedIds={selectedIds} 
                    onToggleSelect={(id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])}
                    swipingId={swipingId} setSwipingId={setSwipingId}
                    touchStartX={touchStartX}
                  />
                ))}
              </div>
            )}
            
            {savedBooks.length === 0 && (
              <div className="py-20 text-center text-zinc-400 text-sm">아직 저장된 책이 없습니다.</div>
            )}
            {hasMoreBooks && (
              <button 
                onClick={() => loadMoreBooks()}
                disabled={isLoading}
                className="w-full py-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-600 dark:text-zinc-400 font-bold text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
              >
                {isFetchingNextPage ? <Loader2 className="w-4 h-4 animate-spin" /> : "서재 목록 더 보기"}
              </button>
            )}
          </section>
        )}
      </main>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
      <PWAInstallGuide />

      {currentSelectedBook && (
        <BookDetailModal 
          book={currentSelectedBook}
          onClose={() => { setSelectedBook(null); setSelectedBookId(null); }}
          myPrimaryLib={myPrimaryLib}
          availabilityStatus={availabilityStatus}
          onSave={handleSave}
          savingIsbn={savingIsbn}
        />
      )}
    </div>
  );
}
