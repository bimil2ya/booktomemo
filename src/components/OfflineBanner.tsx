'use client';

import { useRef, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useToast } from '@/context/ToastContext';

/**
 * 인터넷 연결이 끊겼을 때 화면 상단에 고정 표시되는 배너
 *
 * - 온라인 상태: return null (렌더 비용 없음)
 * - z-[100]: BottomNav(z-50)·드롭다운(z-50)보다 위
 * - 온라인 복귀 시 자동 소멸 + "다시 연결됐습니다" Toast
 */
export function OfflineBanner() {
  const isOnline = useNetworkStatus();
  const { showToast } = useToast();
  // 초기값 true: 앱 로드 시 이미 오프라인이어도 "reconnected" toast 미발생
  const prevIsOnlineRef = useRef(true);

  useEffect(() => {
    // 오프라인 → 온라인 전환 시에만 toast (반대 방향은 배너로 충분)
    if (!prevIsOnlineRef.current && isOnline) {
      showToast('인터넷에 다시 연결되었습니다', 'success');
    }
    prevIsOnlineRef.current = isOnline;
  }, [isOnline, showToast]);

  if (isOnline) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white py-2.5 px-4 text-xs font-bold flex items-center justify-center gap-1.5 animate-in slide-in-from-top duration-300"
    >
      <WifiOff className="w-3.5 h-3.5 flex-none" aria-hidden="true" />
      인터넷 연결이 끊겼습니다 — 일부 기능을 사용할 수 없습니다
    </div>
  );
}
