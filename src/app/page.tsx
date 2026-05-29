'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

const VERSION = "경호v2.7.0";
import { Loader2 } from 'lucide-react';

// 서버 액션 및 컨텍스트 임포트
import { 
  saveBookAction, 
  deleteBookAction, 
  deleteBooksAction, 
  checkBookAvailabilityAction, 
  searchLibrariesByBookAction,
  searchBooksAction,
  checkLibraryExistsAction
} from './actions';
import { useLibrary } from '@/context/LibraryContext';
import { useToast } from '@/context/ToastContext';

// 타입, 상수, 컴포넌트, 유틸 임포트
import { Book, SavedBook, AvailabilityStatus } from '@/types';
import { normalizeIsbn } from '@/utils/isbn';
import LibraryLogin from '@/components/LibraryLogin';
import LibraryHeader from '@/components/LibraryHeader';
import BookSearchBar from '@/components/BookSearchBar';
import SearchResultCard from '@/components/SearchResultCard';
import LibraryBookCard from '@/components/LibraryBookCard';
import LibrarySortFilters from '@/components/LibrarySortFilters';
import BookDetailModal from '@/components/BookDetailModal';
import UsageGuideModal from '@/components/UsageGuideModal';
import BottomNav from '@/components/BottomNav';
import PWAInstallGuide from '@/components/PWAInstallGuide';
import StatsTab from '@/components/StatsTab';
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
    setSort,
    dbSyncAvailable
  } = useLibrary();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'search' | 'library' | 'stats'>('search');
  const [query, setQuery] = useState('');
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false); // 비동기 상태 체크용 Ref 추가
  
  const [searchPage, setSearchPage] = useState(1);
  const [lastPerformedQuery, setLastPerformedQuery] = useState('');
  const [totalSearchCount, setTotalSearchCount] = useState(0);
  const [searchWithin, setSearchWithin] = useState(false);
  const [hasMoreSearch, setHasMoreSearch] = useState(false);
  const [savingIsbn, setSavingIsbn] = useState<string | null>(null);

  // 자동완성 state
  const [suggestions, setSuggestions] = useState<Book[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsTotal, setSuggestionsTotal] = useState(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedBook, setSelectedBook] = useState<SavedBook | Book | null>(null);
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus | null>(null);
  const [libSearchQuery, setLibSearchQuery] = useState('');
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState<{ query: string; books: Book[]; totalCount: number; hasMore: boolean }[]>([]);

  const currentSelectedBook = useMemo(() => {
    if (selectedBookId) {
      return savedBooks.find(b => b.id === selectedBookId) || selectedBook;
    }
    return selectedBook;
  }, [selectedBookId, savedBooks, selectedBook]);

  // performSearch 내부에서 최신 상태를 읽기 위한 ref (의존성 배열 안정화 목적)
  const searchStateRef = useRef({ lastPerformedQuery: '', books: [] as Book[], totalSearchCount: 0, hasMoreSearch: false });
  useEffect(() => {
    searchStateRef.current = { lastPerformedQuery, books, totalSearchCount, hasMoreSearch };
  }, [lastPerformedQuery, books, totalSearchCount, hasMoreSearch]);

  // 검색 로직 통합 및 경합 방지를 위한 핵심 함수
  const performSearch = useCallback(async (searchQuery: string, updateUrl = true) => {
    if (!searchQuery || searchQuery.trim() === '[' || loadingRef.current) return;

    const { lastPerformedQuery: prevQuery, books: prevBooks, totalSearchCount: prevCount, hasMoreSearch: prevHasMore } = searchStateRef.current;

    // 현재 상태를 히스토리에 저장 (동일한 검색어가 아닐 때만)
    if (prevQuery && prevQuery !== searchQuery) {
      setSearchHistory(prev => [{
        query: prevQuery,
        books: [...prevBooks],
        totalCount: prevCount,
        hasMore: prevHasMore
      }, ...prev].slice(0, 5));
    }

    loadingRef.current = true;
    setLoading(true);
    setSearchPage(1);
    setLastPerformedQuery(searchQuery);

    // UI 최적화
    searchInputRef.current?.blur();
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (updateUrl) {
      localStorage.setItem('last_search_query', searchQuery);
      const newUrl = `${window.location.pathname}?q=${encodeURIComponent(searchQuery)}`;
      window.history.replaceState({ path: newUrl }, '', newUrl);
    }

    try {
      const { data, meta, error } = await searchBooksAction(searchQuery, libraryName || "", 1);
      if (error) throw new Error(error);
      setBooks(data || []);
      setTotalSearchCount(meta?.pageable_count || 0);
      setHasMoreSearch(meta ? !meta.is_end : false);
    } catch (e) {
      console.error('Search failed:', e);
      showToast('도서 검색 실패 — 잠시 후 다시 시도해 주세요', 'error');
      setBooks([]);
      setTotalSearchCount(0);
      setHasMoreSearch(false); // Bug 3 fix: 실패 시 "더 보기" 버튼 숨김
    } finally {
      // 탭 전환 및 렌더링 배칭을 충분히 기다린 후 해제하여 버튼 멈춤 방지
      setTimeout(() => {
        loadingRef.current = false;
        setLoading(false);
      }, 150);
    }
  }, [libraryName, showToast]);

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setShowSuggestions(false); // 드롭다운 닫기

    let finalQuery = query.trim();
    if (searchWithin && searchStateRef.current.lastPerformedQuery) {
      finalQuery = `${searchStateRef.current.lastPerformedQuery} ${finalQuery}`;
      setQuery(finalQuery);
    }
    await performSearch(finalQuery);
  }, [query, searchWithin, performSearch]);

  const goBackSearch = useCallback(() => {
    if (searchHistory.length === 0) return;
    
    const [last, ...rest] = searchHistory;
    setQuery(last.query);
    setLastPerformedQuery(last.query);
    setBooks(last.books);
    setTotalSearchCount(last.totalCount);
    setHasMoreSearch(last.hasMore);
    setSearchHistory(rest);
    
    // URL 업데이트
    localStorage.setItem('last_search_query', last.query);
    const newUrl = `${window.location.pathname}?q=${encodeURIComponent(last.query)}`;
    window.history.replaceState({ path: newUrl }, '', newUrl);
  }, [searchHistory]);

  useEffect(() => {
    // 버전 업데이트 체크 및 캐시 관리 기초 로직
    const lastVersion = localStorage.getItem('app_version');
    if (lastVersion !== VERSION) {
      localStorage.setItem('app_version', VERSION);
    }

    // 초기 마운트 시 URL 쿼리 파라미터 처리 (딱 한 번만 실행)
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q && q !== '' && q !== '[' && !searchStateRef.current.lastPerformedQuery && !loadingRef.current) {
      setQuery(q);
      performSearch(q, false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const savedIsbns = useMemo(() => new Set(savedBooks.map(b => normalizeIsbn(b.isbn))), [savedBooks]);

  const filteredSavedBooks = useMemo(() => {
    if (!libSearchQuery.trim()) return savedBooks;
    const q = libSearchQuery.toLowerCase();
    return savedBooks.filter(book => 
      book.title.toLowerCase().includes(q) || 
      book.authors.toLowerCase().includes(q) || 
      book.publisher.toLowerCase().includes(q) ||
      (book.personal_memo && book.personal_memo.toLowerCase().includes(q))
    );
  }, [savedBooks, libSearchQuery]);

  // 자동완성: 타이핑 핸들러 (debounce 400ms)
  const handleQueryChange = useCallback((value: string) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (value.trim().length < 2) {
      setSuggestions([]);
      setSuggestionsTotal(0);
      setShowSuggestions(false);
      setSuggestionsLoading(false);
      return;
    }

    setSuggestionsLoading(true);
    setShowSuggestions(true);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        // 20개 요청 → 클라이언트에서 제목 포함 필터 후 상위 6개만 사용
        // (Kakao Book API는 target 파라미터 미지원이므로 클라이언트 필터링으로 대응)
        const { data, meta, error } = await searchBooksAction(value.trim(), libraryName || '', 1, 20);
        if (!error && data) {
          const q = value.trim().toLowerCase();
          const filtered = data
            .filter((book: Book) => book.title.toLowerCase().includes(q)) // 제목에 검색어 포함된 것만
            .sort((a: Book, b: Book) => {                                   // 제목이 검색어로 시작하면 우선
              const aPrefix = a.title.toLowerCase().startsWith(q) ? 0 : 1;
              const bPrefix = b.title.toLowerCase().startsWith(q) ? 0 : 1;
              return aPrefix - bPrefix;
            })
            .slice(0, 6);                                                   // 최대 6개
          setSuggestions(filtered);
          setSuggestionsTotal(meta?.pageable_count || 0);
        } else {
          setSuggestions([]);
        }
      } catch {
        setSuggestions([]);
      } finally {
        setSuggestionsLoading(false);
      }
    }, 400);
  }, [libraryName]);

  // 자동완성: 항목 클릭 → BookDetailModal 오픈
  const handleSuggestionSelect = useCallback((book: Book) => {
    setShowSuggestions(false);
    setSelectedBook(book);
    setSelectedBookId(null);
  }, []);

  // 자동완성: "전체 결과 보기" 클릭 → 기존 검색 실행
  const handleSuggestionFullSearch = useCallback(() => {
    setShowSuggestions(false);
    if (query.trim()) performSearch(query.trim());
  }, [query, performSearch]);

  const handleAuthorClick = useCallback((author: string) => {
    const cleanName = author.split(/[(\[]/)[0].trim();
    if (!cleanName) return;
    
    setSelectedBook(null);
    setSelectedBookId(null);
    setQuery(cleanName);
    setActiveTab('search');
    
    // 탭 전환 후 검색 실행 (배칭 이슈 방지)
    setTimeout(() => {
      performSearch(cleanName);
    }, 100);
  }, [performSearch]);

  const loadMoreSearch = useCallback(async () => {
    if (loadingRef.current || !hasMoreSearch || !lastPerformedQuery) return;
    
    const nextPage = searchPage + 1;
    loadingRef.current = true;
    setLoading(true);
    
    try {
      const { data, meta, error } = await searchBooksAction(lastPerformedQuery, libraryName || "", nextPage);
      if (error) throw new Error(error);
      setBooks(prev => [...prev, ...(data || [])]);
      setSearchPage(nextPage);
      setHasMoreSearch(meta ? !meta.is_end : false);
    } catch (e) {
      console.error('Load more failed:', e);
      showToast('검색 실패 — 잠시 후 다시 시도해 주세요', 'error');
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [hasMoreSearch, searchPage, lastPerformedQuery, libraryName, showToast]);

  const checkAvailability = useCallback(async (book: SavedBook | Book) => {
    if (!myPrimaryLib) return;
    const normalizedIsbn = normalizeIsbn(book.isbn);
    if (!normalizedIsbn) {
      setAvailabilityStatus({ status: 'error' });
      return;
    }
    setAvailabilityStatus({ status: 'loading' });
    try {
      const { data: avail, error } = await checkBookAvailabilityAction(normalizedIsbn, myPrimaryLib.libCode, libraryName || '', book.title);
      if (error) throw new Error(error);
      if (avail?.hasBook === 'N') {
        const { data: others, error: othersError } = await searchLibrariesByBookAction(normalizedIsbn, selectedRegion, selectedSubRegion, libraryName || '');
        if (othersError) throw othersError;
        let otherLibsInfo = '';
        if (others && others.length > 0 && others[0]?.lib?.libName) {
          const firstLibName = others[0].lib.libName.replace(/.*시\s+/, '').replace(/도서관$/, '');
          otherLibsInfo = others.length > 1 ? `${firstLibName} 외 ${others.length - 1}곳` : firstLibName;
        }
        setAvailabilityStatus({ status: 'not_found', otherLibsInfo });
      } else if (avail?.loanAvailable === 'N') {
        const { data: others, error: othersError } = await searchLibrariesByBookAction(normalizedIsbn, selectedRegion, selectedSubRegion, libraryName || '');
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

  useEffect(() => {
    if (currentSelectedBook) checkAvailability(currentSelectedBook);
    else setAvailabilityStatus(null);
  }, [currentSelectedBook, checkAvailability]);

  const handleSave = async (book: Book) => {
    if (!libraryName) return;
    const normalizedIsbn = normalizeIsbn(book.isbn);
    setSavingIsbn(book.isbn);
    const newBookData: SavedBook = {
      isbn: normalizedIsbn, title: book.title, authors: book.authors.join(', '),
      thumbnail: book.thumbnail || '', contents: book.contents || '',
      publisher: book.publisher || '', owner_name: libraryName
    };
    const tempId = addBookOptimistic(newBookData);
    showToast('보관함 추가 중...');
    try {
      const { error } = await saveBookAction(newBookData);
      if (error === 'ALREADY_EXISTS') {
        removeBookOptimistic(tempId as number);
        showToast('이미 보관함에 있는 책입니다', 'info');
        return;
      }
      if (error) throw new Error(error);
      showToast('보관함 저장 완료');
      refreshBooks();
    } catch (e) {
      removeBookOptimistic(tempId as number);
      console.error('Save Error:', e);
      showToast('저장 실패 — 잠시 후 다시 시도해 주세요', 'error');
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
        await refreshBooks();
        showToast('삭제 실패 — 잠시 후 다시 시도해 주세요', 'error');
      }
    } catch {
      await refreshBooks();
      showToast('삭제 실패 — 네트워크를 확인해 주세요', 'error');
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
        await refreshBooks();
        showToast('일부 삭제 실패 — 잠시 후 다시 시도해 주세요', 'error');
      }
    } catch {
      await refreshBooks();
      showToast('삭제 실패 — 네트워크를 확인해 주세요', 'error');
    }
  };

  if (!libraryName) return <LibraryLogin />;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-32 font-sans transition-colors">
      <LibraryHeader 
        version={VERSION}
        onTestConnection={async () => {
          const { error } = await checkLibraryExistsAction(libraryName || '');
          if (error) showToast('서버 연결 실패', 'error');
          else showToast('서버 연결 양호');
        }}
        onOpenGuide={() => setIsGuideOpen(true)}
      />

      <main className="max-w-4xl mx-auto">
        {activeTab === 'stats' ? (
          <StatsTab
            savedBooks={savedBooks}
            onSelectBook={(book) => { setSelectedBook(book); setSelectedBookId(book.id || null); }}
            dbSyncAvailable={dbSyncAvailable}
          />
        ) : activeTab === 'search' ? (
          <div className="space-y-8 px-4">
            <BookSearchBar
              query={query} setQuery={setQuery}
              onSearch={handleSearch}
              loading={loading}
              searchWithin={searchWithin}
              setSearchWithin={setSearchWithin}
              inputRef={searchInputRef}
              lastPerformedQuery={lastPerformedQuery}
              totalSearchCount={totalSearchCount}
              onBack={goBackSearch}
              canGoBack={searchHistory.length > 0}
              onQueryChange={handleQueryChange}
              suggestions={suggestions}
              showSuggestions={showSuggestions}
              suggestionsLoading={suggestionsLoading}
              suggestionsTotal={suggestionsTotal}
              onSuggestionSelect={handleSuggestionSelect}
              onFullSearch={handleSuggestionFullSearch}
              onSuggestionsClose={() => setShowSuggestions(false)}
            />

            <div className="grid gap-3 max-w-lg mx-auto">
              {loading && books.length === 0 && (
                <div className="grid gap-3">
                  {[...Array(5)].map((_, i) => <BookCardSkeleton key={i} />)}
                </div>
              )}
              
              {books.map((book, idx) => (
                <SearchResultCard 
                  key={idx} book={book} 
                  onSelect={() => { setSelectedBook(book); setSelectedBookId(null); }}
                  onSave={handleSave} savingIsbn={savingIsbn}
                  onAuthorClick={handleAuthorClick}
                  isSaved={savedIsbns.has(normalizeIsbn(book.isbn))}
                />
              ))}
              {!loading && query && books.length === 0 && lastPerformedQuery && (
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
              libSearchQuery={libSearchQuery}
              setLibSearchQuery={setLibSearchQuery}
            />

            {isLoading && savedBooks.length === 0 ? (
              <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-4"}>
                {[...Array(6)].map((_, i) => <BookCardSkeleton key={i} />)}
              </div>
            ) : (
              <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
                {filteredSavedBooks.map((book) => (
                  <LibraryBookCard
                    key={book.id} book={book} onSelect={() => { setSelectedBook(book); setSelectedBookId(book.id || null); }}
                    onDelete={deleteSavedBook} selectedIds={selectedIds}
                    onToggleSelect={(id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])}
                    viewMode={viewMode} onAuthorClick={handleAuthorClick}
                  />
                ))}
              </div>
            )}
            
            {savedBooks.length > 0 && filteredSavedBooks.length === 0 && (
              <div className="py-20 text-center text-zinc-400 text-sm italic">검색 결과와 일치하는 책이 없습니다.</div>
            )}
            {savedBooks.length === 0 && <div className="py-20 text-center text-zinc-400 text-sm">저장된 책 없음</div>}
            {hasMoreBooks && !libSearchQuery && (
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
      {isGuideOpen && (
        <UsageGuideModal onClose={() => setIsGuideOpen(false)} />
      )}
    </div>
  );
}
