'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Search, Trash2, Edit2, Check, Smartphone, Database, Library, BookOpen, ChevronUp, ChevronDown, LogOut, X, List, LayoutGrid, Clock, MapPin, Building2, Loader2 } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import axios from 'axios';
import { getBooksAction, saveBookAction, updateBookAction, deleteBookAction, deleteBooksAction, searchLibrariesAction, checkBookAvailabilityAction, searchLibrariesByBookAction } from './actions';

interface Book {
  title: string;
  authors: string[];
  thumbnail: string;
  contents: string;
  publisher: string;
  isbn: string;
}

interface SavedBook {
  id?: number;
  created_at?: string;
  isbn: string;
  title: string;
  authors: string;
  thumbnail: string;
  contents: string;
  publisher: string;
  personal_memo?: string;
  owner_name: string;
}

interface LibraryInfo {
  libCode: string;
  libName: string;
  address: string;
}

interface LibApiResponse {
  lib: LibraryInfo;
}

type SortColumn = 'created_at' | 'title' | 'authors' | 'publisher';
type SortOrder = 'asc' | 'desc';

// 광역시도 데이터
const REGIONS = [
  { code: '11', name: '서울' }, { code: '21', name: '부산' }, { code: '22', name: '대구' },
  { code: '23', name: '인천' }, { code: '24', name: '광주' }, { code: '25', name: '대전' },
  { code: '26', name: '울산' }, { code: '29', name: '세종' }, { code: '31', name: '경기' },
  { code: '32', name: '강원' }, { code: '33', name: '충북' }, { code: '34', name: '충남' },
  { code: '35', name: '전북' }, { code: '36', name: '전남' }, { code: '37', name: '경북' },
  { code: '38', name: '경남' }, { code: '39', name: '제주' }
];

// 주요 시군구 데이터 (경기 남양주 등 예시 포함)
const SUB_REGIONS: Record<string, { code: string; name: string }[]> = {
  '31': [
    { code: '31130', name: '남양주시' }, { code: '31010', name: '수원시' }, { code: '31100', name: '고양시' },
    { code: '31120', name: '구리시' }, { code: '31180', name: '하남시' }, { code: '31190', name: '용인시' },
    { code: '31240', name: '화성시' }, { code: '31020', name: '성남시' }, { code: '31030', name: '의정부시' }
  ],
  '11': [
    { code: '11230', name: '강남구' }, { code: '11240', name: '송파구' }, { code: '11250', name: '강동구' },
    { code: '11140', name: '마포구' }, { code: '11110', name: '노원구' }, { code: '11010', name: '종로구' }
  ]
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<'search' | 'library'>('search');
  const [libraryName, setLibraryName] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [libraryHistory, setLibraryHistory] = useState<string[]>([]);
  
  // 도서관 설정 상태
  const [selectedRegion, setSelectedRegion] = useState('31'); // 경기 기본
  const [selectedSubRegion, setSelectedSubRegion] = useState('31130'); // 남양주 기본
  const [availableLibs, setAvailableLibs] = useState<LibraryInfo[]>([]);
  const [searchLibLoading, setSearchLibLoading] = useState(false);
  const [myPrimaryLib, setMyPrimaryLib] = useState<{code: string, name: string} | null>(null);

  const [query, setQuery] = useState('');
  const [books, setBooks] = useState<Book[]>([]);
  const [savedBooks, setSavedBooks] = useState<SavedBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingIsbn, setSavingIsbn] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [saveMode, setSaveMode] = useState<'shortcut' | 'native'>('native');
  
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<SavedBook>>({});
  
  const [sortColumn, setSortColumn] = useState<SortColumn>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const [swipingId, setSwipingId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const touchStartX = useRef<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const KAKAO_KEY = "75db26230fefcfdb7c8802f4f6913ec3";
  const VERSION = "v1.6.0";

  // 상세 모달 도서관 정보 상태
  const [availabilityStatus, setAvailabilityStatus] = useState<{
    status: 'loading' | 'available' | 'loaned' | 'not_found' | 'error';
    otherLibs?: string[];
  } | null>(null);

  // 이름 정규화 함수
  const normalizeName = (name: string) => {
    return name.replace(/\s*의\s*서재\s*$/, '').replace(/\s*의서재\s*$/, '').trim();
  };

  // 상세 모달 상태
  const [selectedBook, setSelectedBook] = useState<SavedBook | Book | null>(null);

  // 초기 마운트 시 설정 불러오기
  useEffect(() => {
    setIsMounted(true);
    const savedName = localStorage.getItem('library_owner_name');
    if (savedName) setLibraryName(normalizeName(savedName));

    const history = localStorage.getItem('library_history');
    if (history) {
      const parsedHistory: string[] = JSON.parse(history);
      const normalizedHistory = Array.from(new Set(parsedHistory.map(normalizeName)));
      setLibraryHistory(normalizedHistory);
    }

    const savedLib = localStorage.getItem('my_primary_lib');
    if (savedLib) setMyPrimaryLib(JSON.parse(savedLib));

    const lastMode = localStorage.getItem('save_mode') as 'shortcut' | 'native';
    if (lastMode) setSaveMode(lastMode);

    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q && q !== '' && q !== '[') {
      setQuery(q);
      searchBooks(q, false);
    }
  }, []);

  // 탭 변경 시 선택 초기화
  useEffect(() => {
    setSelectedIds([]);
  }, [activeTab]);

  // 도서관 목록 검색 (설정 시)
  const fetchLibraries = useCallback(async () => {
    setSearchLibLoading(true);
    const { data, error } = await searchLibrariesAction(selectedRegion, selectedSubRegion);
    if (!error && data) {
      setAvailableLibs(data.map((item: LibApiResponse) => ({
        libCode: item.lib.libCode,
        libName: item.lib.libName,
        address: item.lib.address
      })));
    }
    setSearchLibLoading(false);
  }, [selectedRegion, selectedSubRegion]);

  useEffect(() => {
    if (!libraryName) {
      fetchLibraries();
    }
  }, [libraryName, fetchLibraries]);

  // 도서관 소장 여부 확인 로직
  const checkAvailability = useCallback(async (book: SavedBook | Book) => {
    if (!myPrimaryLib) return;
    
    // ISBN13 추출 (카카오 API 응답에서 13자리 숫자 찾기)
    const isbn13 = book.isbn.split(' ').find(s => s.length === 13);
    if (!isbn13) {
      setAvailabilityStatus({ status: 'error' });
      return;
    }

    setAvailabilityStatus({ status: 'loading' });
    
    try {
      // 1. 주 도서관 확인
      const { data: avail, error: availError } = await checkBookAvailabilityAction(isbn13, myPrimaryLib.code);
      
      if (availError) throw new Error(availError);

      if (avail.hasBook === 'Y') {
        setAvailabilityStatus({ 
          status: avail.loanAvailable === 'Y' ? 'available' : 'loaned' 
        });
      } else {
        // 2. 상호대차 (해당 시군구 전체) 확인
        const { data: others, error: othersError } = await searchLibrariesByBookAction(isbn13, selectedRegion, selectedSubRegion);
        if (othersError) throw othersError;

        if (others && others.length > 0) {
          setAvailabilityStatus({ 
            status: 'not_found', 
            otherLibs: others.map((l: LibApiResponse) => l.lib.libName) 
          });
        } else {
          setAvailabilityStatus({ status: 'not_found', otherLibs: [] });
        }
      }
    } catch (e) {
      console.error(e);
      setAvailabilityStatus({ status: 'error' });
    }
  }, [myPrimaryLib, selectedRegion, selectedSubRegion]);

  useEffect(() => {
    if (selectedBook) {
      checkAvailability(selectedBook);
    } else {
      setAvailabilityStatus(null);
    }
  }, [selectedBook, checkAvailability]);

  // 도서 목록 가져오기 (Supabase)
  const fetchSavedBooks = useCallback(async () => {
    if (!libraryName) return;
    try {
      const { data, error } = await getBooksAction(libraryName, sortColumn, sortOrder);
      if (error) throw new Error(error);
      setSavedBooks(data || []);
    } catch (error) {
      console.error('Error fetching books:', error);
    }
  }, [libraryName, sortColumn, sortOrder]);

  useEffect(() => {
    if (libraryName) {
      fetchSavedBooks();
    }
  }, [libraryName, fetchSavedBooks]);

  // 정렬이 변경될 때마다 다시 가져오기
  useEffect(() => {
    if (libraryName) fetchSavedBooks();
  }, [sortColumn, sortOrder, libraryName, fetchSavedBooks]);

  const handleEnterLibrary = (selectedName?: string) => {
    const rawName = selectedName || nameInput.trim() || '경호';
    const finalName = normalizeName(rawName);
    
    if (!finalName) return;
    if (!myPrimaryLib && !selectedName) {
      alert('도서관을 먼저 선택해주세요.');
      return;
    }

    localStorage.setItem('library_owner_name', finalName);
    if (myPrimaryLib) {
      localStorage.setItem('my_primary_lib', JSON.stringify(myPrimaryLib));
      localStorage.setItem('my_region', selectedRegion);
      localStorage.setItem('my_sub_region', selectedSubRegion);
    }
    
    // 히스토리 업데이트
    const newHistory = [finalName, ...libraryHistory.filter(h => h !== finalName)].slice(0, 5);
    localStorage.setItem('library_history', JSON.stringify(newHistory));
    setLibraryHistory(newHistory);
    
    setLibraryName(finalName);
    setNameInput('');
  };

  const handleLogout = () => {
    if (confirm('서재에서 나가시겠습니까?')) {
      localStorage.removeItem('library_owner_name');
      setLibraryName(null);
      setNameInput('');
      setSavedBooks([]);
    }
  };

  const removeFromHistory = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    const newHistory = libraryHistory.filter(h => h !== name);
    localStorage.setItem('library_history', JSON.stringify(newHistory));
    setLibraryHistory(newHistory);
  };

  const toggleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortOrder('asc');
    }
  };

  const searchBooks = async (searchQuery: string, updateUrl = true) => {
    if (!searchQuery || searchQuery.trim() === '[') return;
    setLoading(true);
    
    if (updateUrl && typeof window !== 'undefined') {
      localStorage.setItem('last_search_query', searchQuery);
      const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?q=' + encodeURIComponent(searchQuery);
      window.history.replaceState({ path: newUrl }, '', newUrl);
    }

    try {
      const res = await axios.get("https://dapi.kakao.com/v3/search/book", {
        params: { query: searchQuery },
        headers: { Authorization: "KakaoAK " + KAKAO_KEY }
      });
      setBooks(res.data.documents || []);
    } catch (error) {
      console.error('Search failed:', error);
      alert('검색 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    setOcrLoading(true);
    try {
      const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true };
      const compressedFile = await imageCompression(rawFile, options);
      const formData = new FormData();
      formData.append('image', compressedFile);

      const res = await axios.post("/api/ocr", formData);
      const data = res.data;

      if (data.title || data.author) {
        const optimizedQuery = `${data.title} ${data.author}`.trim();
        setQuery(optimizedQuery);
        searchBooks(optimizedQuery);
      } else {
        alert('이미지에서 책 정보를 찾지 못했습니다.');
      }
    } catch (error: unknown) {
      console.error('OCR Error:', error);
      alert('사진 인식 중 오류가 발생했습니다. 직접 검색을 이용해 주세요.');
    } finally {
      setOcrLoading(false);
    }
  };

  const handleSave = async (book: Book) => {
    if (!libraryName) return;
    
    setSavingIsbn(book.isbn);
    try {
      const newBook: Omit<SavedBook, 'id' | 'created_at'> = {
        isbn: book.isbn,
        title: book.title,
        authors: book.authors.join(', '),
        thumbnail: book.thumbnail || '',
        contents: book.contents || '',
        publisher: book.publisher || '',
        owner_name: libraryName
      };

      const { error } = await saveBookAction(newBook);

      if (error === 'ALREADY_EXISTS') {
        alert('이미 저장된 책입니다.');
        return;
      }

      if (error) throw new Error(error);

      if (saveMode === 'shortcut') {
        const url = "shortcuts://run-shortcut?name=BookToMemo&input=text&text=" + 
                    encodeURIComponent(JSON.stringify({ ...newBook, query }));
        window.location.href = url;
      } else {
        alert('서재에 저장되었습니다.');
      }
      fetchSavedBooks();
    } catch (error: unknown) {
      console.error('Save Error:', error);
      let errorMsg = 'Unknown error';
      if (error instanceof Error) {
        errorMsg = error.message;
      }
      alert(`저장 실패: ${errorMsg}\n\n네트워크 연결 상태를 확인하고 잠시 후 다시 시도해 주세요.`);
    } finally {
      setSavingIsbn(null);
    }
  };

  const testConnection = async () => {
    try {
      const { error } = await getBooksAction('test', 'created_at', 'desc');
      if (!error) {
        alert('서버 연결 성공! 데이터베이스와 정상적으로 통신하고 있습니다.');
      } else {
        throw new Error(error);
      }
    } catch (error: unknown) {
      let errorMsg = '알 수 없는 오류';
      if (error instanceof Error) {
        errorMsg = error.message;
      }
      alert(`서버 연결 실패: ${errorMsg}`);
    }
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      const { error } = await updateBookAction(Number(editingId), editFormData);
      if (error) throw new Error(error);
      setEditingId(null);
      fetchSavedBooks();
    } catch (error: unknown) {
      let errorMsg = '알 수 없는 오류';
      if (error instanceof Error) {
        errorMsg = error.message;
      }
      alert('수정 중 오류가 발생했습니다: ' + errorMsg);
    }
  };

  const deleteSavedBook = async (id: number) => {
    if (!confirm('보관함에서 삭제하시겠습니까?')) return;
    try {
      const { error } = await deleteBookAction(id);
      if (error) throw new Error(error);
      setSelectedIds(prev => prev.filter(item => item !== id));
      fetchSavedBooks();
    } catch (error: unknown) {
      let errorMsg = '알 수 없는 오류';
      if (error instanceof Error) {
        errorMsg = error.message;
      }
      alert('삭제 중 오류가 발생했습니다: ' + errorMsg);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === savedBooks.length && savedBooks.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(savedBooks.map(book => book.id!));
    }
  };

  const deleteSelectedBooks = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`선택한 ${selectedIds.length}권의 책을 삭제하시겠습니까?`)) return;
    
    try {
      const { error } = await deleteBooksAction(selectedIds);
      if (error) throw new Error(error);
      setSelectedIds([]);
      fetchSavedBooks();
      alert('선택한 책들이 삭제되었습니다.');
    } catch (error: unknown) {
      let errorMsg = '알 수 없는 오류';
      if (error instanceof Error) {
        errorMsg = error.message;
      }
      alert('삭제 중 오류가 발생했습니다: ' + errorMsg);
    }
  };

  if (!isMounted) return <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950" />;

  // 1. 이름 및 도서관 설정 화면 (로그인 전)
  if (!libraryName) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-xl space-y-6 overflow-hidden">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mx-auto">
              <Library className="w-8 h-8 text-purple-600" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">나만의 서재 만들기</h1>
            <p className="text-zinc-500 text-sm">사용하실 서재 이름을 입력하고<br/>주로 이용하는 도서관을 선택해주세요.</p>
          </div>
          
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 ml-1">서재 주인 이름</label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="예: 경호"
                  className="w-full px-4 py-3 rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="space-y-3 bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-purple-500" />
                  <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">내 동네 도서관 찾기</span>
                </div>
                
                <div className="flex gap-2">
                  <select 
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                    className="flex-1 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-lg text-xs p-2 focus:ring-purple-500"
                  >
                    {REGIONS.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
                  </select>
                  <select 
                    value={selectedSubRegion}
                    onChange={(e) => setSelectedSubRegion(e.target.value)}
                    className="flex-1 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-lg text-xs p-2 focus:ring-purple-500"
                  >
                    {(SUB_REGIONS[selectedRegion] || [{code: '', name: '전체'}]).map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                  </select>
                </div>

                <div className="relative">
                  <div className="max-h-40 overflow-y-auto pr-1 no-scrollbar space-y-1.5 mt-2">
                    {searchLibLoading ? (
                      <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 text-purple-500 animate-spin" /></div>
                    ) : availableLibs.length > 0 ? (
                      availableLibs.map(lib => (
                        <div 
                          key={lib.libCode}
                          onClick={() => setMyPrimaryLib({code: lib.libCode, name: lib.libName})}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${myPrimaryLib?.code === lib.libCode ? 'bg-purple-600 border-purple-600 text-white shadow-md' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-purple-300'}`}
                        >
                          <div className="text-[11px] font-bold truncate">{lib.libName}</div>
                          <div className={`text-[9px] mt-0.5 opacity-70 truncate ${myPrimaryLib?.code === lib.libCode ? 'text-white' : 'text-zinc-400'}`}>{lib.address}</div>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center text-[10px] text-zinc-400">조회된 도서관이 없습니다.</div>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleEnterLibrary()}
                disabled={!nameInput.trim() || !myPrimaryLib}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${(!nameInput.trim() || !myPrimaryLib) ? 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800' : 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg'}`}
              >
                서재 들어가기
              </button>
            </div>

            {libraryHistory.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <p className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5 px-1">
                  <Clock className="w-3 h-3" /> 최근 접속한 서재
                </p>
                <div className="flex flex-wrap gap-2">
                  {libraryHistory.map((name) => (
                    <div 
                      key={name}
                      onClick={() => handleEnterLibrary(name)}
                      className="group flex items-center gap-2 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 rounded-full border border-zinc-200 dark:border-zinc-700 cursor-pointer hover:border-purple-300 dark:hover:border-purple-900/50 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all"
                    >
                      <span className="text-sm font-bold text-zinc-600 dark:text-zinc-300">{name}의 서재</span>
                      <button 
                        onClick={(e) => removeFromHistory(e, name)}
                        className="p-1 text-zinc-400 hover:text-red-500 transition-all rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2. 메인 화면 (로그인 후)
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-32 font-sans transition-colors">
      <div className="max-w-4xl mx-auto p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button 
            onClick={testConnection}
            className="text-[10px] font-mono text-zinc-300 dark:text-zinc-700 hover:text-purple-500 transition-colors"
          >
            {VERSION} [연결 확인]
          </button>
          <div className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-[10px] font-bold text-zinc-500">
            {libraryName}의 서재
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'search' && (
            <button 
              onClick={() => {
                const newMode = saveMode === 'shortcut' ? 'native' : 'shortcut';
                setSaveMode(newMode);
                localStorage.setItem('save_mode', newMode);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-900 rounded-full border border-zinc-200 dark:border-zinc-800 text-[10px] font-bold text-zinc-600 dark:text-zinc-400 shadow-sm"
            >
              {saveMode === 'shortcut' ? <Smartphone className="w-3 h-3 text-blue-500" /> : <Database className="w-3 h-3 text-purple-500" />}
              {saveMode === 'shortcut' ? '단축어 모드' : '자체 저장'}
            </button>
          )}
          <button onClick={handleLogout} className="p-2 text-zinc-400 hover:text-red-500 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4">
        {activeTab === 'search' ? (
          <div className="space-y-8 max-w-lg mx-auto">
            <header className="text-center space-y-2 pt-4">
              <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">읽고픈 책들</h1>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                {saveMode === 'shortcut' ? '검색하고 애플 메모로 전송' : '검색하고 클라우드 서재에 저장'}
              </p>
            </header>

            <form onSubmit={(e) => { e.preventDefault(); searchBooks(query); }} className="flex flex-col gap-3">
              <div className="relative group">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="책 제목, 저자 입력..."
                  className="w-full pl-12 pr-16 py-4 rounded-2xl border-none bg-white dark:bg-zinc-900 shadow-xl shadow-zinc-200/50 dark:shadow-none text-lg text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-purple-500"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-zinc-500">
                  {ocrLoading ? <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /> : <Camera className="w-5 h-5" />}
                </button>
              </div>
              <button type="submit" disabled={loading || !query} className={`w-full py-4 text-white rounded-2xl font-bold text-lg shadow-lg ${saveMode === 'shortcut' ? 'bg-blue-600' : 'bg-purple-600'}`}>
                {loading ? '검색 중...' : '검색 시작'}
              </button>
            </form>
            <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" />

            <div className="grid gap-3">
              {books.map((book, idx) => (
                <div key={idx} onClick={() => setSelectedBook(book)} className="flex gap-4 p-3 bg-white dark:bg-zinc-900 rounded-[1.5rem] border border-zinc-100 dark:border-zinc-800 shadow-sm cursor-pointer hover:border-purple-200 dark:hover:border-purple-900/50 transition-all">
                  <img src={book.thumbnail || '/file.svg'} className="w-16 h-24 object-cover rounded-xl shadow-xs flex-none" alt={book.title} />
                  <div className="flex-1 flex flex-col justify-center min-w-0">
                    <div className="space-y-0.5">
                      <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-50 truncate leading-tight">{book.title}</h3>
                      <p className="text-purple-600 text-[11px] font-bold truncate">{book.authors.join(', ')}</p>
                      <p className="text-zinc-400 text-[9px]">{book.publisher}</p>
                      <p className="text-zinc-500 text-[11px] line-clamp-1 leading-relaxed">{book.contents}</p>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleSave(book); }} 
                      disabled={savingIsbn === book.isbn}
                      className={`mt-2 w-full py-1.5 text-white rounded-lg text-[11px] font-bold transition-all ${savingIsbn === book.isbn ? 'bg-zinc-400 animate-pulse' : (saveMode === 'shortcut' ? 'bg-zinc-900' : 'bg-purple-600')}`}
                    >
                      {savingIsbn === book.isbn ? '저장 중...' : (saveMode === 'shortcut' ? '애플 메모로 보내기' : '서재에 저장')}
                    </button>
                  </div>
                </div>
              ))}
              {!loading && query && books.length === 0 && (
                <div className="py-20 text-center space-y-4">
                  <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto">
                    <Search className="w-10 h-10 text-zinc-200" />
                  </div>
                  <p className="text-zinc-400 text-sm">검색 결과가 없습니다.<br/>다른 키워드로 검색해보세요.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <section className="space-y-6 pt-4">
            <header className="flex items-center justify-between">
              <h2 className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <Library className="w-8 h-8 text-purple-600" />내 보관함
              </h2>
              <div className="flex items-center gap-2">
                {savedBooks.length > 0 && (
                  <button 
                    onClick={toggleSelectAll}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${selectedIds.length === savedBooks.length ? 'bg-zinc-900 text-white' : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900'}`}
                  >
                    {selectedIds.length === savedBooks.length ? '전체 해제' : '전체 선택'}
                  </button>
                )}
                {selectedIds.length > 0 && (
                  <button 
                    onClick={deleteSelectedBooks}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-xl text-xs font-bold transition-all hover:bg-red-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {selectedIds.length}개 삭제
                  </button>
                )}
                <button 
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                  className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-500 hover:text-purple-600 transition-all"
                >
                  {viewMode === 'grid' ? <List className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
                </button>
              </div>
            </header>
            
            <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar">
              <button onClick={() => toggleSort('created_at')} className={`flex-none px-3 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1 ${sortColumn === 'created_at' ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500'}`}>
                저장일 {sortColumn === 'created_at' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>)}
              </button>
              <button onClick={() => toggleSort('title')} className={`flex-none px-3 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1 ${sortColumn === 'title' ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500'}`}>
                제목 {sortColumn === 'title' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>)}
              </button>
              <button onClick={() => toggleSort('authors')} className={`flex-none px-3 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1 ${sortColumn === 'authors' ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500'}`}>
                저자 {sortColumn === 'authors' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>)}
              </button>
            </div>

            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedBooks.map((book) => (
                  <div 
                    key={book.id} 
                    className="relative overflow-hidden rounded-3xl group"
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
                    <div className={`absolute inset-0 flex justify-end transition-opacity duration-300 ${swipingId === book.id ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                      <div className="flex flex-col w-1/2 h-full">
                        <button 
                          onClick={() => setSwipingId(null)}
                          className="flex-1 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 font-bold text-sm border-b border-white/10"
                        >
                          취소
                        </button>
                        <button 
                          onClick={() => { deleteSavedBook(book.id!); setSwipingId(null); }}
                          className="flex-1 bg-red-500 text-white font-bold text-sm"
                        >
                          삭제
                        </button>
                      </div>
                    </div>

                    <div 
                      onClick={() => swipingId !== book.id && editingId !== book.id && setSelectedBook(book)} 
                      className={`bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col transition-transform duration-300 cursor-pointer ${swipingId === book.id ? '-translate-x-1/2' : 'translate-x-0'}`}
                    >
                      <div className="p-4 flex gap-4 relative">
                        <div className="relative flex-none">
                          <img src={book.thumbnail || '/file.svg'} className="w-20 h-28 object-cover rounded-xl shadow-xs" alt={book.title} />
                          <div className="absolute top-1 left-1 z-10">
                            <input 
                              type="checkbox" 
                              checked={selectedIds.includes(book.id!)}
                              onChange={(e) => { e.stopPropagation(); toggleSelect(book.id!); }}
                              className="w-4 h-4 rounded border-zinc-300 text-purple-600 focus:ring-purple-500 bg-white/90 shadow-sm"
                            />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div className="space-y-1">
                            {editingId === book.id ? (
                              <input 
                                value={editFormData.title || ''} 
                                onChange={e => setEditFormData({...editFormData, title: e.target.value})} 
                                className="w-full px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm font-bold border-none focus:ring-1 focus:ring-purple-500"
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <h3 className="font-bold text-zinc-900 dark:text-zinc-50 text-sm line-clamp-2">{book.title}</h3>
                            )}
                            
                            {editingId === book.id ? (
                              <input 
                                value={editFormData.authors || ''} 
                                onChange={e => setEditFormData({...editFormData, authors: e.target.value})} 
                                className="w-full px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-xs border-none focus:ring-1 focus:ring-purple-500"
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <p className="text-purple-600 text-[11px] font-bold truncate">{book.authors}</p>
                            )}
                            
                            <p className="text-zinc-400 text-[10px]">{book.publisher} · {new Date(book.created_at!).toLocaleDateString()}</p>
                          </div>

                          <div className="flex items-center justify-end gap-1 mt-2">
                            {editingId === book.id ? (
                              <>
                                <button onClick={(e) => { e.stopPropagation(); saveEdit(); }} className="p-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors"><Check className="w-4 h-4"/></button>
                                <button onClick={(e) => { e.stopPropagation(); setEditingId(null); }} className="p-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-xl"><X className="w-4 h-4"/></button>
                              </>
                            ) : (
                              <>
                                <button onClick={(e) => { e.stopPropagation(); setEditingId(book.id!); setEditFormData(book); }} className="p-2 text-zinc-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-xl transition-colors"><Edit2 className="w-4 h-4"/></button>
                                <button onClick={(e) => { e.stopPropagation(); deleteSavedBook(book.id!); }} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"><Trash2 className="w-4 h-4"/></button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="px-4 pb-4 mt-auto">
                        {editingId === book.id ? (
                          <textarea
                            value={editFormData.personal_memo || ''}
                            onChange={e => setEditFormData({...editFormData, personal_memo: e.target.value})}
                            placeholder="개인 메모를 입력하세요..."
                            className="w-full h-24 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-2xl text-sm border-none focus:ring-1 focus:ring-purple-500 resize-none"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <div 
                            onClick={(e) => { e.stopPropagation(); setEditingId(book.id!); setEditFormData(book); }}
                            className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl min-h-[60px] cursor-text hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group/memo"
                          >
                            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed italic">
                              {book.personal_memo || '남겨진 메모가 없습니다.'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                        <th className="px-4 py-3 w-10 text-center">
                          <input 
                            type="checkbox" 
                            checked={selectedIds.length === savedBooks.length && savedBooks.length > 0}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 rounded border-zinc-300 text-purple-600 focus:ring-purple-500"
                          />
                        </th>
                        <th onClick={() => toggleSort('title')} className="px-4 py-3 cursor-pointer hover:text-purple-600 transition-colors">제목</th>
                        <th onClick={() => toggleSort('authors')} className="px-4 py-3 w-24 cursor-pointer hover:text-purple-600 transition-colors">저자</th>
                        <th className="px-4 py-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {savedBooks.map((book) => (
                        <tr key={book.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group">
                          <td className="px-4 py-3 text-center">
                            <input 
                              type="checkbox" 
                              checked={selectedIds.includes(book.id!)}
                              onChange={() => toggleSelect(book.id!)}
                              className="w-4 h-4 rounded border-zinc-300 text-purple-600 focus:ring-purple-500"
                            />
                          </td>
                          <td onClick={() => setSelectedBook(book)} className="px-4 py-3 text-sm font-bold text-zinc-900 dark:text-zinc-50 cursor-pointer">{book.title}</td>
                          <td className="px-4 py-3 text-xs text-purple-600 font-semibold whitespace-nowrap">
                            {book.authors.length > 6 ? `${book.authors.slice(0, 6)}...` : book.authors}
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => deleteSavedBook(book.id!)} className="p-1.5 text-zinc-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {savedBooks.length === 0 && (
              <div className="py-20 text-center space-y-4">
                <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto">
                  <BookOpen className="w-10 h-10 text-zinc-200" />
                </div>
                <p className="text-zinc-400 text-sm">아직 저장된 책이 없습니다.<br/>검색 탭에서 책을 추가해보세요.</p>
              </div>
            )}
          </section>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-t border-zinc-200 dark:border-zinc-800 safe-area-pb z-50">
        <div className="max-w-md mx-auto flex justify-around py-3 px-6">
          <button onClick={() => setActiveTab('search')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'search' ? 'text-purple-600 scale-110' : 'text-zinc-400'}`}>
            <Search className="w-6 h-6" /><span className="text-[10px] font-bold">검색</span>
          </button>
          <button onClick={() => setActiveTab('library')} className={`flex flex-col items-center gap-1 transition-all relative ${activeTab === 'library' ? 'text-purple-600 scale-110' : 'text-zinc-400'}`}>
            <Library className="w-6 h-6" /><span className="text-[10px] font-bold">내 서재</span>
            {savedBooks.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] flex items-center justify-center rounded-full font-bold border-2 border-white dark:border-zinc-900">{savedBooks.length}</span>}
          </button>
        </div>
      </nav>

      {/* 도서 상세 모달 */}
      {selectedBook && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all" onClick={() => setSelectedBook(null)}>
          <div className="bg-white dark:bg-zinc-900 w-full max-w-lg max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="relative h-48 sm:h-64 overflow-hidden bg-purple-50 dark:bg-purple-900/10">
              <img 
                src={selectedBook.thumbnail || '/file.svg'} 
                className="w-full h-full object-contain p-8 scale-110 blur-xl opacity-20 absolute inset-0" 
                alt=""
              />
              <img 
                src={selectedBook.thumbnail || '/file.svg'} 
                className="w-full h-full object-contain p-4 relative z-10 drop-shadow-xl" 
                alt={selectedBook.title}
              />
              <button 
                onClick={() => setSelectedBook(null)}
                className="absolute top-6 right-6 p-2 bg-white/20 dark:bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-all z-20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto no-scrollbar flex-1 space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 leading-tight">
                  {selectedBook.title}
                </h2>
                <div className="flex flex-wrap justify-center gap-2 text-sm">
                  <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full font-bold">
                    {Array.isArray(selectedBook.authors) ? selectedBook.authors.join(', ') : selectedBook.authors}
                  </span>
                  <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-full">
                    {selectedBook.publisher}
                  </span>
                </div>
              </div>

              {/* 실시간 도서관 대출 현황 섹션 */}
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
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-[11px] font-bold">
                        <X className="w-3.5 h-3.5" /> 현재 대출 중입니다.
                      </div>
                    )}
                    {availabilityStatus.status === 'not_found' && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 rounded-xl text-[11px] font-bold">
                        소장하고 있지 않습니다.
                      </div>
                    )}
                    {availabilityStatus.status === 'error' && (
                      <div className="text-[10px] text-zinc-400 italic">정보를 불러올 수 없습니다.</div>
                    )}
                  </div>

                  {availabilityStatus.otherLibs && availabilityStatus.otherLibs.length > 0 && (
                    <div className="pt-2 border-t border-zinc-200/50 dark:border-zinc-700/50">
                      <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 mb-2">💡 상호대차 가능 도서관</p>
                      <div className="flex flex-wrap gap-1.5">
                        {availabilityStatus.otherLibs.slice(0, 5).map(name => (
                          <span key={name} className="px-2 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-[9px] text-zinc-500 dark:text-zinc-400">{name}</span>
                        ))}
                        {availabilityStatus.otherLibs.length > 5 && <span className="text-[9px] text-zinc-400 self-center">외 {availabilityStatus.otherLibs.length - 5}곳</span>}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-50 font-bold border-b border-zinc-100 dark:border-zinc-800 pb-2">
                  <BookOpen className="w-4 h-4 text-purple-500" />
                  <span>책 소개</span>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed text-justify">
                  {selectedBook.contents || '등록된 정보가 없습니다.'}
                </p>
              </div>

              {('personal_memo' in selectedBook) && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-50 font-bold border-b border-zinc-100 dark:border-zinc-800 pb-2">
                    <Edit2 className="w-4 h-4 text-purple-500" />
                    <span>나의 메모</span>
                  </div>
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-3xl border border-zinc-100 dark:border-zinc-800">
                    <p className="text-zinc-700 dark:text-zinc-300 text-sm italic leading-relaxed whitespace-pre-wrap">
                      {selectedBook.personal_memo || '남겨진 메모가 없습니다.'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-100 dark:border-zinc-800">
              <button 
                onClick={() => setSelectedBook(null)}
                className="w-full py-4 bg-zinc-900 dark:bg-white dark:text-black text-white rounded-2xl font-bold text-lg hover:scale-[0.98] transition-all"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
