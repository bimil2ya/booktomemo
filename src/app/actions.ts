'use server';

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// 오타 수정: jmfgxmpgedcxyvaclci -> jmfgxmpgpedcxyvaclci ('p' 추가)
const SUPABASE_URL = 'https://jmfgxmpgpedcxyvaclci.supabase.co'.trim();
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptZmd4bXBncGVkY3h5dmFjbGNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwOTMxOTIsImV4cCI6MjA5MzY2OTE5Mn0.DYfK9_Ei844hRGub0xKwGQr9XjmKswYqpQDc6zKMwBg'.trim();

const LIBRARY_API_KEY = '985f849582e606d981778d87739821f68b14a8533c5296363a38c948dc988ced';

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/**
 * 에러 메시지를 사용자 친화적으로 변환
 */
function handleSupabaseError(error: any, context: string) {
  console.error(`${context} Error:`, error);
  
  if (!error) return `[${context}] 알 수 없는 오류가 발생했습니다.`;

  // Supabase/PostgREST 에러 코드 처리
  if (error.code === 'PGRST204' || error.message?.includes('relation') && error.message?.includes('does not exist')) {
    return `[데이터베이스 설정 오류] '${error.hint || '테이블'}'이(가) 존재하지 않습니다. 관리자에게 문의하세요.`;
  }
  
  if (error.code === 'PGRST116') {
    return `[조회 오류] 데이터를 찾을 수 없습니다.`;
  }

  if (error.message === 'FetchError' || error.code === 'ECONNREFUSED') {
    return `[네트워크 오류] 서버와 연결할 수 없습니다. 인터넷 연결을 확인해 주세요.`;
  }

  const msg = error.message || String(error);
  return `[${context} 실패] ${msg}`;
}

/**
 * 서재 관련 액션 (비밀번호 보안)
 */

export async function checkLibraryExistsAction(ownerName: string) {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('libraries')
      .select('owner_name')
      .eq('owner_name', ownerName)
      .maybeSingle();

    if (error) throw error;
    return { exists: !!data };
  } catch (error: unknown) {
    return { error: handleSupabaseError(error, '서재 확인') };
  }
}

export async function createLibraryAction(ownerName: string, password: string) {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('libraries')
      .insert([{ owner_name: ownerName, password }]);

    if (error) throw error;
    return { success: true };
  } catch (error: unknown) {
    return { error: handleSupabaseError(error, '서재 생성') };
  }
}

export async function verifyLibraryPasswordAction(ownerName: string, password: string) {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('libraries')
      .select('password')
      .eq('owner_name', ownerName)
      .single();

    if (error) throw error;
    if (data.password === password) {
      return { success: true };
    } else {
      return { error: 'PASSWORD_INCORRECT' };
    }
  } catch (error: unknown) {
    return { error: handleSupabaseError(error, '인증') };
  }
}

export async function getLibraryPasswordWithMasterCodeAction(ownerName: string, masterCode: string) {
  if (masterCode !== '8633') {
    return { error: 'MASTER_CODE_INCORRECT' };
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('libraries')
      .select('password')
      .eq('owner_name', ownerName)
      .single();

    if (error) throw error;
    return { password: data.password };
  } catch (error: unknown) {
    return { error: handleSupabaseError(error, '비밀번호 조회') };
  }
}

/**
 * 도서 관련 액션
 */

export async function getBooksAction(owner_name: string, sortColumn: string, sortOrder: string) {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .eq('owner_name', owner_name)
      .order(sortColumn, { ascending: sortOrder === 'asc' });

    if (error) throw error;
    return { data };
  } catch (error: unknown) {
    return { error: handleSupabaseError(error, '도서 조회') };
  }
}

export async function saveBookAction(book: { isbn: string; title: string; authors: string; thumbnail: string; contents: string; publisher: string; owner_name: string }) {
  try {
    const supabase = getSupabase();
    // 중복 체크
    const { data: existing, error: checkError } = await supabase
      .from('books')
      .select('id')
      .eq('owner_name', book.owner_name)
      .eq('isbn', book.isbn);
    
    if (checkError) throw checkError;
    if (existing && existing.length > 0) {
      return { error: 'ALREADY_EXISTS' };
    }

    const { error } = await supabase.from('books').insert([book]);
    if (error) throw error;
    return { success: true };
  } catch (error: unknown) {
    return { error: handleSupabaseError(error, '도서 저장') };
  }
}

export interface UpdateBookData {
  title?: string;
  authors?: string;
  publisher?: string;
  personal_memo?: string;
}

export async function updateBookAction(id: number, editData: UpdateBookData) {
  try {
    const supabase = getSupabase();
    const cleanData: UpdateBookData = {};
    
    if (editData.title !== undefined) cleanData.title = editData.title;
    if (editData.authors !== undefined) cleanData.authors = editData.authors;
    if (editData.publisher !== undefined) cleanData.publisher = editData.publisher;
    if (editData.personal_memo !== undefined) cleanData.personal_memo = editData.personal_memo;

    const { error } = await supabase.from('books').update(cleanData).eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error: unknown) {
    return { error: handleSupabaseError(error, '도서 수정') };
  }
}

export async function deleteBookAction(id: number) {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('books').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error: unknown) {
    return { error: handleSupabaseError(error, '도서 삭제') };
  }
}

export async function deleteBooksAction(ids: number[]) {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('books').delete().in('id', ids);
    if (error) throw error;
    return { success: true };
  } catch (error: unknown) {
    return { error: handleSupabaseError(error, '선택 삭제') };
  }
}

/**
 * 도서관 정보나루 API 관련은 Axios를 사용하므로 별도 처리
 */
export async function searchLibrariesAction(region: string, dtl_region: string) {
  try {
    const response = await axios.get('http://data4library.kr/api/libSrch', {
      params: {
        authKey: LIBRARY_API_KEY,
        region,
        dtl_region,
        format: 'json',
        pageSize: 100
      }
    });
    return { data: response.data.response.libs || [] };
  } catch (error: any) {
    console.error('searchLibrariesAction Error:', error);
    return { error: error.message || '도서관 목록을 가져오지 못했습니다.' };
  }
}

export async function checkBookAvailabilityAction(isbn: string, libCode: string) {
  try {
    const response = await axios.get('http://data4library.kr/api/bookExist', {
      params: {
        authKey: LIBRARY_API_KEY,
        libCode,
        isbn13: isbn,
        format: 'json'
      }
    });
    return { data: response.data.response.result };
  } catch (error: any) {
    console.error('checkBookAvailabilityAction Error:', error);
    return { error: error.message || '소장 여부 확인에 실패했습니다.' };
  }
}

export async function searchLibrariesByBookAction(isbn: string, region: string, dtl_region: string) {
  try {
    const response = await axios.get('http://data4library.kr/api/libSrchByBook', {
      params: {
        authKey: LIBRARY_API_KEY,
        isbn,
        region,
        dtl_region,
        format: 'json'
      }
    });
    return { data: response.data.response.libs || [] };
  } catch (error: any) {
    console.error('searchLibrariesByBookAction Error:', error);
    return { error: error.message || '상호대차 조회를 완료하지 못했습니다.' };
  }
}
