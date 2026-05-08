'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Search, Trash2, Edit2, Check, Smartphone, Database, Library, BookOpen, ChevronUp, ChevronDown, LogOut, X } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import axios from 'axios';
import { getBooksAction, saveBookAction, updateBookAction, deleteBookAction } from './actions';

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

type SortColumn = 'created_at' | 'title' | 'authors' | 'publisher';
type SortOrder = 'asc' | 'desc';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'search' | 'library'>('search');
  const [libraryName, setLibraryName] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const KAKAO_KEY = "75db26230fefcfdb7c8802f4f6913ec3";
  const VERSION = "v1.5.6";

  // 상세 모달 상태
  const [selectedBook, setSelectedBook] = useState<SavedBook | Book | null>(null);

  // 초기 마운트 시 설정 불러오기
  useEffect(() => {
    setIsMounted(true);
    const savedName = localStorage.getItem('library_owner_name');
    if (savedName) setLibraryName(savedName);

    const lastMode = localStorage.getItem('save_mode') as 'shortcut' | 'native';
    if (lastMode) setSaveMode(lastMode);

    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q && q !== '' && q !== '[') {
      setQuery(q);
      searchBooks(q, false);
    }
  }, []);

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

  const handleEnterLibrary = () => {
    const finalName = nameInput.trim() || '경호의서재';
    localStorage.setItem('library_owner_name', finalName);
    setLibraryName(finalName);
  };

  const handleLogout = () => {
    if (confirm('서재에서 나가시겠습니까? (이름은 기기에서 삭제됩니다)')) {
      localStorage.removeItem('library_owner_name');
      setLibraryName(null);
      setNameInput('');
      setSavedBooks([]);
    }
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
    } catch {
      alert('사진 인식 중 오류가 발생했습니다.');
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
        if (!confirm('이미 저장된 책입니다. 다시 저장할까요?')) {
          return;
        }
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
      alert(`저장 실패: ${errorMsg}\n\n도움말: 네트워크 연결 상태를 확인하고 잠시 후 다시 시도해 주세요.`);
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
      fetchSavedBooks();
    } catch (error: unknown) {
      let errorMsg = '알 수 없는 오류';
      if (error instanceof Error) {
        errorMsg = error.message;
      }
      alert('삭제 중 오류가 발생했습니다: ' + errorMsg);
    }
  };

  if (!isMounted) return <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950" />;

  // 1. 이름 입력 화면 (로그인 전)
  if (!libraryName) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mx-auto">
              <Library className="w-8 h-8 text-purple-600" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">나만의 서재 만들기</h1>
            <p className="text-zinc-500 text-sm">사용하실 서재 이름을 입력해주세요.<br/>동일한 이름으로 모든 기기에서 접속 가능합니다.</p>
          </div>
          <div className="space-y-4">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="예: 경호의서재"
              className="w-full px-4 py-3 rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-lg focus:ring-2 focus:ring-purple-500"
              onKeyDown={(e) => e.key === 'Enter' && handleEnterLibrary()}
            />
            <button
              onClick={handleEnterLibrary}
              className="w-full py-4 bg-purple-600 text-white rounded-xl font-bold text-lg hover:bg-purple-700 transition-all"
            >
              서재 들어가기
            </button>
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
              <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">BookToMemo</h1>
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

            <div className="grid gap-4">
              {books.map((book, idx) => (
                <div key={idx} onClick={() => setSelectedBook(book)} className="flex gap-5 p-5 bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm cursor-pointer hover:border-purple-200 dark:hover:border-purple-900/50 transition-all">
                  <img src={book.thumbnail || '/file.svg'} className="w-24 h-32 object-cover rounded-2xl shadow-sm flex-none" alt={book.title} />
                  <div className="flex-1 flex flex-col justify-between min-w-0 py-1">
                    <div className="space-y-1">
                      <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50 truncate leading-tight">{book.title}</h3>
                      <p className="text-purple-600 text-xs font-bold truncate">{book.authors.join(', ')}</p>
                      <p className="text-zinc-400 text-[10px]">{book.publisher}</p>
                      <p className="mt-1 text-zinc-500 text-[11px] line-clamp-1 leading-relaxed">{book.contents}</p>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleSave(book); }} 
                      disabled={savingIsbn === book.isbn}
                      className={`mt-4 w-full py-3 text-white rounded-2xl text-xs font-bold transition-all ${savingIsbn === book.isbn ? 'bg-zinc-400 animate-pulse' : (saveMode === 'shortcut' ? 'bg-zinc-900' : 'bg-purple-600')}`}
                    >
                      {savingIsbn === book.isbn ? '저장 중...' : (saveMode === 'shortcut' ? '애플 메모로 보내기' : '서재에 저장')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <section className="space-y-6 pt-4">
            <header className="flex items-center justify-between">
              <h2 className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <Library className="w-8 h-8 text-purple-600" />내 보관함
              </h2>
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
              <button onClick={() => toggleSort('publisher')} className={`flex-none px-3 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1 ${sortColumn === 'publisher' ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500'}`}>
                출판사 {sortColumn === 'publisher' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>)}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedBooks.map((book) => (
                <div key={book.id} onClick={() => editingId !== book.id && setSelectedBook(book)} className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 overflow-hidden shadow-sm flex flex-col group transition-all hover:shadow-md cursor-pointer">
                  <div className="p-4 flex gap-4">
                    <img src={book.thumbnail || '/file.svg'} className="w-20 h-28 object-cover rounded-xl shadow-xs" alt={book.title} />
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div className="space-y-1">
                        {editingId === book.id ? (
                          <input 
                            value={editFormData.title || ''} 
                            onChange={e => setEditFormData({...editFormData, title: e.target.value})} 
                            className="w-full px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm font-bold border-none focus:ring-1 focus:ring-purple-500"
                          />
                        ) : (
                          <h3 className="font-bold text-zinc-900 dark:text-zinc-50 text-sm line-clamp-2">{book.title}</h3>
                        )}
                        
                        {editingId === book.id ? (
                          <input 
                            value={editFormData.authors || ''} 
                            onChange={e => setEditFormData({...editFormData, authors: e.target.value})} 
                            className="w-full px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-xs border-none focus:ring-1 focus:ring-purple-500"
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
                      />
                    ) : (
                      <div 
                        onClick={(e) => { e.stopPropagation(); setEditingId(book.id!); setEditFormData(book); }}
                        className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl min-h-[60px] cursor-text hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group/memo"
                      >
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed italic">
                          {book.personal_memo || '남겨진 메모가 없습니다.'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

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
