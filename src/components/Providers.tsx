'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ToastProvider } from '@/context/ToastContext';
import { LibraryProvider } from '@/context/LibraryContext';
import { OfflineBanner } from '@/components/OfflineBanner';

export default function Providers({
  children,
  initialLibraryName
}: {
  children: React.ReactNode;
  initialLibraryName: string | null;
}) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // 데이터가 'stale'하다고 판단되는 시간 (5분)
        staleTime: 1000 * 60 * 5,
        // 윈도우 포커스 시 자동으로 리페칭하는 기능 끄기 (모바일 앱 경험 위주)
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        {/* OfflineBanner: ToastProvider 안에서 useToast() 사용 가능, fixed 위치로 DOM 순서 무관 */}
        <OfflineBanner />
        <LibraryProvider initialLibraryName={initialLibraryName}>
          {children}
        </LibraryProvider>
      </ToastProvider>
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
