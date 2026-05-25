'use client';

import React, { useState, useMemo } from 'react';
import { SavedBook } from '@/types';
import BookThumbnail from './BookThumbnail';
import { ChevronLeft, ChevronRight, BookCheck, BookOpen, Library, X } from 'lucide-react';

interface StatsTabProps {
  savedBooks: SavedBook[];
  onSelectBook: (book: SavedBook) => void;
  dbSyncAvailable?: boolean | null; // null=감지중, true=DB동기화됨, false=로컬전용
}

const MONTH_LABELS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

const StatsTab: React.FC<StatsTabProps> = ({ savedBooks, onSelectBook, dbSyncAvailable }) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null);

  // 읽은 책 목록 (read_at 기준)
  const readBooks = useMemo(() => savedBooks.filter(b => !!b.read_at), [savedBooks]);

  // 전체 통계
  const totalCount = savedBooks.length;
  const readCount = readBooks.length;
  const unreadCount = totalCount - readCount;

  // 연도별 읽은 책
  const readBooksInYear = useMemo(
    () => readBooks.filter(b => b.read_at && new Date(b.read_at).getFullYear() === selectedYear),
    [readBooks, selectedYear]
  );

  // 월별 집계
  const monthlyData = useMemo(() => {
    return MONTH_LABELS.map((label, idx) => {
      const books = readBooksInYear.filter(
        b => b.read_at && new Date(b.read_at).getMonth() === idx
      );
      return { label, books, count: books.length };
    });
  }, [readBooksInYear]);

  const maxMonthlyCount = Math.max(...monthlyData.map(m => m.count), 1);
  const yearTotal = readBooksInYear.length;

  // 연도 목록 계산 (읽은 책 있는 연도 + 현재 연도)
  const availableYears = useMemo(() => {
    const years = new Set<number>([currentYear]);
    readBooks.forEach(b => {
      if (b.read_at) years.add(new Date(b.read_at).getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [readBooks, currentYear]);

  return (
    <div className="space-y-6 px-4 pt-4 pb-8">
      {/* 헤더 */}
      <div>
        <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-50">📊 독서 통계</h2>
        <p className="text-xs text-zinc-400 mt-0.5">읽은 책을 기반으로 통계를 보여드립니다</p>
        {/* DB 동기화 상태 배지 */}
        {dbSyncAvailable === true && (
          <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            다기기 동기화 활성
          </span>
        )}
        {dbSyncAvailable === false && (
          <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-[10px] font-bold text-amber-600 dark:text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
            이 기기만 저장됨
          </span>
        )}
      </div>

      {/* 요약 카드 3개 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm p-4 flex flex-col items-center gap-1">
          <Library className="w-5 h-5 text-purple-500" />
          <span className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50">{totalCount}</span>
          <span className="text-[10px] text-zinc-400 font-medium">전체</span>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 shadow-sm p-4 flex flex-col items-center gap-1">
          <BookCheck className="w-5 h-5 text-emerald-500" />
          <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{readCount}</span>
          <span className="text-[10px] text-zinc-400 font-medium">읽음</span>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm p-4 flex flex-col items-center gap-1">
          <BookOpen className="w-5 h-5 text-zinc-400" />
          <span className="text-2xl font-extrabold text-zinc-500 dark:text-zinc-400">{unreadCount}</span>
          <span className="text-[10px] text-zinc-400 font-medium">미독</span>
        </div>
      </div>

      {/* 독서율 바 */}
      {totalCount > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">독서율</span>
            <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
              {Math.round((readCount / totalCount) * 100)}%
            </span>
          </div>
          <div className="h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 dark:bg-emerald-500 rounded-full transition-all duration-700"
              style={{ width: `${(readCount / totalCount) * 100}%` }}
            />
          </div>
          <p className="text-[10px] text-zinc-400 mt-1.5 text-right">{readCount}권 / {totalCount}권</p>
        </div>
      )}

      {/* 연도별 월별 통계 */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden">
        {/* 연도 선택기 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100 dark:border-zinc-800">
          <button
            onClick={() => {
              const idx = availableYears.indexOf(selectedYear);
              if (idx < availableYears.length - 1) setSelectedYear(availableYears[idx + 1]);
            }}
            disabled={availableYears.indexOf(selectedYear) >= availableYears.length - 1}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <span className="text-base font-extrabold text-zinc-900 dark:text-zinc-50">{selectedYear}년</span>
            <span className="ml-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold">{yearTotal}권 읽음</span>
          </div>
          <button
            onClick={() => {
              const idx = availableYears.indexOf(selectedYear);
              if (idx > 0) setSelectedYear(availableYears[idx - 1]);
            }}
            disabled={availableYears.indexOf(selectedYear) <= 0}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* 월별 차트 */}
        <div className="px-5 py-4 space-y-2">
          {yearTotal === 0 ? (
            <div className="py-8 text-center">
              <p className="text-zinc-400 text-sm">이 연도에 읽은 책이 없습니다</p>
              <p className="text-zinc-300 text-xs mt-1">책 카드에서 읽음 버튼을 눌러 기록해 보세요</p>
            </div>
          ) : (
            monthlyData.map((month, idx) => (
              <div key={idx}>
                <button
                  onClick={() => {
                    if (month.count > 0) setExpandedMonth(expandedMonth === idx ? null : idx);
                  }}
                  className={`w-full flex items-center gap-3 py-1 rounded-xl transition-colors ${month.count > 0 ? 'cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 -mx-1 px-1' : 'cursor-default'}`}
                >
                  <span className="w-7 text-right text-[11px] text-zinc-400 font-medium flex-none">{month.label}</span>
                  <div className="flex-1 h-5 bg-zinc-50 dark:bg-zinc-800 rounded-lg overflow-hidden">
                    {month.count > 0 && (
                      <div
                        className="h-full bg-emerald-400 dark:bg-emerald-500 rounded-lg transition-all duration-500"
                        style={{ width: `${(month.count / maxMonthlyCount) * 100}%` }}
                      />
                    )}
                  </div>
                  <span className={`w-8 text-left text-[11px] font-extrabold flex-none ${month.count > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-300 dark:text-zinc-700'}`}>
                    {month.count > 0 ? `${month.count}권` : '-'}
                  </span>
                </button>

                {/* 월 클릭 시 해당 월 읽은 책 목록 */}
                {expandedMonth === idx && month.count > 0 && (
                  <div className="ml-10 mr-0 mt-2 mb-3 space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">{month.label} 읽은 책</span>
                      <button onClick={() => setExpandedMonth(null)} className="text-zinc-300 hover:text-zinc-500 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {month.books.map((book) => (
                      <button
                        key={book.id}
                        onClick={() => onSelectBook(book)}
                        className="w-full flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left"
                      >
                        <BookThumbnail src={book.thumbnail} title={book.title} className="w-8 h-11 rounded-lg flex-none shadow-xs" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-zinc-800 dark:text-zinc-100 truncate">{book.title}</p>
                          <p className="text-[10px] text-zinc-400 truncate">{book.authors}</p>
                          {book.read_at && (
                            <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">
                              {new Date(book.read_at).toLocaleDateString('ko-KR')} 읽음
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 최근 읽은 책 섹션 */}
      {readCount > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800">
            <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">최근 읽은 책</h3>
          </div>
          <div className="px-5 py-4 space-y-3">
            {[...readBooks]
              .sort((a, b) => new Date(b.read_at!).getTime() - new Date(a.read_at!).getTime())
              .slice(0, 5)
              .map((book) => (
                <button
                  key={book.id}
                  onClick={() => onSelectBook(book)}
                  className="w-full flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 rounded-xl p-1 -mx-1 transition-colors text-left"
                >
                  <BookThumbnail src={book.thumbnail} title={book.title} className="w-10 h-14 rounded-xl flex-none shadow-xs" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100 truncate">{book.title}</p>
                    <p className="text-xs text-zinc-400 truncate">{book.authors}</p>
                    {book.read_at && (
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                        ✓ {new Date(book.read_at).toLocaleDateString('ko-KR')} 읽음
                      </p>
                    )}
                  </div>
                </button>
              ))}
            {readCount > 5 && (
              <p className="text-center text-xs text-zinc-400 pt-1">+{readCount - 5}권 더...</p>
            )}
          </div>
        </div>
      )}

      {/* 읽은 책이 없을 때 */}
      {readCount === 0 && (
        <div className="py-16 text-center">
          <div className="text-4xl mb-3">📖</div>
          <p className="text-zinc-500 font-bold text-sm">아직 읽은 책이 없어요</p>
          <p className="text-zinc-400 text-xs mt-1">내 서재에서 읽은 책에 표시해 보세요</p>
        </div>
      )}
    </div>
  );
};

export default StatsTab;
