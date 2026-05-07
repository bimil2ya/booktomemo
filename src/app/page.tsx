'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Search, Trash2, AlertCircle, Save, X, Edit2, Check, Smartphone, Database, Library, BookOpen, ChevronUp, ChevronDown, LogOut, ArrowUpDown } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { createClient } from '@supabase/supabase-js';

// Supabase 설정
const SUPABASE_URL = 'https://jmfgxmpgedcxyvaclci.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ifts273gFtkSiY1SZBxNWg_lnSIKD-m';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
  const [ocrLoading, setOcrLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [saveMode, setSaveMode] = useState<'shortcut' | 'native'>('native');
  
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<SavedBook>>({});
  
  const [sortColumn, setSortColumn] = useState<SortColumn>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const KAKAO_KEY = "75db26230fefcfdb7c8802f4f6913ec3";
  const VERSION = "v1.3.0";

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
  useEffect(() => {
    if (libraryName) {
      fetchSavedBooks();
    }
  }, [libraryName]);

  const fetchSavedBooks = async () => {
    if (!libraryName) return;
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .eq('owner_name', libraryName)
      .order(sortColumn, { ascending: sortOrder === 'asc' });

    if (error) {
      console.error('Error fetching books:', error);
    } else {
      setSavedBooks(data || []);
    }
  };

  // 정렬이 변경될 때마다 다시 가져오기
  useEffect(() => {
    if (libraryName) fetchSavedBooks();
  }, [sortColumn, sortOrder]);

  const handleEnterLibrary = () => {
    if (!nameInput.trim()) return;
    localStorage.setItem('library_owner_name', nameInput.trim());
    setLibraryName(nameInput.trim());
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
      const res = await fetch(
        "https://dapi.kakao.com/v3/search/book?query=" + encodeURIComponent(searchQuery),
        { headers: { Authorization: "KakaoAK " + KAKAO_KEY } }
      );
      const data = await res.json();
      setBooks(data.documents || []);
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

      const res = await fetch("/api/ocr", { method: 'POST', body: formData });
      const data = await res.json();

      if (data.title || data.author) {
        const optimizedQuery = `${data.title} ${data.author}`.trim();
        setQuery(optimizedQuery);
        searchBooks(optimizedQuery);
      } else {
        alert('이미지에서 책 정보를 찾지 못했습니다.');
      }
    } catch (error) {
      alert('사진 인식 중 오류가 발생했습니다.');
    } finally {
      setOcrLoading(false);
    }
  };

  const handleSave = async (book: Book) => {
    if (!libraryName) return;
    
    // 중복 체크 (Supabase)
    const { data: existing } = await supabase
      .from('books')
      .select('isbn')
      .eq('owner_name', libraryName)
      .eq('isbn', book.isbn)
      .single();

    if (existing) {
      if (!confirm('이미 저장된 책입니다. 다시 저장할까요?')) return;
    }

    const newBook: Omit<SavedBook, 'id' | 'created_at'> = {
      isbn: book.isbn,
      title: book.title,
      authors: book.authors.join(', '),
      thumbnail: book.thumbnail,
      contents: book.contents,
      publisher: book.publisher,
      owner_name: libraryName
    };

    const { error } = await supabase.from('books').insert([newBook]);

    if (error) {
      alert('저장 중 오류가 발생했습니다.');
    } else {
      if (saveMode === 'shortcut') {
        const url = "shortcuts://run-shortcut?name=BookToMemo&input=text&text=" + 
                    encodeURIComponent(JSON.stringify({ ...newBook, query }));
        window.location.href = url;
      } else {
        alert('서재에 저장되었습니다.');
      }
      fetchSavedBooks(); // 목록 갱신
    }
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const { error } = await supabase
      .from('books')
      .update(editFormData)
      .eq('id', editingId);

    if (error) {
      alert('수정 중 오류가 발생했습니다.');
    } else {
      setEditingId(null);
      fetchSavedBooks();
    }
  };

  const deleteSavedBook = async (id: number) => {
    if (!confirm('보관함에서 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('books').delete().eq('id', id);
    if (error) {
      alert('삭제 중 오류가 발생했습니다.');
    } else {
      fetchSavedBooks();
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
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-zinc-300 dark:text-zinc-700">{VERSION}</span>
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
          <div className="space-y-8 max-w-2xl mx-auto">
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
                <div key={idx} className="flex gap-4 p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                  <img src={book.thumbnail || '/file.svg'} className="w-24 h-32 object-cover rounded-lg shadow-sm" alt={book.title} />
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <h3 className="font-bold text-xl truncate">{book.title}</h3>
                      <p className="text-purple-600 text-sm font-semibold">{book.authors.join(', ')}</p>
                      <p className="text-zinc-400 text-xs">{book.publisher}</p>
                      <p className="mt-2 text-zinc-500 text-sm line-clamp-2">{book.contents}</p>
                    </div>
                    <button onClick={() => handleSave(book)} className={`mt-4 w-full py-2.5 text-white rounded-xl text-sm font-bold ${saveMode === 'shortcut' ? 'bg-zinc-900' : 'bg-purple-600'}`}>
                      {saveMode === 'shortcut' ? '애플 메모로 보내기' : '서재에 저장'}
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
            
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                    <tr>
                      <th className="px-4 py-3 text-xs font-bold text-zinc-400 uppercase tracking-wider cursor-pointer" onClick={() => toggleSort('created_at')}>
                        <div className="flex items-center gap-1">저장일 {sortColumn === 'created_at' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>)}</div>
                      </th>
                      <th className="px-4 py-3 text-xs font-bold text-zinc-400 uppercase tracking-wider cursor-pointer" onClick={() => toggleSort('title')}>
                        <div className="flex items-center gap-1">책 제목 {sortColumn === 'title' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>)}</div>
                      </th>
                      <th className="px-4 py-3 text-xs font-bold text-zinc-400 uppercase tracking-wider cursor-pointer" onClick={() => toggleSort('authors')}>
                        <div className="flex items-center gap-1">저자 {sortColumn === 'authors' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>)}</div>
                      </th>
                      <th className="px-4 py-3 text-xs font-bold text-zinc-400 uppercase tracking-wider cursor-pointer" onClick={() => toggleSort('publisher')}>
                        <div className="flex items-center gap-1">출판사 {sortColumn === 'publisher' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>)}</div>
                      </th>
                      <th className="px-4 py-3 text-xs font-bold text-zinc-400 text-center uppercase tracking-wider">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                    {savedBooks.map((book) => (
                      <tr key={book.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className="px-4 py-4 text-xs text-zinc-500 whitespace-nowrap">
                          {new Date(book.created_at!).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-4">
                          {editingId === book.id ? (
                            <input value={editFormData.title || ''} onChange={e => setEditFormData({...editFormData, title: e.target.value})} className="w-full p-1 bg-zinc-100 dark:bg-zinc-700 rounded text-sm"/>
                          ) : (
                            <div className="flex items-center gap-2">
                              <img src={book.thumbnail} className="w-6 h-8 object-cover rounded shadow-xs" />
                              <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50 truncate max-w-[150px]">{book.title}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {editingId === book.id ? (
                            <input value={editFormData.authors || ''} onChange={e => setEditFormData({...editFormData, authors: e.target.value})} className="w-full p-1 bg-zinc-100 dark:bg-zinc-700 rounded text-sm"/>
                          ) : (
                            <span className="text-sm text-zinc-600 dark:text-zinc-400 truncate max-w-[100px] block">{book.authors}</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {editingId === book.id ? (
                            <input value={editFormData.publisher || ''} onChange={e => setEditFormData({...editFormData, publisher: e.target.value})} className="w-full p-1 bg-zinc-100 dark:bg-zinc-700 rounded text-sm"/>
                          ) : (
                            <span className="text-sm text-zinc-500 dark:text-zinc-500 truncate max-w-[80px] block">{book.publisher}</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {editingId === book.id ? (
                              <>
                                <button onClick={saveEdit} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"><Check className="w-4 h-4"/></button>
                                <button onClick={() => setEditingId(null)} className="p-1.5 text-zinc-400 hover:bg-zinc-100 rounded-lg"><X className="w-4 h-4"/></button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => { setEditingId(book.id!); setEditFormData(book); }} className="p-1.5 text-zinc-400 hover:text-purple-600 rounded-lg"><Edit2 className="w-4 h-4"/></button>
                                <button onClick={() => deleteSavedBook(book.id!)} className="p-1.5 text-zinc-400 hover:text-red-500 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {savedBooks.length === 0 && (
                <div className="py-20 text-center space-y-2">
                  <BookOpen className="w-12 h-12 text-zinc-100 mx-auto" />
                  <p className="text-zinc-400 text-sm">저장된 책이 없습니다.</p>
                </div>
              )}
            </div>
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
    </div>
  );
}
