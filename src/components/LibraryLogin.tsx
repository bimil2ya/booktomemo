'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Library, Loader2, MapPin, Clock, X, Key, Eye, EyeOff, Info } from 'lucide-react';
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
  const lastFetchTime = useRef<number>(0);
  
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
  const isFirstLoad = useRef(true);
  const fetchLibraries = useCallback(async () => {
    const now = Date.now();
    if (!isFirstLoad.current && now - lastFetchTime.current < 300) return;
    
    setSearchLibLoading(true);
    setError(null);
    lastFetchTime.current = now;
    isFirstLoad.current = false;

    try {
      const { data, error, fallbackInfo } = await searchLibrariesAction(selectedRegion, selectedSubRegion, 'guest');
      setFallbackMsg(fallbackInfo || null);
      if (error) {
        setError(error);
        setAvailableLibs([]);
      } else if (data) {
        setAvailableLibs(data.map((item: { lib: { libCode: string; libName: string; address: string; homepage: string } }) => ({
          libCode: item.lib.libCode,
          libName: item.lib.libName,
          address: item.lib.address,
          homepage: item.lib.homepage
        })));
      }
    } catch {
      setError('도서관 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setSearchLibLoading(false);
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
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mx-auto">
            <Library className="w-8 h-8 text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">나만의 서재 만들기</h1>
          <p className="text-zinc-500 text-sm">사용하실 서재 이름을 입력하고<br/>주로 이용하는 도서관을 선택해주세요.</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-2xl">
            <p className="text-[11px] text-red-600 dark:text-red-400 font-bold text-center">{error}</p>
          </div>
        )}
        
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-end px-1">
                <label className="text-[10px] font-bold text-zinc-400">서재 주인 이름</label>
                {checkingLibrary && <Loader2 className="w-3 h-3 text-purple-500 animate-spin" />}
                {!checkingLibrary && isExistingLibrary === true && <span className="text-[9px] font-bold text-blue-500">기존 서재 발견</span>}
                {!checkingLibrary && isExistingLibrary === false && <span className="text-[9px] font-bold text-purple-500">신규 서재 생성</span>}
              </div>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="예: 경호"
                className="w-full px-4 py-3 rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {normalizeName(nameInput).length >= 2 && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 ml-1">
                  {isExistingLibrary ? '서재 비밀번호' : '사용할 비밀번호 설정'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder={isExistingLibrary ? "비밀번호를 입력하세요" : "비밀번호를 정해주세요"}
                    className="w-full pl-4 pr-12 py-3 rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-lg focus:ring-2 focus:ring-purple-500"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-zinc-400"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                
                {isExistingLibrary && (
                  <div className="flex justify-end">
                    <button 
                      onClick={() => setShowMasterCodeInput(true)}
                      className="text-[10px] font-bold text-zinc-400 hover:text-purple-600 transition-colors"
                    >
                      비밀번호가 생각나지 않으세요?
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3 bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-3.5 h-3.5 text-purple-500" />
                <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">내 동네 도서관 찾기</span>
              </div>
              
              <div className="flex gap-2">
                <select 
                  value={selectedRegion}
                  onChange={(e) => updatePrimaryLib(myPrimaryLib || {libCode: '', libName: '', address: ''}, e.target.value, '')}
                  className="flex-1 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-lg text-xs p-2 focus:ring-purple-500"
                >
                  {REGIONS.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
                </select>
                <select 
                  value={selectedSubRegion}
                  onChange={(e) => updatePrimaryLib(myPrimaryLib || {libCode: '', libName: '', address: ''}, selectedRegion, e.target.value)}
                  className="flex-1 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-lg text-xs p-2 focus:ring-purple-500"
                >
                  {(SUB_REGIONS[selectedRegion] || [{code: '', name: '전체'}]).map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                </select>
              </div>

              <div className="relative">
                <div className="max-h-40 overflow-y-auto pr-1 no-scrollbar space-y-1.5 mt-2">
                  {searchLibLoading ? (
                    <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 text-purple-500 animate-spin" /></div>
                  ) : (
                    <>
                      {fallbackMsg && (
                        <div className="sticky top-0 z-10 pb-2">
                          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-lg">
                            <p className="text-[9px] text-blue-600 dark:text-blue-400 font-bold leading-tight flex items-center gap-1">
                              <Info className="w-3 h-3 flex-none" /> {fallbackMsg}
                            </p>
                          </div>
                        </div>
                      )}
                      {availableLibs.length > 0 ? (
                        availableLibs.map(lib => (
                          <div 
                            key={lib.libCode}
                            onClick={() => updatePrimaryLib(lib, selectedRegion, selectedSubRegion)}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${myPrimaryLib?.libCode === lib.libCode ? 'bg-purple-600 border-purple-600 text-white shadow-md' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-purple-300'}`}
                          >
                            <div className="text-[11px] font-bold truncate">{lib.libName}</div>
                            <div className={`text-[9px] mt-0.5 opacity-70 truncate ${myPrimaryLib?.libCode === lib.libCode ? 'text-white' : 'text-zinc-400'}`}>{lib.address}</div>
                          </div>
                        ))
                      ) : (
                        <div className="py-8 text-center text-[10px] text-zinc-400">조회된 도서관이 없습니다.</div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => handleLogin()}
              disabled={!nameInput.trim() || !passwordInput.trim() || enteringLibrary || checkingLibrary}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${(!nameInput.trim() || !passwordInput.trim() || enteringLibrary || checkingLibrary) ? 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800' : 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg'}`}
            >
              {enteringLibrary ? <Loader2 className="w-5 h-5 animate-spin" /> : isExistingLibrary ? '서재 입장하기' : '서재 새로 만들기'}
            </button>
          </div>

          {libraryHistory.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <p className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5 px-1">
                <Clock className="w-3 h-3" /> 최근 접속한 서재
              </p>
              <div className="flex flex-wrap gap-2">
                {libraryHistory.map((name) => (
                  <div 
                    key={name}
                    onClick={() => setNameInput(name)}
                    className="group flex items-center gap-2 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 rounded-full border border-zinc-200 dark:border-zinc-700 cursor-pointer hover:border-purple-300 dark:hover:border-purple-900/50 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all"
                  >
                    <span className="text-sm font-bold text-zinc-600 dark:text-zinc-300">{name}의 서재</span>
                    <button 
                      onClick={(e) => removeFromHistory(e, name)}
                      className="p-1 text-zinc-400 hover:text-red-500 transition-all rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {showMasterCodeInput && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-sm p-6 rounded-[2rem] shadow-2xl space-y-6" onClick={e => e.stopPropagation()}>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto text-zinc-400">
                  <Key className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">비밀번호 찾기</h3>
                <p className="text-xs text-zinc-500">관리자(마스터) 코드를 입력하세요.</p>
              </div>

              {recoveredPassword ? (
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-2xl border border-purple-100 dark:border-purple-900/50 text-center">
                  <p className="text-[10px] text-purple-400 font-bold uppercase mb-1">찾은 비밀번호</p>
                  <p className="text-2xl font-black text-purple-600 dark:text-purple-400 tracking-widest">{recoveredPassword}</p>
                  <button 
                    onClick={() => {
                      setPasswordInput(recoveredPassword);
                      setShowMasterCodeInput(false);
                      setRecoveredPassword(null);
                      setMasterCodeInput('');
                    }}
                    className="mt-4 text-xs font-bold text-purple-600 underline"
                  >
                    이 비밀번호로 바로 입력하기
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <input
                    type="password"
                    value={masterCodeInput}
                    onChange={(e) => setMasterCodeInput(e.target.value)}
                    placeholder="마스터 코드 입력"
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-800 rounded-xl text-center text-xl tracking-widest font-bold focus:ring-2 focus:ring-purple-500"
                  />
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setShowMasterCodeInput(false);
                        setMasterCodeInput('');
                      }}
                      className="flex-1 py-3 text-zinc-500 font-bold text-sm bg-zinc-100 dark:bg-zinc-800 rounded-xl"
                    >
                      취소
                    </button>
                    <button 
                      onClick={handleFindPassword}
                      className="flex-1 py-3 bg-purple-600 text-white font-bold text-sm rounded-xl shadow-lg"
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
