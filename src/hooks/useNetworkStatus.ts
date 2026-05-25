'use client';

import { useState, useEffect } from 'react';

/**
 * 네트워크 온라인/오프라인 상태를 추적하는 훅
 *
 * - 초기값 true: SSR 단계에서 navigator 접근 불가 → hydration 불일치 방지
 * - useEffect 마운트 후 실제 상태로 교정
 * - online/offline 이벤트로 실시간 갱신
 */
export function useNetworkStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
