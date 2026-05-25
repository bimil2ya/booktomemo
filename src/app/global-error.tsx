'use client';

// Root layout 자체에서 발생하는 오류 경계
// layout.tsx를 완전히 대체하므로 <html><body> 포함 필수

import { RefreshCw } from 'lucide-react';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 bg-zinc-50">
        <h2 className="text-lg font-bold text-zinc-800">앱 오류가 발생했습니다</h2>
        <p className="text-sm text-zinc-500 text-center">페이지를 다시 불러와 주세요.</p>
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-2xl transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          다시 시도
        </button>
      </body>
    </html>
  );
}
