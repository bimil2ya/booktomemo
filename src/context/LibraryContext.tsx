'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { SavedBook, SortColumn, SortOrder } from '@/types';
import { 
  getBooksAction, 
  setLibraryCookieAction, 
  clearLibraryCookieAction,
  checkLibraryExistsAction,
  verifyLibraryPasswordAction,
  createLibraryAction
} from '@/app/actions';
import { normalizeName } from '@/utils/helpers';
import { useInfiniteQuery, useQueryClient, InfiniteData } from '@tanstack/react-query';

interface LibraryContextType {
  libraryName: string | null;
  myPrimaryLib: { code: string; name: string } | null;
  selectedRegion: string;
  selectedSubRegion: string;
  savedBooks: SavedBook[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  totalBooksCount: number;
  hasMoreBooks: boolean;

  setLibrary: (name: string, primaryLib?: { code: string; name: string }) => Promise<void>;
  login: (name: string, password: string, isExisting: boolean) => Promise<{ success: boolean; error: string | null }>;
  logout: () => Promise<void>;
  updatePrimaryLib: (lib: { code: string; name: string }, region: string, subRegion: string) => void;
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
  const [myPrimaryLib, setMyPrimaryLib] = useState<{ code: string; name: string } | null>(null);
  const [selectedRegion, setSelectedRegion] = useState('31');
  const [selectedSubRegion, setSelectedSubRegion] = useState('31130');
  
  const [sortColumn, setSortColumn] = useState<SortColumn>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  const PAGE_SIZE = 20;

  // React Query - Infinite Query for Books
  const {
    data,
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
      const loadedCount = allPages.flatMap(page => page.data || []).length;
      if (loadedCount < (lastPage.totalCount || 0)) {
        return allPages.length + 1;
      }
      return undefined;
    },
    enabled: !!libraryName,
  });

  // Flattened books from all pages
  const savedBooks = useMemo(() => {
    return data?.pages.flatMap(page => page.data || []) || [];
  }, [data]);

  const totalBooksCount = data?.pages[0]?.totalCount || 0;

  useEffect(() => {
    if (initialLibraryName) {
      localStorage.setItem('library_owner_name', initialLibraryName);
    } else {
      const savedName = localStorage.getItem('library_owner_name');
      if (savedName) setLibraryName(normalizeName(savedName));
    }

    const savedLib = localStorage.getItem('my_primary_lib');
    const savedRegion = localStorage.getItem('my_region');
    const savedSubRegion = localStorage.getItem('my_sub_region');

    if (savedLib) setMyPrimaryLib(JSON.parse(savedLib));
    if (savedRegion) setSelectedRegion(savedRegion);
    if (savedSubRegion) setSelectedSubRegion(savedSubRegion);

    if (!savedLib && !initialLibraryName && !localStorage.getItem('library_owner_name')) {
      setMyPrimaryLib({ code: '131557', name: '남양주시 별빛도서관' });
    }
  }, [initialLibraryName]);

  const setLibrary = useCallback(async (name: string, primaryLib?: { code: string; name: string }) => {
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
    queryClient.clear();
    localStorage.removeItem('library_owner_name');
    await clearLibraryCookieAction();
  }, [queryClient]);

  const updatePrimaryLib = useCallback((lib: { code: string; name: string }, region: string, subRegion: string) => {
    setMyPrimaryLib(lib);
    setSelectedRegion(region);
    setSelectedSubRegion(subRegion);

    localStorage.setItem('my_primary_lib', JSON.stringify(lib));
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

  // Optimistic UI support - Manual cache manipulation
  const addBookOptimistic = useCallback((book: SavedBook) => {
    const queryKey = ['books', libraryName, sortColumn, sortOrder];
    
    // ID가 없으면 임시 ID 부여 (낙관적 UI용)
    const optimisticBook = {
      ...book,
      id: book.id || -(Date.now() + Math.floor(Math.random() * 1000)), // 고유한 임시 ID 생성
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
      
      return {
        ...oldData,
        pages: newPages
      };
    });
    
    return optimisticBook.id; // 부여된 ID 반환
  }, [queryClient, libraryName, sortColumn, sortOrder]);

  const removeBookOptimistic = useCallback((bookId: number) => {
    // Proper React Query Optimistic Update
    const queryKey = ['books', libraryName, sortColumn, sortOrder];
    queryClient.setQueryData(queryKey, (oldData: InfiniteData<{ data: SavedBook[]; totalCount: number }> | undefined) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        pages: oldData.pages.map((page: { data: SavedBook[]; totalCount: number }) => ({
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
        pages: oldData.pages.map((page: { data: SavedBook[]; totalCount: number }) => ({
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