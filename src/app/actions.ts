'use server';

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { cookies } from 'next/headers';
import Anthropic from '@anthropic-ai/sdk';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const LIBRARY_API_KEY = process.env.LIBRARY_API_KEY || '';
const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY || '';
const ADMIN_MASTER_CODE = process.env.ADMIN_MASTER_CODE || '8633';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

const anthropic = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
});

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

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
  if (err.code === 'PGRST204') return '[DB 설정 오류] 테이블이 존재하지 않습니다.';
  return '[' + context + ' 실패] ' + (err.message || String(err));
}

export async function analyzeImageAction(base64Image: string, contentType: string, owner_name: string) {
  try {
    await verifySession(owner_name);
    if (!ANTHROPIC_API_KEY) return { data: null, error: 'API 키 누락' };
    const response = await anthropic.messages.create({
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
    return { data: null, error: '텍스트 추출 실패' };
  } catch (e: unknown) {
    return { data: null, error: (e as Error).message };
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
    return { exists: false, error: handleSupabaseError(e, '확인') };
  }
}

export async function createLibraryAction(ownerName: string, password: string) {
  try {
    const { error } = await getSupabase().from('libraries').insert([{ owner_name: ownerName, password }]);
    if (error) throw error;
    return { success: true, error: null };
  } catch (e) {
    return { success: false, error: handleSupabaseError(e, '생성') };
  }
}

export async function verifyLibraryPasswordAction(ownerName: string, password: string) {
  try {
    const { data, error } = await getSupabase().from('libraries').select('password').eq('owner_name', ownerName).single();
    if (error) throw error;
    return data.password === password ? { success: true, error: null } : { success: false, error: 'PASSWORD_INCORRECT' };
  } catch (e) {
    return { success: false, error: handleSupabaseError(e, '인증') };
  }
}

export async function getLibraryPasswordWithMasterCodeAction(ownerName: string, masterCode: string) {
  try {
    if (masterCode !== ADMIN_MASTER_CODE) return { password: null, error: 'MASTER_CODE_INCORRECT' };
    const { data, error } = await getSupabase().from('libraries').select('password').eq('owner_name', ownerName).single();
    if (error) throw error;
    return { password: data.password, error: null };
  } catch (e) {
    return { password: null, error: handleSupabaseError(e, '조회') };
  }
}

export async function searchBooksAction(query: string, owner_name: string, page: number = 1, size: number = 20) {
  try {
    await verifySession(owner_name, true);
    if (!KAKAO_REST_API_KEY) return { data: null, error: 'API 키 누락' };
    const res = await axios.get('https://dapi.kakao.com/v3/search/book', {
      params: { query, page, size },
      headers: { Authorization: 'KakaoAK ' + KAKAO_REST_API_KEY },
      timeout: 5000
    });
    return { data: res.data.documents || [], meta: res.data.meta, error: null };
  } catch (e: unknown) {
    return { data: null, error: (e as Error).message || '검색 실패' };
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
    return { data: null, error: handleSupabaseError(e, '조회') };
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
    return { success: false, error: handleSupabaseError(e, '저장') };
  }
}

export async function updateBookAction(id: number, editData: { title?: string; authors?: string; publisher?: string; personal_memo?: string }, owner_name: string) {
  try {
    await verifySession(owner_name);
    const { error } = await getSupabase().from('books').update(editData).eq('id', id).eq('owner_name', owner_name);
    if (error) throw error;
    return { success: true, error: null };
  } catch (e) {
    return { success: false, error: handleSupabaseError(e, '수정') };
  }
}

export async function deleteBookAction(id: number, owner_name: string) {
  try {
    await verifySession(owner_name);
    const { error } = await getSupabase().from('books').delete().eq('id', id).eq('owner_name', owner_name);
    if (error) throw error;
    return { success: true, error: null };
  } catch (e) {
    return { success: false, error: handleSupabaseError(e, '삭제') };
  }
}

export async function deleteBooksAction(ids: number[], owner_name: string) {
  try {
    await verifySession(owner_name);
    const { error } = await getSupabase().from('books').delete().in('id', ids).eq('owner_name', owner_name);
    if (error) throw error;
    return { success: true, error: null };
  } catch (e) {
    return { success: false, error: handleSupabaseError(e, '선택삭제') };
  }
}

export async function searchLibrariesAction(region: string, dtl_region: string, owner_name: string) {
  try {
    await verifySession(owner_name, true);
    if (!LIBRARY_API_KEY) return { data: null, error: 'API 키 누락' };
    const res = await axios.get('http://data4library.kr/api/libSrch', {
      params: { authKey: LIBRARY_API_KEY, format: 'json', pageSize: 100, region, ...(dtl_region ? { dtl_region } : {}) },
      timeout: 5000
    });
    return { data: res.data?.response?.libs || [], error: null };
  } catch {
    return { data: null, error: '조회 실패' };
  }
}

export async function checkBookAvailabilityAction(isbn: string, libCode: string, owner_name: string) {
  try {
    await verifySession(owner_name, true);
    const res = await axios.get('http://data4library.kr/api/bookExist', {
      params: { authKey: LIBRARY_API_KEY, libCode, isbn13: isbn, format: 'json' },
      timeout: 5000
    });
    return { data: res.data?.response?.result || { hasBook: 'N' }, error: null };
  } catch {
    return { data: null, error: '실패' };
  }
}

export async function searchLibrariesByBookAction(isbn: string, region: string, dtl_region: string, owner_name: string) {
  try {
    await verifySession(owner_name, true);
    const res = await axios.get('http://data4library.kr/api/libSrchByBook', {
      params: { authKey: LIBRARY_API_KEY, isbn, region, dtl_region, format: 'json' },
      timeout: 5000
    });
    return { data: res.data?.response?.libs || [], error: null };
  } catch {
    return { data: null, error: '실패' };
  }
}