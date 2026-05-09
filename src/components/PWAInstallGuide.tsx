'use client';

import React from 'react';
import { Download, Share, PlusSquare, X } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';

const PWAInstallGuide: React.FC = () => {
  const { isInstallable, isIOS, isStandalone, showGuide, installPWA, closeGuide } = usePWA();

  // 이미 설치되어 있거나 가이드를 닫았다면 렌더링하지 않음
  if (isStandalone || !showGuide) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[60] animate-in fade-in slide-in-from-bottom-8 duration-500">
      <div className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 p-5 rounded-[2.5rem] shadow-2xl relative border border-white/10 dark:border-zinc-200">
        <button 
          onClick={closeGuide}
          className="absolute top-4 right-4 p-2 hover:bg-white/10 dark:hover:bg-black/5 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center flex-none">
              <Download className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base">앱으로 설치하고 더 편하게!</h3>
              <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-0.5">홈 화면에 추가하면 바로 접속할 수 있어요.</p>
            </div>
          </div>

          <div className="h-px bg-white/10 dark:bg-zinc-100" />

          {isIOS ? (
            // iOS 전용 가이드
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm font-medium">
                <div className="w-6 h-6 bg-zinc-800 dark:bg-zinc-100 rounded-lg flex items-center justify-center text-[10px] font-bold">1</div>
                <p>하단 도구바의 <span className="inline-block p-1 bg-zinc-800 dark:bg-zinc-100 rounded mx-0.5"><Share className="w-3.5 h-3.5 text-blue-500" /></span> 공유 버튼 클릭</p>
              </div>
              <div className="flex items-center gap-3 text-sm font-medium">
                <div className="w-6 h-6 bg-zinc-800 dark:bg-zinc-100 rounded-lg flex items-center justify-center text-[10px] font-bold">2</div>
                <p>스크롤을 내려 <span className="font-bold underline underline-offset-4 decoration-purple-500 whitespace-nowrap"><PlusSquare className="w-4 h-4 inline-block mb-1 mr-1" /> 홈 화면에 추가</span> 선택</p>
              </div>
            </div>
          ) : (
            // Android 및 기타 (브라우저 지원 시)
            <div className="flex flex-col gap-2">
              <button
                onClick={installPWA}
                disabled={!isInstallable}
                className={`w-full py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${isInstallable ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-zinc-800 dark:bg-zinc-100 text-zinc-500 cursor-not-allowed'}`}
              >
                {isInstallable ? '지금 바로 설치하기' : '브라우저 메뉴에서 설치 가능합니다'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PWAInstallGuide;
