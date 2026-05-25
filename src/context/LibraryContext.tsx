'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { SavedBook, SortColumn, SortOrder, LibraryInfo } from '@/types';
import { normalizeName } from '@/utils/name';
import {
  getBooksAction,
  setLibraryCookieAction,
  clearLibraryCookieAction,
  checkLibraryExistsAction,
  verifyLibraryPasswordAction,
  createLibraryAction,
  markBookAsReadAction
} from '@/app/actions';
import { useInfiniteQuery, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { useToast } from '@/context/ToastContext';


interface LibraryContextType {
  libraryName: string | null;
  myPrimaryLib: LibraryInfo | null;
  selectedRegion: string;
  selectedSubRegion: string;
  savedBooks: SavedBook[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  totalBooksCount: number;
  hasMoreBooks: boolean;

  setLibrary: (name: string, primaryLib?: LibraryInfo) => Promise<void>;
  login: (name: string, password: string, isExisting: boolean) => Promise<{ success: boolean; error: string | null }>;
  logout: () => Promise<void>;
  updatePrimaryLib: (lib: LibraryInfo, region: string, subRegion: string) => void;
  refreshBooks: (sortColumn?: SortColumn, sortOrder?: SortOrder) => Promise<void>;
  loadMoreBooks: () => Promise<void>;

  checkExists: (name: string) => Promise<{ exists: boolean; error: string | null }>;

  // v1.8.5 Optimistic Actions
  addBookOptimistic: (book: SavedBook) => number | string;
  removeBookOptimistic: (bookId: number) => void;
  updateBookOptimistic: (bookId: number, data: Partial<SavedBook>) => void;

  // 읽음 상태 토글 (customReadAt 전달 시 해당 날짜로 기록, 없으면 현재 시각)
  markBookAsRead: (bookId: number, isRead: boolean, customReadAt?: string | null) => Promise<void>;
  // DB에 read_at 컬럼이 존재하는지 여부 (null=아직 모름)
  dbSyncAvailable: boolean | null;

  // Sorting state for React Query key
  sortColumn: SortColumn;
  sortOrder: SortOrder;
  setSort: (column: SortColumn, order: SortOrder) => void;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export function LibraryProvider({ 
  children, 
  initialLibraryName 
}: { 
  children: React.ReactNode;
  initialLibraryName: string | null;
}) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [libraryName, setLibraryName] = useState<string | null>(initialLibraryName);
  const [myPrimaryLib, setMyPrimaryLib] = useState<LibraryInfo | null>(null);
  const [selectedRegion, setSelectedRegion] = useState('31');
  const [selectedSubRegion, setSelectedSubRegion] = useState('31130');
  
  const [sortColumn, setSortColumn] = useState<SortColumn>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // 읽음 상태 localStorage 캐시: { [bookId]: isoDateString }
  const [readDates, setReadDates] = useState<Record<number, string>>({});
  // DB read_at 컬럼 존재 여부 (null=아직 감지 전, true=있음, false=없음)
  const [dbSyncAvailable, setDbSyncAvailable] = useState<boolean | null>(null);

  const isInitialMount = useRef(true);
  const PAGE_SIZE = 20;

  // React Query - Infinite Query for Books
  const {
    data,
    error: queryError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isQueryLoading,
    refetch
  } = useInfiniteQuery({
    queryKey: ['books', libraryName, sortColumn, sortOrder],
    queryFn: async ({ pageParam = 1 }) => {
      if (!libraryName) return { data: [], totalCount: 0 };
      const res = await getBooksAction(libraryName, sortColumn, sortOrder, pageParam, PAGE_SIZE);
      if (res.error) throw new Error(res.error);
      return res;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.reduce((acc, page) => acc + (page.data?.length || 0), 0);
      if (loadedCount < (lastPage.totalCount || 0)) {
        return allPages.length + 1;
      }
      return undefined;
    },
    enabled: !!libraryName,
    staleTime: 1000 * 60 * 5, // 5분간 캐시 유지
  });

  // Flattened books from all pages (useMemo optimized), localStorage readDates 병합
  const savedBooks = useMemo(() => {
    if (!data) return [];
    const flat = data.pages.reduce((acc: SavedBook[], page) => {
      if (page.data) return [...acc, ...page.data];
      return acc;
    }, []);
    // localStorage 읽음 상태 우선 병합
    return flat.map(book => ({
      ...book,
      read_at: book.id && readDates[book.id] ? readDates[book.id] : (book.read_at ?? null)
    }));
  }, [data, readDates]);

  const totalBooksCount = data?.pages[0]?.totalCount || 0;

  // 초기 상태 복구
  useEffect(() => {
    if (!isInitialMount.current) return;
    
    if (initialLibraryName) {
      localStorage.setItem('library_owner_name', initialLibraryName);
    } else {
      const savedName = localStorage.getItem('library_owner_name');
      if (savedName) setLibraryName(normalizeName(savedName));
    }

    const savedLib = localStorage.getItem('my_primary_lib');
    const savedRegion = localStorage.getItem('my_region');
    const savedSubRegion = localStorage.getItem('my_sub_region');

    if (savedLib) {
      try { 
        const parsed = JSON.parse(savedLib);
        if (parsed && parsed.libCode) setMyPrimaryLib(parsed);
        else throw new Error('Invalid lib data');
      } catch (e) { 
        console.error('Restore lib error, resetting to default', e);
        setMyPrimaryLib({ libCode: '131557', libName: '남양주시 별빛도서관', address: '경기도 남양주시 별내중앙로 102', homepage: 'https://lib.nyj.go.kr/bnae' });
      }
    } else {
      // 기본값: 남양주시 별빛도서관
      setMyPrimaryLib({ libCode: '131557', libName: '남양주시 별빛도서관', address: '경기도 남양주시 별내중앙로 102', homepage: 'https://lib.nyj.go.kr/bnae' });
    }
    
    if (savedRegion) setSelectedRegion(savedRegion);
    else setSelectedRegion('31');

    if (savedSubRegion) setSelectedSubRegion(savedSubRegion);
    else setSelectedSubRegion('31130');

    // 히스토리 파싱 보호
    try {
      const history = localStorage.getItem('library_history');
      if (history) JSON.parse(history); // 유효성 검사만 수행
    } catch (e) {
      localStorage.removeItem('library_history'); // 깨진 데이터 삭제
    }

    // 읽음 상태 복구
    const name = initialLibraryName || localStorage.getItem('library_owner_name');
    if (name) {
      try {
        const stored = localStorage.getItem(`read_books_${name}`);
        if (stored) setReadDates(JSON.parse(stored));
      } catch { /* 무시 */ }
    }

    isInitialMount.current = false;
  }, [initialLibraryName]);

  // DB → localStorage 동기화: 책 데이터가 로드될 때 read_at 컬럼 감지 및 병합
  useEffect(() => {
    if (!data || !libraryName) return;
    const flat = data.pages.flatMap(page => page.data || []);
    if (flat.length === 0) return;

    // read_at 컬럼 존재 여부: Supabase select('*')는 존재하지 않는 컬럼을 반환하지 않음
    const columnExists = 'read_at' in flat[0];
    setDbSyncAvailable(columnExists);

    if (!columnExists) return;

    // DB에 읽음 기록이 있는 책만 localStorage에 병합 (없는 것은 건드리지 않음)
    setReadDates(prev => {
      const next = { ...prev };
      let changed = false;
      flat.forEach(book => {
        if (!book.id || !book.read_at) return;
        // DB 값이 있고 localStorage에 없거나, DB가 더 최신인 경우 적용
        if (!next[book.id] || next[book.id] < book.read_at) {
          next[book.id] = book.read_at;
          changed = true;
        }
      });
      if (changed) {
        try { localStorage.setItem(`read_books_${libraryName}`, JSON.stringify(next)); } catch { /* 무시 */ }
      }
      return changed ? next : prev;
    });
  }, [data, libraryName]);

  const setLibrary = useCallback(async (name: string, primaryLib?: LibraryInfo) => {
    const finalName = normalizeName(name);
    setLibraryName(finalName);
    try { localStorage.setItem('library_owner_name', finalName); } catch { /* Safari 개인정보 모드 등 쓰기 불가 시 무시 */ }
    await setLibraryCookieAction(finalName);

    if (primaryLib) {
      setMyPrimaryLib(primaryLib);
      try {
        localStorage.setItem('my_primary_lib', JSON.stringify(primaryLib));
        localStorage.setItem('my_region', selectedRegion);
        localStorage.setItem('my_sub_region', selectedSubRegion);
      } catch { /* QuotaExceededError 등 무시 */ }
    }

    // Bug 1 fix: JSON.parse 실패(깨진 데이터) 시 빈 배열로 폴백
    let parsedHistory: string[] = [];
    try {
      const history = localStorage.getItem('library_history');
      parsedHistory = history ? JSON.parse(history) : [];
    } catch { /* 깨진 JSON 무시 → 빈 배열로 초기화 */ }
    const newHistory = [finalName, ...parsedHistory.filter(h => h !== finalName)].slice(0, 5);
    try { localStorage.setItem('library_history', JSON.stringify(newHistory)); } catch { /* 무시 */ }
  }, [selectedRegion, selectedSubRegion]);

  const checkExists = useCallback(async (name: string) => {
    const finalName = normalizeName(name);
    if (finalName.length < 2) return { exists: false, error: null };
    const { exists, error } = await checkLibraryExistsAction(finalName);
    return { exists: exists ?? false, error: error || null };
  }, []);

  const login = useCallback(async (name: string, password: string, isExisting: boolean) => {
    const finalName = normalizeName(name);
    
    if (isExisting) {
      const { error } = await verifyLibraryPasswordAction(finalName, password);
      if (error) return { success: false, error: error === 'PASSWORD_INCORRECT' ? '비밀번호가 올바르지 않습니다.' : error };
    } else {
      const { error } = await createLibraryAction(finalName, password);
      if (error) return { success: false, error };
    }

    await setLibrary(finalName, myPrimaryLib || undefined);
    return { success: true, error: null };
  }, [myPrimaryLib, setLibrary]);

  const logout = useCallback(async () => {
    if (libraryName) {
      // 로그아웃 시 읽음 상태는 유지 (재로그인 후 복구됨)
    }
    setLibraryName(null);
    setMyPrimaryLib(null);
    setSelectedRegion('31');
    setSelectedSubRegion('31130');
    setReadDates({});

    queryClient.clear();

    localStorage.removeItem('library_owner_name');
    localStorage.removeItem('my_primary_lib');
    localStorage.removeItem('my_region');
    localStorage.removeItem('my_sub_region');
    localStorage.removeItem('last_search_query');
    localStorage.removeItem('save_mode');

    await clearLibraryCookieAction();
  }, [queryClient, libraryName]);

  // 세션 만료 감지: queryFn 밖에서 처리하여 React Query 순수성 유지
  useEffect(() => {
    if (queryError instanceof Error) {
      const msg = queryError.message;
      if (msg.includes('세션이 만료') || msg.includes('인증 세션')) {
        showToast('세션이 만료됐습니다. 다시 로그인해 주세요.', 'error');
        logout();
      }
    }
  }, [queryError, logout, showToast]);

  const updatePrimaryLib = useCallback((lib: LibraryInfo, region: string, subRegion: string) => {
    setMyPrimaryLib(lib);
    setSelectedRegion(region);
    setSelectedSubRegion(subRegion);

    if (lib) localStorage.setItem('my_primary_lib', JSON.stringify(lib));
    localStorage.setItem('my_region', region);
    localStorage.setItem('my_sub_region', subRegion);
  }, []);

  const refreshBooks = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const loadMoreBooks = useCallback(async () => {
    if (hasNextPage && !isFetchingNextPage) {
      await fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const setSort = useCallback((column: SortColumn, order: SortOrder) => {
    setSortColumn(column);
    setSortOrder(order);
  }, []);

  // Optimistic UI support
  const addBookOptimistic = useCallback((book: SavedBook) => {
    const queryKey = ['books', libraryName, sortColumn, sortOrder];
    
    const optimisticBook = {
      ...book,
      id: book.id || -(Date.now() + Math.floor(Math.random() * 1000)),
      created_at: book.created_at || new Date().toISOString()
    };

    queryClient.setQueryData(queryKey, (oldData: InfiniteData<{ data: SavedBook[]; totalCount: number }> | undefined) => {
      if (!oldData) return {
        pages: [{ data: [optimisticBook], totalCount: 1 }],
        pageParams: [1]
      };
      
      const newPages = [...oldData.pages];
      newPages[0] = {
        ...newPages[0],
        data: [optimisticBook, ...(newPages[0].data || [])],
        totalCount: (newPages[0].totalCount || 0) + 1
      };
      
      return { ...oldData, pages: newPages };
    });
    
    return optimisticBook.id;
  }, [queryClient, libraryName, sortColumn, sortOrder]);

  const removeBookOptimistic = useCallback((bookId: number) => {
    const queryKey = ['books', libraryName, sortColumn, sortOrder];
    queryClient.setQueryData(queryKey, (oldData: InfiniteData<{ data: SavedBook[]; totalCount: number }> | undefined) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        pages: oldData.pages.map((page) => ({
          ...page,
          data: page.data.filter((b: SavedBook) => b.id !== bookId),
          totalCount: Math.max(0, (page.totalCount || 0) - 1)
        }))
      };
    });
  }, [queryClient, libraryName, sortColumn, sortOrder]);

  const updateBookOptimistic = useCallback((bookId: number, data: Partial<SavedBook>) => {
    const queryKey = ['books', libraryName, sortColumn, sortOrder];
    queryClient.setQueryData(queryKey, (oldData: InfiniteData<{ data: SavedBook[]; totalCount: number }> | undefined) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        pages: oldData.pages.map((page) => ({
          ...page,
          data: page.data.map((b: SavedBook) => b.id === bookId ? { ...b, ...data } : b)
        }))
      };
    });
  }, [queryClient, libraryName, sortColumn, sortOrder]);

  const markBookAsRead = useCallback(async (bookId: number, isRead: boolean, customReadAt?: string | null) => {
    // customReadAt이 주어지면 해당 날짜, 없으면 현재 시각으로 기록
    const newReadAt = isRead ? (customReadAt ?? new Date().toISOString()) : null;

    // 1) localStorage 즉시 업데이트 (낙관적 UI)
    setReadDates(prev => {
      const next = { ...prev };
      if (isRead && newReadAt) next[bookId] = newReadAt;
      else delete next[bookId];
      if (libraryName) {
        try { localStorage.setItem(`read_books_${libraryName}`, JSON.stringify(next)); } catch { /* 무시 */ }
      }
      return next;
    });

    // 2) DB 저장 시도 — 결과를 확인하여 동기화 상태 갱신
    if (libraryName) {
      const result = await markBookAsReadAction(bookId, isRead, libraryName, newReadAt);
      if (result.success) {
        setDbSyncAvailable(true);
        // DB 성공 시 React Query 캐시도 동기화 (refetch 없이 즉시 반영)
        const queryKey = ['books', libraryName, sortColumn, sortOrder];
        queryClient.setQueryData(queryKey, (oldData: InfiniteData<{ data: SavedBook[]; totalCount: number }> | undefined) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map(page => ({
              ...page,
              data: page.data.map((b: SavedBook) =>
                b.id === bookId ? { ...b, read_at: newReadAt } : b
              )
            }))
          };
        });
      } else {
        // DB 컬럼 없거나 권한 오류 → localStorage만 사용 중임을 표시
        setDbSyncAvailable(false);
      }
    }
  }, [libraryName, sortColumn, sortOrder, queryClient]);

  return (
    <LibraryContext.Provider value={{
      libraryName,
      myPrimaryLib,
      selectedRegion,
      selectedSubRegion,
      savedBooks,
      isLoading: isQueryLoading,
      isFetchingNextPage,
      totalBooksCount,
      hasMoreBooks: !!hasNextPage,
      setLibrary,
      login,
      logout,
      updatePrimaryLib,
      refreshBooks,
      loadMoreBooks,

      checkExists,
      addBookOptimistic,
      removeBookOptimistic,
      updateBookOptimistic,
      markBookAsRead,
      dbSyncAvailable,
      sortColumn,
      sortOrder,
      setSort
    }}>
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  const context = useContext(LibraryContext);
  if (context === undefined) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return context;
}
