'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Bug 4 fix: 타이머 참조 보관 → 새 토스트가 오면 기존 타이머 취소하여 누적 방지
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now();
    // 기존 타이머 취소 (이전 자동 제거가 새 토스트를 잘못 지우는 상황 방지)
    if (timerRef.current) clearTimeout(timerRef.current);
    // 새로운 토스트가 오면 기존 목록을 비워 겹침 방지
    setToasts([{ id, message, type }]);

    timerRef.current = setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
      timerRef.current = null;
    }, 3000);
  }, []);

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-xs space-y-2 px-4 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 p-4 rounded-2xl shadow-xl border animate-in fade-in slide-in-from-bottom-4 duration-300 ${
              toast.type === 'success' 
                ? 'bg-white dark:bg-zinc-900 border-green-100 dark:border-green-900/30 text-green-600' 
                : toast.type === 'error'
                ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30 text-red-600'
                : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-600'
            }`}
          >
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 flex-none" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 flex-none" />}
            {toast.type === 'info' && <Info className="w-5 h-5 flex-none" />}
            
            <p className="text-sm font-bold flex-1 line-clamp-2">{toast.message}</p>
            
            <button 
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors flex-none"
            >
              <X className="w-4 h-4 opacity-50" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
