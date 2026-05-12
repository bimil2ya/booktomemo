'use client';

import React from 'react';
import { X, HelpCircle, ArrowRight, MousePointer2, Library, Search, BookOpen, MessageSquare, Smartphone, ChevronRight } from 'lucide-react';

interface UsageGuideModalProps {
  onClose: () => void;
}

const UsageGuideModal: React.FC<UsageGuideModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}>
      <div 
        className="bg-zinc-50 dark:bg-zinc-950 w-full max-w-2xl h-full sm:h-[90vh] sm:rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="px-8 py-6 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl text-purple-600">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">앱 사용 가이드</h2>
              <p className="text-xs text-zinc-500 font-medium tracking-tight">처음이신가요? 차근차근 따라해보세요!</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <X className="w-6 h-6 text-zinc-400" />
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-6 sm:p-10 space-y-24 pb-32">
          
          {/* Section 1: 시작하기 & 주 도서관 */}
          <section className="space-y-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-purple-600 font-black uppercase text-[10px] tracking-widest">
                <Library className="w-3 h-3" /> Step 01
              </div>
              <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">나만의 서재와 주 도서관 설정</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                이름과 비밀번호만 입력하면 즉시 나만의 서재가 생성됩니다. <br/>
                <span className="font-bold text-zinc-900 dark:text-zinc-100 underline decoration-purple-500/30 underline-offset-4">주 도서관 설정</span>은 필수! 내가 책을 빌릴 수 있는 지를 자동으로 확인해줍니다.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <img src="/guide/login-1.png" alt="로그인" className="rounded-3xl border border-zinc-200 shadow-xl" />
                <p className="text-[10px] text-center font-bold text-zinc-400">서재 주인 이름 입력</p>
              </div>
              <div className="space-y-2">
                <img src="/guide/login-2.png" alt="도서관 선택" className="rounded-3xl border border-zinc-200 shadow-xl" />
                <p className="text-[10px] text-center font-bold text-zinc-400">지역 및 도서관 선택</p>
              </div>
            </div>
          </section>

          {/* Section 2: 스마트 도서 탐색 */}
          <section className="space-y-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-purple-600 font-black uppercase text-[10px] tracking-widest">
                <Search className="w-3 h-3" /> Step 02
              </div>
              <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">스마트한 도서 탐색</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                궁금한 책을 검색하고, <span className="font-bold text-purple-600">결과내 재검색</span>으로 결과를 좁혀보세요. <br/>
                가장 정교한 검색 결과를 빠르게 얻을 수 있습니다.
              </p>
            </div>
            <div className="space-y-4">
              <img src="/guide/search-smart.png" alt="스마트 검색" className="rounded-3xl border border-zinc-200 shadow-xl w-full" />
              <p className="text-[10px] text-center font-bold text-zinc-400">입력창 하단의 결과 요약과 재검색 활용</p>
            </div>
          </section>

          {/* Section 2.5: 저자명 클릭 검색 (신규) */}
          <section className="space-y-8 bg-purple-50/50 dark:bg-purple-900/5 p-6 rounded-[2.5rem] border border-purple-100 dark:border-purple-900/20">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-purple-600 font-black uppercase text-[10px] tracking-widest">
                <MousePointer2 className="w-3 h-3" /> Pro Tip
              </div>
              <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">저자 이름 클릭 검색</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                검색 결과에서 <span className="inline-flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/30 px-1.5 py-0.5 rounded text-yellow-700 dark:text-yellow-400 font-bold">보라색 저자명</span>을 클릭해보세요! <br/>
                해당 저자의 다른 작품들을 즉시 찾아서 보여줍니다.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <img src="/guide/search-author-1.png" alt="저자 클릭 전" className="rounded-3xl border border-zinc-200 shadow-xl" />
                <p className="text-[10px] text-center font-bold text-zinc-400">보라색 저자명 클릭</p>
              </div>
              <div className="space-y-2">
                <img src="/guide/search-author-2.png" alt="저자 클릭 후" className="rounded-3xl border border-zinc-200 shadow-xl" />
                <p className="text-[10px] text-center font-bold text-zinc-400">저자의 도서 목록 자동 검색</p>
              </div>
            </div>
          </section>

          {/* Section 3: 서재 관리 & 메모 */}
          <section className="space-y-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-purple-600 font-black uppercase text-[10px] tracking-widest">
                <MessageSquare className="w-3 h-3" /> Step 03
              </div>
              <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">내 서재와 메모 검색</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                책마다 <span className="italic underline underline-offset-4 decoration-purple-500/30 font-bold text-zinc-900 dark:text-zinc-100">희우재</span>, <span className="italic underline underline-offset-4 decoration-purple-500/30 font-bold text-zinc-900 dark:text-zinc-100">간달프 추천</span> 등 키워드를 남겨두세요. <br/>
                나중에 서재 검색창에 키워드만 치면 관련 책들을 마법처럼 모아줍니다.
              </p>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <img src="/guide/library-3.png" alt="희우재 검색" className="rounded-3xl border border-zinc-200 shadow-xl" />
                  <p className="text-[10px] text-center font-bold text-zinc-400">모임 키워드 검색</p>
                </div>
                <div className="space-y-2">
                  <img src="/guide/library-4.png" alt="간달프 검색" className="rounded-3xl border border-zinc-200 shadow-xl" />
                  <p className="text-[10px] text-center font-bold text-zinc-400">추천인 키워드 검색</p>
                </div>
              </div>
              <img src="/guide/library-1.png" alt="보관함 목록" className="rounded-3xl border border-zinc-200 shadow-xl w-full" />
            </div>
          </section>

          {/* Section 4: 도서관 현황 */}
          <section className="space-y-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-purple-600 font-black uppercase text-[10px] tracking-widest">
                <BookOpen className="w-3 h-3" /> Step 04
              </div>
              <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">실시간 도서관 현황 확인</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                도서 상세 페이지에서 내 주 도서관의 상태를 바로 확인하세요. <br/>
                빌릴 수 있는 지, 혹은 다른 지역 도서관에 있는 지 한 눈에 보여줍니다.
              </p>
            </div>
            <div className="space-y-4">
              <img src="/guide/detail-1.png" alt="대출 가능" className="rounded-3xl border border-zinc-200 shadow-xl w-full" />
              <img src="/guide/detail-4.png" alt="대출 중" className="rounded-3xl border border-zinc-200 shadow-xl w-full" />
              <div className="p-5 bg-zinc-100 dark:bg-zinc-800 rounded-[2rem] text-[10px] font-medium text-zinc-500 dark:text-zinc-400 leading-relaxed text-center">
                ※ 데이터는 전일 기준이므로 정확한 상태는 [도서관 연결] 버튼으로 확인하세요.
              </div>
            </div>
          </section>

          {/* Section 5: 홈 화면 추가 (신규) */}
          <section className="space-y-12 pb-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-purple-600 font-black uppercase text-[10px] tracking-widest">
                <Smartphone className="w-3 h-3" /> Step 05
              </div>
              <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">바탕화면에 앱으로 추가하기</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                웹 브라우저를 켜지 않고 바탕화면에서 바로 실행하세요. <br/>
                실제 앱처럼 깔끔한 아이콘으로 이용하실 수 있습니다.
              </p>
            </div>

            {/* iOS Guide */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-black w-fit">
                아이폰 (iOS / Safari)
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 text-center">
                  <img src="/guide/shortcut-ios-1.png" alt="iOS 1단계" className="rounded-3xl border border-zinc-200 shadow-xl" />
                  <p className="text-[10px] font-bold text-zinc-500">1. 공유 버튼 클릭</p>
                </div>
                <div className="space-y-2 text-center">
                  <img src="/guide/shortcut-ios-2.png" alt="iOS 2단계" className="rounded-3xl border border-zinc-200 shadow-xl" />
                  <p className="text-[10px] font-bold text-zinc-500">2. 홈 화면에 추가</p>
                </div>
              </div>
            </div>

            {/* Android Guide */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-xl text-xs font-black w-fit">
                삼성 갤럭시 (Android / Chrome)
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 text-center">
                  <img src="/guide/shortcut-galaxy-1.png" alt="Android 1단계" className="rounded-3xl border border-zinc-200 shadow-xl" />
                  <p className="text-[10px] font-bold text-zinc-500">1. 휴대폰에 추가</p>
                </div>
                <div className="space-y-2 text-center">
                  <img src="/guide/shortcut-galaxy-2.png" alt="Android 2단계" className="rounded-3xl border border-zinc-200 shadow-xl" />
                  <p className="text-[10px] font-bold text-zinc-500">2. 설치/추가 완료</p>
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* Footer Action */}
        <div className="p-8 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 flex justify-center">
          <button 
            onClick={onClose}
            className="w-full max-w-xs py-4 bg-purple-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-purple-200 dark:shadow-none hover:bg-purple-700 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            가이드 닫고 시작하기 <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default UsageGuideModal;