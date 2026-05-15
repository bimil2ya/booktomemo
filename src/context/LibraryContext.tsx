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
  createLibraryAction
} from '@/app/actions';
import { useInfiniteQuery, useQueryClient, InfiniteData } from '@tanstack/react-query';


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
  const [libraryName, setLibraryName] = useState<string | null>(initialLibraryName);
  const [myPrimaryLib, setMyPrimaryLib] = useState<LibraryInfo | null>(null);
  const [selectedRegion, setSelectedRegion] = useState('31');
  const [selectedSubRegion, setSelectedSubRegion] = useState('31130');
  
  const [sortColumn, setSortColumn] = useState<SortColumn>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
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

  // Flattened books from all pages (useMemo optimized)
  const savedBooks = useMemo(() => {
    if (!data) return [];
    return data.pages.reduce((acc: SavedBook[], page) => {
      if (page.data) return [...acc, ...page.data];
      return acc;
    }, []);
  }, [data]);

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

    isInitialMount.current = false;
  }, [initialLibraryName]);

  const setLibrary = useCallback(async (name: string, primaryLib?: LibraryInfo) => {
    const finalName = normalizeName(name);
    setLibraryName(finalName);
    localStorage.setItem('library_owner_name', finalName);
    await setLibraryCookieAction(finalName);

    if (primaryLib) {
      setMyPrimaryLib(primaryLib);
      localStorage.setItem('my_primary_lib', JSON.stringify(primaryLib));
      localStorage.setItem('my_region', selectedRegion);
      localStorage.setItem('my_sub_region', selectedSubRegion);
    }

    const history = localStorage.getItem('library_history');
    const parsedHistory: string[] = history ? JSON.parse(history) : [];
    const newHistory = [finalName, ...parsedHistory.filter(h => h !== finalName)].slice(0, 5);
    localStorage.setItem('library_history', JSON.stringify(newHistory));
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
    setLibraryName(null);
    setMyPrimaryLib(null);
    setSelectedRegion('31');
    setSelectedSubRegion('31130');
    
    queryClient.clear();
    
    localStorage.removeItem('library_owner_name');
    localStorage.removeItem('my_primary_lib');
    localStorage.removeItem('my_region');
    localStorage.removeItem('my_sub_region');
    localStorage.removeItem('last_search_query');
    localStorage.removeItem('save_mode');
    
    await clearLibraryCookieAction();
  }, [queryClient]);

  // 세션 만료 감지: queryFn 밖에서 처리하여 React Query 순수성 유지
  useEffect(() => {
    if (queryError instanceof Error) {
      const msg = queryError.message;
      if (msg.includes('세션이 만료') || msg.includes('인증 세션')) {
        logout();
      }
    }
  }, [queryError, logout]);

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
