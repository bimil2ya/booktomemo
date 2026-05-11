'use server';

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { cookies } from 'next/headers';
import Anthropic from '@anthropic-ai/sdk';

const getEnv = (key: string) => process.env[key] || '';

function getSupabase() {
  return createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'));
}

const getAnthropic = () => new Anthropic({ apiKey: getEnv('ANTHROPIC_API_KEY') });



async function verifySession(ownerName: string, allowGuest: boolean = false) {
  if (allowGuest && ownerName === 'guest') return;
  const cookieStore = await cookies();
  const sessionName = cookieStore.get('library_owner_name')?.value;
  if (!sessionName) throw new Error('세션이 만료되었습니다. 다시 로그인해주세요.');
  if (sessionName !== ownerName) throw new Error('인증 세션 정보가 일치하지 않습니다.');
}

function handleSupabaseError(error: unknown, context: string) {
  console.error(context + ' Error:', error);
  if (!error) return '[' + context + '] 알 수 없는 오류가 발생했습니다.';
  const err = error as { code?: string; message?: string; hint?: string };

  // 보안을 위해 상세 DB 에러 메시지는 서버 로그에만 남기고, 클라이언트에는 카테고리별 메시지만 전달
  if (err.code === 'PGRST204') return '[설정 오류] 서비스를 이용할 수 없습니다.';
  if (err.code?.startsWith('23')) return '[데이터 오류] 요청한 작업을 수행할 수 없습니다.'; // 제약 조건 위반 등
  if (err.code === '42P01') return '[시스템 오류] 서버 구성이 올바르지 않습니다.';

  return '[' + context + ' 실패] ' + (err.message || String(err));
}

export async function analyzeImageAction(base64Image: string, contentType: string, owner_name: string) {
  try {
    await verifySession(owner_name);
    if (!getEnv('ANTHROPIC_API_KEY')) return { data: null, error: '분석 서버 설정(API 키)이 누락되었습니다.' };
    const response = await getAnthropic().messages.create({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: contentType as 'image/jpeg', data: base64Image } },
          { type: 'text', text: '이 이미지에서 책 제목과 저자 이름을 추출해줘. 제목: [제목], 저자: [저자] 형식으로만 답해줘.' }
        ]
      }]
    });
    const content = response.content[0];
    if (content.type === 'text') {
      const text = content.text;
      const title = text.match(/제목:\s*(.+?)(?:,|$)/)?.[1]?.trim() || '';
      const author = text.match(/저자:\s*(.+?)(?:,|$)/)?.[1]?.trim() || '';
      return { data: { title, author }, error: null };
    }
    return { data: null, error: '텍스트를 추출하지 못했습니다.' };
  } catch (e: unknown) {
    console.error('OCR Error:', e);
    return { data: null, error: '이미지 분석 중 오류가 발생했습니다.' };
  }
}

export async function setLibraryCookieAction(name: string) {
  const cookieStore = await cookies();
  cookieStore.set('library_owner_name', name, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 2592000, path: '/' });
}

export async function clearLibraryCookieAction() {
  (await cookies()).delete('library_owner_name');
}

export async function checkLibraryExistsAction(ownerName: string) {
  try {
    const { data, error } = await getSupabase().from('libraries').select('owner_name').eq('owner_name', ownerName).maybeSingle();
    if (error) throw error;
    return { exists: !!data, error: null };
  } catch (e) {
    return { exists: false, error: handleSupabaseError(e, '서재 확인') };
  }
}

export async function createLibraryAction(ownerName: string, password: string) {
  try {
    const { error } = await getSupabase().from('libraries').insert([{ owner_name: ownerName, password }]);
    if (error) throw error;
    return { success: true, error: null };
  } catch (e) {
    return { success: false, error: handleSupabaseError(e, '서재 생성') };
  }
}

export async function verifyLibraryPasswordAction(ownerName: string, password: string) {
  try {
    const { data, error } = await getSupabase().from('libraries').select('password').eq('owner_name', ownerName).single();
    if (error) throw error;
    return data.password === password ? { success: true, error: null } : { success: false, error: 'PASSWORD_INCORRECT' };
  } catch (e) {
    return { success: false, error: handleSupabaseError(e, '비밀번호 인증') };
  }
}

export async function getLibraryPasswordWithMasterCodeAction(ownerName: string, masterCode: string) {
  try {
    if (masterCode !== getEnv('ADMIN_MASTER_CODE')) return { password: null, error: 'MASTER_CODE_INCORRECT' };
    const { data, error } = await getSupabase().from('libraries').select('password').eq('owner_name', ownerName).single();
    if (error) throw error;
    return { password: data.password, error: null };
  } catch (e) {
    return { password: null, error: handleSupabaseError(e, '비밀번호 조회') };
  }
}

export async function searchBooksAction(query: string, owner_name: string, page: number = 1, size: number = 20) {
  try {
    await verifySession(owner_name, true);
    if (!getEnv('KAKAO_REST_API_KEY')) return { data: null, error: '도서 검색 API 키가 누락되었습니다.' };
    const res = await axios.get('https://dapi.kakao.com/v3/search/book', {
      params: { query, page, size },
      headers: { Authorization: 'KakaoAK ' + getEnv('KAKAO_REST_API_KEY') },
      timeout: 5000
    });
    return { data: res.data.documents || [], meta: res.data.meta, error: null };
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err.code === 'ECONNABORTED') return { data: null, error: '도서 검색 시간이 초과되었습니다. 다시 시도해 주세요.' };
    return { data: null, error: '도서 검색 중 오류가 발생했습니다.' };
  }
}

export async function getBooksAction(owner_name: string, sortColumn: string, sortOrder: string, page: number = 1, size: number = 20) {
  try {
    await verifySession(owner_name);
    const from = (page - 1) * size;
    const to = from + size - 1;
    const { data, error, count } = await getSupabase().from('books').select('*', { count: 'exact' }).eq('owner_name', owner_name).order(sortColumn, { ascending: sortOrder === 'asc' }).range(from, to);
    if (error) throw error;
    return { data, totalCount: count || 0, error: null };
  } catch (e) {
    return { data: null, error: handleSupabaseError(e, '도서 목록 조회') };
  }
}

export async function saveBookAction(book: { owner_name: string; isbn: string; title: string; authors: string; thumbnail: string; contents: string; publisher: string }) {
  try {
    await verifySession(book.owner_name);
    const { data, error: checkError } = await getSupabase().from('books').select('id').eq('owner_name', book.owner_name).eq('isbn', book.isbn).maybeSingle();
    if (checkError) throw checkError;
    if (data) return { success: false, error: 'ALREADY_EXISTS' };
    const { error } = await getSupabase().from('books').insert([book]);
    if (error) throw error;
    return { success: true, error: null };
  } catch (e) {
    return { success: false, error: handleSupabaseError(e, '도서 저장') };
  }
}

export async function updateBookAction(id: number, editData: { title?: string; authors?: string; publisher?: string; personal_memo?: string }, owner_name: string) {
  try {
    await verifySession(owner_name);
    const { error } = await getSupabase().from('books').update(editData).eq('id', id).eq('owner_name', owner_name);
    if (error) throw error;
    return { success: true, error: null };
  } catch (e) {
    return { success: false, error: handleSupabaseError(e, '도서 수정') };
  }
}

export async function deleteBookAction(id: number, owner_name: string) {
  try {
    await verifySession(owner_name);
    const { error } = await getSupabase().from('books').delete().eq('id', id).eq('owner_name', owner_name);
    if (error) throw error;
    return { success: true, error: null };
  } catch (e) {
    return { success: false, error: handleSupabaseError(e, '도서 삭제') };
  }
}

export async function deleteBooksAction(ids: number[], owner_name: string) {
  try {
    await verifySession(owner_name);
    const { error } = await getSupabase().from('books').delete().in('id', ids).eq('owner_name', owner_name);
    if (error) throw error;
    return { success: true, error: null };
  } catch (e) {
    return { success: false, error: handleSupabaseError(e, '선택 도서 삭제') };
  }
}

export async function searchLibrariesAction(region: string, dtl_region: string, owner_name: string) {
  try {
    await verifySession(owner_name, true);
    if (!getEnv('LIBRARY_API_KEY')) return { data: null, error: '도서관 API 키가 누락되었습니다.' };

    const fetchLibs = async (r: string, dtl: string) => {
      const response = await axios.get('http://data4library.kr/api/libSrch', {
        params: { authKey: getEnv('LIBRARY_API_KEY'), format: 'json', pageSize: 100, region: r, ...(dtl ? { dtl_region: dtl } : {}) },
        timeout: 5000
      });
      return response.data?.response?.libs || [];
    };

    // 1차: 지정된 세부 지역으로 조회
    let libs = await fetchLibs(region, dtl_region);
    let fallbackInfo = null;

    // 2차 Fallback: 결과가 없고 '구/군' 단위 조회인 경우 '시' 단위로 상향 (예: 38011 -> 38010)
    if (libs.length === 0 && dtl_region && dtl_region.length === 5 && !dtl_region.endsWith('0')) {
      const cityCode = dtl_region.substring(0, 4) + '0';
      libs = await fetchLibs(region, cityCode);
      if (libs.length > 0) fallbackInfo = '선택하신 구역에 결과가 없어 인근 시 단위로 검색 범위를 넓혔습니다.';
    }

    // 3차 Fallback: 여전히 결과가 없으면 해당 '도' 전체 조회
    if (libs.length === 0 && dtl_region) {
      libs = await fetchLibs(region, '');
      if (libs.length > 0) fallbackInfo = '선택하신 세부 지역에 결과가 없어 해당 광역 지역 전체를 검색했습니다.';
    }

    return { data: libs, error: null, fallbackInfo };
  } catch (_error: unknown) {
    const err = _error as { code?: string; message?: string; response?: { data?: { response?: { error?: string } } } };

    // API 응답 본문에 에러 메시지가 있는 경우 (예: 쿼터 초과)
    const apiError = err.response?.data?.response?.error;
    if (apiError) {
      if (apiError.includes('500건 이상')) return { data: null, error: '오늘의 도서관 조회 한도가 초과되었습니다. 내일 다시 시도해주세요.' };
      if (apiError.includes('인증정보')) return { data: null, error: '도서관 서버 인증 오류가 발생했습니다.' };
      return { data: null, error: `도서관 서버 응답: ${apiError}` };
    }

    const isTimeout = err.code === 'ECONNABORTED' || (err.message && err.message.includes('timeout'));
    return { data: null, error: isTimeout ? '도서관 서버 혼잡으로 조회가 지연되고 있습니다. 잠시 후 다시 시도해 주세요.' : '도서관 목록을 불러오지 못했습니다.' };
  }
}

export async function checkBookAvailabilityAction(isbn: string, libCode: string, owner_name: string) {
  try {
    await verifySession(owner_name, true);
    if (!getEnv('LIBRARY_API_KEY')) return { data: null, error: '도서관 API 키 누락' };
    const res = await axios.get('http://data4library.kr/api/bookExist', {
      params: { authKey: getEnv('LIBRARY_API_KEY'), libCode, isbn13: isbn, format: 'json' },
      timeout: 5000
    });
    return { data: res.data?.response?.result || { hasBook: 'N' }, error: null };
  } catch {
    return { data: null, error: '도서 대출 가능 여부 확인 실패' };
  }
}

export async function searchLibrariesByBookAction(isbn: string, region: string, dtl_region: string, owner_name: string) {
  try {
    await verifySession(owner_name, true);
    if (!getEnv('LIBRARY_API_KEY')) return { data: null, error: '도서관 API 키 누락' };

    const fetchByBook = async (r: string, dtl: string) => {
      const response = await axios.get('http://data4library.kr/api/libSrchByBook', {
        params: { authKey: getEnv('LIBRARY_API_KEY'), isbn, region: r, ...(dtl ? { dtl_region: dtl } : {}), format: 'json' },
        timeout: 5000
      });
      return response.data?.response?.libs || [];
    };

    // 1차: 지정된 세부 지역으로 조회
    let libs = await fetchByBook(region, dtl_region);

    // 2차 Fallback: 결과가 없고 '구/군' 단위 조회인 경우 '시' 단위로 상향
    if (libs.length === 0 && dtl_region && dtl_region.length === 5 && !dtl_region.endsWith('0')) {
      const cityCode = dtl_region.substring(0, 4) + '0';
      libs = await fetchByBook(region, cityCode);
    }

    // 3차 Fallback: 여전히 결과가 없으면 해당 '도' 전체 조회
    if (libs.length === 0 && dtl_region) {
      libs = await fetchByBook(region, '');
    }

    return { data: libs, error: null };
  } catch {
    return { data: null, error: '도서 소장 도서관 검색 실패' };
  }
}
