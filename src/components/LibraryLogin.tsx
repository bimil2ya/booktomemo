'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Library, Loader2, MapPin, Clock, X, Key, Eye, EyeOff, Info, User, Lock } from 'lucide-react';
import { LibraryInfo } from '@/types';
import { REGIONS, SUB_REGIONS } from '@/constants/regions';
import { normalizeName } from '@/utils/helpers';
import { useLibrary } from '@/context/LibraryContext';
import { searchLibrariesAction, getLibraryPasswordWithMasterCodeAction } from '@/app/actions';

const LibraryLogin: React.FC = () => {
  const { 
    login, 
    checkExists, 
    selectedRegion, 
    selectedSubRegion, 
    updatePrimaryLib,
    myPrimaryLib
  } = useLibrary();

  // 내부 폼 상태
  const [nameInput, setNameInput] = useState('경호');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isExistingLibrary, setIsExistingLibrary] = useState<boolean | null>(null);
  const [checkingLibrary, setCheckingLibrary] = useState(false);
  const [enteringLibrary, setEnteringLibrary] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 도서관 검색 상태
  const [availableLibs, setAvailableLibs] = useState<LibraryInfo[]>([]);
  const [searchLibLoading, setSearchLibLoading] = useState(false);
  const [fallbackMsg, setFallbackMsg] = useState<string | null>(null);
  
  
  // 마스터 코드/비밀번호 찾기 상태
  const [showMasterCodeInput, setShowMasterCodeInput] = useState(false);
  const [masterCodeInput, setMasterCodeInput] = useState('');
  const [recoveredPassword, setRecoveredPassword] = useState<string | null>(null);

  // 히스토리 상태
  const [libraryHistory, setLibraryHistory] = useState<string[]>([]);

  useEffect(() => {
    const history = localStorage.getItem('library_history');
    if (history) {
      const parsedHistory: string[] = JSON.parse(history);
      setLibraryHistory(Array.from(new Set(parsedHistory.map(normalizeName))));
    }
  }, []);

  // 도서관 목록 호출 (Throttling 적용: 초기 로드 이후 잦은 변경 방지)
  const lastRequestId = useRef(0);
  const fetchLibraries = useCallback(async () => {
    const requestId = ++lastRequestId.current;
    setSearchLibLoading(true);
    setError(null);

    // Debounce: 아주 짧은 대기를 통해 연속적인 상태 업데이트를 하나로 묶음
    await new Promise(resolve => setTimeout(resolve, 150));
    if (requestId !== lastRequestId.current) return;

    try {
      const { data, error, fallbackInfo } = await searchLibrariesAction(selectedRegion, selectedSubRegion, 'guest');
      if (requestId !== lastRequestId.current) return;

      setFallbackMsg(fallbackInfo || null);
      if (error) {
        setError(error);
        setAvailableLibs([]);
      } else if (data) {
        const sortedLibs = data
          .map((item: { lib: { libCode: string; libName: string; address: string; homepage: string } }) => ({
            libCode: item.lib.libCode,
            libName: item.lib.libName,
            address: item.lib.address,
            homepage: item.lib.homepage
          }))
          .sort((a, b) => a.libName.localeCompare(b.libName, 'ko'));
        setAvailableLibs(sortedLibs);
      }
    } catch {
      if (requestId === lastRequestId.current) {
        setError('도서관 목록을 불러오는 중 오류가 발생했습니다.');
      }
    } finally {
      if (requestId === lastRequestId.current) {
        setSearchLibLoading(false);
      }
    }
  }, [selectedRegion, selectedSubRegion]);

  useEffect(() => {
    fetchLibraries();
  }, [fetchLibraries]);

  // 서재 존재 여부 실시간 확인
  useEffect(() => {
    const timer = setTimeout(async () => {
      const finalName = normalizeName(nameInput);
      if (finalName.length < 2) {
        setIsExistingLibrary(null);
        return;
      }
      setCheckingLibrary(true);
      const { exists, error } = await checkExists(finalName);
      if (error) setError(error);
      setIsExistingLibrary(exists);
      setCheckingLibrary(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [nameInput, checkExists]);

  const handleLogin = async (selectedName?: string) => {
    const nameToUse = selectedName || nameInput;
    if (!nameToUse.trim()) return;
    
    setEnteringLibrary(true);
    setError(null);

    const { success, error: loginError } = await login(
      nameToUse, 
      passwordInput, 
      isExistingLibrary ?? true
    );

    if (!success) {
      setError(loginError || '로그인에 실패했습니다.');
      setEnteringLibrary(false);
    }
  };

  const handleFindPassword = async () => {
    const finalName = normalizeName(nameInput);
    if (!masterCodeInput.trim()) return;

    const { password, error } = await getLibraryPasswordWithMasterCodeAction(finalName, masterCodeInput);
    if (error) {
      setError(error);
    } else if (password) {
      setRecoveredPassword(password);
    }
  };

  const removeFromHistory = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    const newHistory = libraryHistory.filter(h => h !== name);
    localStorage.setItem('library_history', JSON.stringify(newHistory));
    setLibraryHistory(newHistory);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-xl space-y-6 overflow-hidden">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mx-auto transition-transform hover:scale-110 duration-300">
            <Library className="w-8 h-8 text-purple-600" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">반가워요!</h1>
            <p className="text-zinc-500 text-sm font-medium">당신의 소중한 서재가 기다리고 있어요</p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-2xl animate-shake">
            <p className="text-xs text-red-600 dark:text-red-400 font-bold text-center">{error}</p>
          </div>
        )}
        
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-end px-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">서재 주인 이름</label>
                {checkingLibrary && <Loader2 className="w-3 h-3 text-purple-500 animate-spin" />}
                {!checkingLibrary && isExistingLibrary === true && (
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[9px] font-black rounded-full uppercase tracking-tighter">기존 서재 발견</span>
                )}
                {!checkingLibrary && isExistingLibrary === false && (
                  <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[9px] font-black rounded-full uppercase tracking-tighter">신규 서재 생성</span>
                )}
              </div>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-purple-500 transition-colors" />
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="이름을 입력하세요"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border-none bg-zinc-50 dark:bg-zinc-800 text-lg font-bold focus:ring-2 focus:ring-purple-500 transition-all outline-none"
                />
              </div>
            </div>

            {normalizeName(nameInput).length >= 2 && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex justify-between items-end px-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    {isExistingLibrary ? '서재 비밀번호' : '사용할 비밀번호 설정'}
                  </label>
                  {isExistingLibrary && (
                    <button 
                      onClick={() => setShowMasterCodeInput(true)}
                      className="text-[9px] font-black text-zinc-400 hover:text-purple-600 transition-colors uppercase tracking-tighter"
                    >
                      비밀번호를 잊으셨나요?
                    </button>
                  )}
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-purple-500 transition-colors" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder={isExistingLibrary ? "비밀번호를 입력하세요" : "비밀번호를 정해주세요"}
                    className="w-full pl-12 pr-12 py-4 rounded-2xl border-none bg-zinc-50 dark:bg-zinc-800 text-lg font-bold focus:ring-2 focus:ring-purple-500 transition-all outline-none tracking-widest"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-zinc-400 hover:text-zinc-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-4 bg-zinc-50/50 dark:bg-zinc-800/30 p-5 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-inner-sm">
              <div className="flex items-center gap-2 mb-1 px-1">
                <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <MapPin className="w-3.5 h-3.5 text-purple-600" />
                </div>
                <span className="text-xs font-black text-zinc-700 dark:text-zinc-300 uppercase tracking-tight">내 동네 도서관 찾기</span>
              </div>
              
              <div className="flex gap-2">
                <select 
                  value={selectedRegion}
                  onChange={(e) => updatePrimaryLib(myPrimaryLib || {libCode: '', libName: '', address: ''}, e.target.value, '')}
                  className="flex-1 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold p-3 focus:ring-2 focus:ring-purple-500 outline-none shadow-sm cursor-pointer"
                >
                  {REGIONS.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
                </select>
                <select 
                  value={selectedSubRegion}
                  onChange={(e) => updatePrimaryLib(myPrimaryLib || {libCode: '', libName: '', address: ''}, selectedRegion, e.target.value)}
                  className="flex-1 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold p-3 focus:ring-2 focus:ring-purple-500 outline-none shadow-sm cursor-pointer"
                >
                  {(SUB_REGIONS[selectedRegion] || [{code: '', name: '전체'}]).map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                </select>
              </div>

              <div className="relative">
                <div className="max-h-40 overflow-y-auto pr-1 custom-scrollbar space-y-2 mt-2">
                  {searchLibLoading ? (
                    <div className="py-10 flex flex-col items-center gap-3">
                      <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                      <span className="text-[10px] font-bold text-zinc-400">도서관을 찾는 중...</span>
                    </div>
                  ) : (
                    <>
                      {fallbackMsg && (
                        <div className="sticky top-0 z-10 pb-2">
                          <div className="p-3 bg-blue-50/80 dark:bg-blue-900/20 backdrop-blur-md border border-blue-100 dark:border-blue-900/30 rounded-xl shadow-sm">
                            <p className="text-[10px] text-blue-700 dark:text-blue-300 font-bold leading-tight flex items-center gap-2">
                              <Info className="w-3.5 h-3.5 flex-none" /> {fallbackMsg}
                            </p>
                          </div>
                        </div>
                      )}
                      {availableLibs.length > 0 ? (
                        availableLibs.map(lib => (
                          <div 
                            key={lib.libCode}
                            onClick={() => updatePrimaryLib(lib, selectedRegion, selectedSubRegion)}
                            className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${myPrimaryLib?.libCode === lib.libCode ? 'bg-purple-600 border-purple-600 text-white shadow-lg transform scale-[1.02]' : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-purple-200 hover:shadow-md'}`}
                          >
                            <div className="text-xs font-black truncate">{lib.libName}</div>
                            <div className={`text-[9px] mt-1 font-medium opacity-80 truncate ${myPrimaryLib?.libCode === lib.libCode ? 'text-white' : 'text-zinc-400'}`}>{lib.address}</div>
                          </div>
                        ))
                      ) : (
                        <div className="py-10 text-center flex flex-col items-center gap-2">
                          <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-300">
                            <Library className="w-5 h-5" />
                          </div>
                          <span className="text-[10px] font-bold text-zinc-400">조회된 도서관이 없습니다.</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => handleLogin()}
              disabled={!nameInput.trim() || !passwordInput.trim() || enteringLibrary || checkingLibrary}
              className={`w-full py-5 rounded-[1.5rem] font-black text-lg transition-all flex items-center justify-center gap-3 transform active:scale-95 ${(!nameInput.trim() || !passwordInput.trim() || enteringLibrary || checkingLibrary) ? 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800' : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xl shadow-purple-200 dark:shadow-none hover:brightness-110'}`}
            >
              {enteringLibrary ? <Loader2 className="w-6 h-6 animate-spin" /> : isExistingLibrary ? '서재 입장하기' : '서재 새로 만들기'}
            </button>
          </div>

          {libraryHistory.length > 0 && (
            <div className="space-y-4 pt-6 border-t border-zinc-100 dark:border-zinc-800">
              <p className="text-[10px] font-black text-zinc-400 flex items-center gap-1.5 px-1 uppercase tracking-widest">
                <Clock className="w-3.5 h-3.5" /> 최근 접속한 서재
              </p>
              <div className="flex flex-wrap gap-2">
                {libraryHistory.map((name) => (
                  <div 
                    key={name}
                    onClick={() => setNameInput(name)}
                    className="group flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 rounded-full border border-zinc-200 dark:border-zinc-700 cursor-pointer hover:border-purple-400 dark:hover:border-purple-600 hover:shadow-md transition-all"
                  >
                    <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">{name}</span>
                    <button 
                      onClick={(e) => removeFromHistory(e, name)}
                      className="p-1 text-zinc-300 hover:text-red-500 transition-colors rounded-full"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {showMasterCodeInput && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-sm p-8 rounded-[2.5rem] shadow-2xl space-y-8" onClick={e => e.stopPropagation()}>
              <div className="text-center space-y-3">
                <div className="w-14 h-14 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto text-zinc-400">
                  <Key className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">비밀번호 찾기</h3>
                  <p className="text-xs text-zinc-500 font-medium">관리자(마스터) 코드를 입력하세요.</p>
                </div>
              </div>

              {recoveredPassword ? (
                <div className="p-6 bg-purple-50 dark:bg-purple-900/20 rounded-[1.5rem] border border-purple-100 dark:border-purple-900/50 text-center space-y-4">
                  <p className="text-[11px] text-purple-400 font-black uppercase tracking-widest">찾은 비밀번호</p>
                  <p className="text-3xl font-black text-purple-600 dark:text-purple-400 tracking-[0.2em]">{recoveredPassword}</p>
                  <button 
                    onClick={() => {
                      setPasswordInput(recoveredPassword);
                      setShowMasterCodeInput(false);
                      setRecoveredPassword(null);
                      setMasterCodeInput('');
                    }}
                    className="w-full py-3 text-sm font-black text-purple-600 underline underline-offset-4 decoration-2"
                  >
                    이 비밀번호로 바로 입장하기
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <input
                    type="password"
                    value={masterCodeInput}
                    onChange={(e) => setMasterCodeInput(e.target.value)}
                    placeholder="마스터 코드"
                    className="w-full px-4 py-4 bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl text-center text-2xl tracking-[0.3em] font-black focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        setShowMasterCodeInput(false);
                        setMasterCodeInput('');
                      }}
                      className="flex-1 py-4 text-zinc-500 font-black text-sm bg-zinc-100 dark:bg-zinc-800 rounded-2xl"
                    >
                      취소
                    </button>
                    <button 
                      onClick={handleFindPassword}
                      className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-sm rounded-2xl shadow-lg"
                    >
                      조회하기
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LibraryLogin;
