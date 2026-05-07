'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Search, Trash2, AlertCircle } from 'lucide-react';
import imageCompression from 'browser-image-compression';

interface Book {
  title: string;
  authors: string[];
  thumbnail: string;
  contents: string;
  publisher: string;
  isbn: string;
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [books, setBooks] = useState<Book[]>([]);
  const [savedBooks, setSavedBooks] = useState<{ isbn: string; title: string; authors?: string; thumbnail?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const KAKAO_KEY = "75db26230fefcfdb7c8802f4f6913ec3";
  const VERSION = "v1.0.5";

  // 페이지 로드 시 URL에 검색어가 있으면 바로 검색 실행 및 저장된 책 불러오기
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q && q !== '[' && q !== '') {
      setQuery(q);
      searchBooks(q, false); // URL 업데이트는 하지 않음
    }

    const saved = JSON.parse(localStorage.getItem('saved_books') || '[]');
    setSavedBooks(saved);
  }, []);

  const searchBooks = async (searchQuery: string, updateUrl = true) => {
    if (!searchQuery || searchQuery === '[') return;
    setLoading(true);
    
    // URL에 검색어 반영 (돌아왔을 때 결과 유지를 위함)
    if (updateUrl) {
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

  const sendToShortcut = async (book: Book) => {
    const currentSaved = JSON.parse(localStorage.getItem('saved_books') || '[]');
    const isDuplicate = currentSaved.some((b: { isbn: string }) => b.isbn === book.isbn);

    if (isDuplicate) {
      if (!confirm('이미 메모로 보낸 책입니다. 다시 보낼까요?')) {
        return;
      }
    }

    const inputData = {
      title: book.title,
      authors: book.authors.join(', '),
      thumbnail: book.thumbnail,
      contents: book.contents,
      publisher: book.publisher
    };
    
    const textInput = JSON.stringify(inputData);
    const shortcutName = 'BookToMemo';
    
    // x-callback-url 대신 일반 실행 방식을 사용하여 단축어 앱의 강제 설정을 방지
    const url = "shortcuts://run-shortcut?name=" + encodeURIComponent(shortcutName) + 
                "&input=text&text=" + encodeURIComponent(textInput);

    const updatedSaved = [
      { 
        isbn: book.isbn, 
        title: book.title,
        authors: book.authors.join(', '),
        thumbnail: book.thumbnail
      },
      ...currentSaved.filter((b: { isbn: string }) => b.isbn !== book.isbn)
    ].slice(0, 10); // 최근 10개만 저장
    
    localStorage.setItem('saved_books', JSON.stringify(updatedSaved));
    setSavedBooks(updatedSaved);

    // 단축어 직접 실행
    window.location.href = url;
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 pb-32 sm:p-8 font-sans">
      <div className="absolute top-4 left-4 text-[10px] font-mono text-zinc-300 dark:text-zinc-700 select-none">
        {VERSION}
      </div>

      <main className="max-w-2xl mx-auto space-y-12">
        <header className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            BookToMemo
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium">
            스마트하게 검색하고 애플 메모로 전송
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
              className="w-full py-4 bg-purple-600 text-white rounded-2xl font-bold text-lg hover:bg-purple-700 active:scale-[0.98] transition-all shadow-lg shadow-purple-200 dark:shadow-none disabled:opacity-50 disabled:grayscale"
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
                  onClick={() => sendToShortcut(book)}
                  className="mt-4 w-full py-2.5 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-xl text-sm font-bold hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-zinc-200 dark:shadow-none"
                >
                  애플 메모로 보내기
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
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                최근 보낸 메모
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {savedBooks.map((book) => (
                <div 
                  key={book.isbn}
                  className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm space-y-3"
                >
                  <div className="aspect-[3/4] relative overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                    {book.thumbnail ? (
                      <img
                        src={book.thumbnail}
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-400 text-[10px] text-center p-2">
                        표지 없음
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 truncate">
                      {book.title}
                    </h4>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                      {book.authors}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
      
      <footer className="fixed bottom-6 left-1/2 -translate-x-1/2">
        <button 
          onClick={() => {
            if(confirm('모든 저장 기록을 삭제하시겠습니까? (메모는 삭제되지 않습니다)')) {
              localStorage.removeItem('saved_books');
              setSavedBooks([]);
              alert('기록이 초기화되었습니다.');
            }
          }}
          className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-full border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-400 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          기록 초기화
        </button>
      </footer>
    </div>
  );
}
