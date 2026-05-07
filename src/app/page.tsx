'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Search, Trash2, AlertCircle, Save, X, Edit2, Check, Smartphone, Database } from 'lucide-react';
import imageCompression from 'browser-image-compression';

interface Book {
  title: string;
  authors: string[];
  thumbnail: string;
  contents: string;
  publisher: string;
  isbn: string;
}

interface SavedBook {
  isbn: string;
  title: string;
  authors: string;
  thumbnail: string;
  contents: string;
  publisher: string;
  personalMemo?: string;
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [books, setBooks] = useState<Book[]>([]);
  const [savedBooks, setSavedBooks] = useState<SavedBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [saveMode, setSaveMode] = useState<'shortcut' | 'native'>('native');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<SavedBook>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const KAKAO_KEY = "75db26230fefcfdb7c8802f4f6913ec3";
  const VERSION = "v1.1.0";

  // 초기 클라이언트 마운트 확인 및 데이터 로드
  useEffect(() => {
    setIsMounted(true);
    
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    const lastQuery = localStorage.getItem('last_search_query');
    const lastMode = localStorage.getItem('save_mode') as 'shortcut' | 'native';

    if (lastMode) setSaveMode(lastMode);

    if (q) {
      // 단축어에서 [제목] 형식으로 복귀하는 경우 원래 검색어(lastQuery)를 우선 사용
      if (q.startsWith('[') && lastQuery) {
        setQuery(lastQuery);
        searchBooks(lastQuery, false);
      } else if (q !== '' && q !== '[') {
        setQuery(q);
        searchBooks(q, false);
      }
    }

    const saved = JSON.parse(localStorage.getItem('saved_books') || '[]');
    setSavedBooks(saved);
  }, []);

  const toggleSaveMode = () => {
    const newMode = saveMode === 'shortcut' ? 'native' : 'shortcut';
    setSaveMode(newMode);
    localStorage.setItem('save_mode', newMode);
  };

  const searchBooks = async (searchQuery: string, updateUrl = true) => {
    if (!searchQuery) return;
    if (searchQuery.trim() === '[') return;

    setLoading(true);
    
    if (updateUrl && typeof window !== 'undefined') {
      localStorage.setItem('last_search_query', searchQuery);
      const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?q=' + encodeURIComponent(searchQuery);
      window.history.replaceState({ path: newUrl }, '', newUrl);
    }

    try {
      const res = await fetch(
        "https://dapi.kakao.com/v3/search/book?query=" + encodeURIComponent(searchQuery),
        {
          headers: { Authorization: "KakaoAK " + KAKAO_KEY },
        }
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchBooks(query);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    setOcrLoading(true);
    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true
      };
      const compressedFile = await imageCompression(rawFile, options);
      
      const formData = new FormData();
      formData.append('image', compressedFile);

      const res = await fetch("/api/ocr", {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (data.title || data.author) {
        const optimizedQuery = `${data.title} ${data.author}`.trim();
        setQuery(optimizedQuery);
        searchBooks(optimizedQuery);
      } else {
        alert('이미지에서 책 정보를 찾지 못했습니다. 다시 시도해 주세요.');
      }
    } catch (error) {
      console.error('OCR failed:', error);
      alert('사진 인식 중 오류가 발생했습니다.');
    } finally {
      setOcrLoading(false);
    }
  };

  const handleSave = async (book: Book) => {
    if (typeof window === 'undefined') return;
    
    const currentSaved = JSON.parse(localStorage.getItem('saved_books') || '[]');
    const isDuplicate = currentSaved.some((b: SavedBook) => b.isbn === book.isbn);

    if (isDuplicate) {
      if (!confirm('이미 저장된 책입니다. 다시 저장할까요?')) {
        return;
      }
    }

    const newSavedBook: SavedBook = {
      isbn: book.isbn,
      title: book.title,
      authors: book.authors.join(', '),
      thumbnail: book.thumbnail,
      contents: book.contents,
      publisher: book.publisher
    };

    if (saveMode === 'shortcut') {
      const inputData = { ...newSavedBook, query: query };
      const textInput = JSON.stringify(inputData);
      const shortcutName = 'BookToMemo';
      const url = "shortcuts://run-shortcut?name=" + encodeURIComponent(shortcutName) + 
                  "&input=text&text=" + encodeURIComponent(textInput);
      
      // 단축어 실행
      window.location.href = url;
    }

    // 로컬 상태 및 저장소 업데이트 (공통 또는 자체 저장 모드용)
    const updatedSaved = [
      newSavedBook,
      ...currentSaved.filter((b: SavedBook) => b.isbn !== book.isbn)
    ].slice(0, 50); // 보관함 최대 50개 저장
    
    localStorage.setItem('saved_books', JSON.stringify(updatedSaved));
    setSavedBooks(updatedSaved);

    if (saveMode === 'native') {
      alert('서재에 저장되었습니다.');
    }
  };

  const startEditing = (book: SavedBook) => {
    setEditingId(book.isbn);
    setEditFormData(book);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditFormData({});
  };

  const saveEdit = () => {
    const updated = savedBooks.map(b => 
      b.isbn === editingId ? { ...b, ...editFormData } as SavedBook : b
    );
    setSavedBooks(updated);
    localStorage.setItem('saved_books', JSON.stringify(updated));
    setEditingId(null);
    setEditFormData({});
  };

  const deleteSavedBook = (isbn: string) => {
    if (!confirm('보관함에서 삭제하시겠습니까?')) return;
    const updated = savedBooks.filter(b => b.isbn !== isbn);
    setSavedBooks(updated);
    localStorage.setItem('saved_books', JSON.stringify(updated));
  };

  // 클라이언트 마운트 전에는 아무것도 렌더링하지 않거나 로딩 상태 표시 (Hydration Error 방지)
  if (!isMounted) return <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950" />;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 pb-32 sm:p-8 font-sans">
      <div className="max-w-2xl mx-auto flex justify-between items-center mb-4">
        <div className="text-[10px] font-mono text-zinc-300 dark:text-zinc-700 select-none">
          {VERSION}
        </div>
        <button 
          onClick={toggleSaveMode}
          className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-900 rounded-full border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
        >
          {saveMode === 'shortcut' ? <Smartphone className="w-3.5 h-3.5 text-blue-500" /> : <Database className="w-3.5 h-3.5 text-purple-500" />}
          {saveMode === 'shortcut' ? '애플 단축어 모드' : '앱 자체 저장 모드'}
        </button>
      </div>

      <main className="max-w-2xl mx-auto space-y-12">
        <header className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            BookToMemo
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium">
            {saveMode === 'shortcut' ? '검색하고 애플 메모로 전송' : '검색하고 나만의 서재에 저장'}
          </p>
        </header>

        <div className="space-y-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3">
            <div className="relative group flex-1">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="책 제목, 저자 입력..."
                className="w-full pl-12 pr-16 py-4 rounded-2xl border-none bg-white dark:bg-zinc-900 shadow-xl shadow-zinc-200/50 dark:shadow-none text-lg text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-purple-500 transition-all"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
                  disabled={ocrLoading}
                >
                  {ocrLoading ? <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /> : <Camera className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || !query}
              className={`w-full py-4 text-white rounded-2xl font-bold text-lg active:scale-[0.98] transition-all shadow-lg dark:shadow-none disabled:opacity-50 disabled:grayscale ${saveMode === 'shortcut' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-purple-600 hover:bg-purple-700 shadow-purple-200'}`}
            >
              {loading ? '검색 중...' : '검색 시작'}
            </button>
          </form>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={fileInputRef}
            onChange={handlePhotoUpload}
            className="hidden"
          />
        </div>

        <div className="grid gap-4">
          {books.map((book, idx) => (
            <div
              key={idx}
              className="flex gap-4 p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow group"
            >
              <div className="relative flex-shrink-0">
                {book.thumbnail ? (
                  <img
                    src={book.thumbnail}
                    alt={book.title}
                    className="w-24 h-32 object-cover rounded-lg shadow-sm group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-24 h-32 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-400 text-xs text-center">
                    표지 없음
                  </div>
                )}
              </div>
              <div className="flex-1 flex flex-col justify-between min-w-0">
                <div>
                  <h3 className="font-bold text-xl text-zinc-900 dark:text-zinc-50 truncate leading-tight">
                    {book.title}
                  </h3>
                  <p className="text-purple-600 dark:text-purple-400 text-sm font-semibold mt-1">
                    {book.authors.join(', ')}
                  </p>
                  <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-0.5">
                    {book.publisher}
                  </p>
                  <p className="mt-3 text-zinc-500 dark:text-zinc-500 text-sm line-clamp-2 leading-relaxed">
                    {book.contents}
                  </p>
                </div>
                <button
                  onClick={() => handleSave(book)}
                  className={`mt-4 w-full py-2.5 text-white rounded-xl text-sm font-bold hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg dark:shadow-none ${saveMode === 'shortcut' ? 'bg-zinc-900 dark:bg-zinc-50 dark:text-zinc-900' : 'bg-purple-600'}`}
                >
                  {saveMode === 'shortcut' ? '애플 메모로 보내기' : '내 서재에 저장'}
                </button>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-40 bg-white dark:bg-zinc-900 rounded-2xl" />
              ))}
            </div>
          )}

          {!loading && books.length === 0 && query && (
            <div className="text-center py-20 space-y-3">
              <AlertCircle className="w-12 h-12 text-zinc-200 mx-auto" />
              <p className="text-zinc-500 dark:text-zinc-400 font-medium">검색 결과가 없습니다.</p>
            </div>
          )}
        </div>

        {savedBooks.length > 0 && !loading && (
          <section className="space-y-6 pt-8 border-t border-zinc-200 dark:border-zinc-800">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <Database className="w-6 h-6 text-purple-500" />
              내 보관함
            </h2>
            <div className="grid gap-6">
              {savedBooks.map((book) => (
                <div 
                  key={book.isbn}
                  className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm space-y-4"
                >
                  {editingId === book.isbn ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-400">제목</label>
                        <input 
                          value={editFormData.title || ''} 
                          onChange={e => setEditFormData({...editFormData, title: e.target.value})}
                          className="w-full p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg text-sm border-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-400">저자</label>
                          <input 
                            value={editFormData.authors || ''} 
                            onChange={e => setEditFormData({...editFormData, authors: e.target.value})}
                            className="w-full p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg text-sm border-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-400">출판사</label>
                          <input 
                            value={editFormData.publisher || ''} 
                            onChange={e => setEditFormData({...editFormData, publisher: e.target.value})}
                            className="w-full p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg text-sm border-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-400">책 소개</label>
                        <textarea 
                          value={editFormData.contents || ''} 
                          onChange={e => setEditFormData({...editFormData, contents: e.target.value})}
                          rows={3}
                          className="w-full p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg text-sm border-none focus:ring-2 focus:ring-purple-500 resize-none"
                        />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button onClick={saveEdit} className="flex-1 py-2 bg-purple-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                          <Check className="w-4 h-4" /> 저장
                        </button>
                        <button onClick={cancelEditing} className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                          <X className="w-4 h-4" /> 취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-4">
                        <img src={book.thumbnail} className="w-16 h-24 object-cover rounded-lg flex-shrink-0" alt={book.title} />
                        <div className="min-w-0">
                          <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50 truncate">{book.title}</h3>
                          <p className="text-purple-600 text-sm font-medium">{book.authors}</p>
                          <p className="text-zinc-400 text-xs">{book.publisher}</p>
                        </div>
                      </div>
                      <p className="text-zinc-500 text-sm line-clamp-2">{book.contents}</p>
                      <div className="flex gap-2 pt-2 border-t border-zinc-50 dark:border-zinc-800">
                        <button 
                          onClick={() => startEditing(book)}
                          className="flex-1 py-2 text-zinc-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors text-xs font-bold flex items-center justify-center gap-2"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> 정보 수정
                        </button>
                        <button 
                          onClick={() => deleteSavedBook(book.isbn)}
                          className="px-4 py-2 text-zinc-300 hover:text-red-500 transition-colors text-xs font-bold flex items-center justify-center gap-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> 삭제
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
      
      <footer className="fixed bottom-6 left-1/2 -translate-x-1/2">
        <button 
          onClick={() => {
            if(confirm('모든 보관함 기록을 삭제하시겠습니까?')) {
              localStorage.removeItem('saved_books');
              localStorage.removeItem('last_search_query');
              setSavedBooks([]);
              alert('보관함이 비워졌습니다.');
            }
          }}
          className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-full border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-400 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          보관함 비우기
        </button>
      </footer>
    </div>
  );
}
