'use client';

// Next.js App Router route 단위 오류 경계
// 이 파일이 있으면 컴포넌트 throw 시 앱 전체 크래시 대신 이 화면으로 대체됨

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 오류 기록 (추후 Sentry 등 모니터링 연동 시 여기에 전송)
    console.error('[Error Boundary]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 p-8 bg-zinc-50 dark:bg-zinc-950">
      <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-red-400" />
      </div>
      <div className="text-center space-y-1.5">
        <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">
          일시적인 오류가 발생했습니다
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xs">
          네트워크 문제나 서버 오류일 수 있습니다.
          {error.digest && (
            <span className="block mt-1 text-[10px] text-zinc-400 font-mono">
              {error.digest}
            </span>
          )}
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-sm font-bold rounded-2xl transition-all shadow-md"
      >
        <RefreshCw className="w-4 h-4" />
        다시 시도
      </button>
    </div>
  );
}
