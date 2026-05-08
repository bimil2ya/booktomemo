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

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) return String(error.message);
  return String(error);
}

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
    console.error('getBooksAction Error:', error);
    return { error: `[조회실패] ${getErrorMessage(error)}` };
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
    console.error('saveBookAction Error:', error);
    return { error: `[저장실패] ${getErrorMessage(error)}` };
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
    
    // 허용된 필드만 명시적으로 추출하고, 값이 있는 것만 업데이트 객체에 포함
    const cleanData: UpdateBookData = {};
    
    if (editData.title !== undefined) cleanData.title = editData.title;
    if (editData.authors !== undefined) cleanData.authors = editData.authors;
    if (editData.publisher !== undefined) cleanData.publisher = editData.publisher;
    if (editData.personal_memo !== undefined) cleanData.personal_memo = editData.personal_memo;

    const { error } = await supabase.from('books').update(cleanData).eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error: unknown) {
    console.error('updateBookAction Error:', error);
    return { error: `[수정실패] ${getErrorMessage(error)}` };
  }
}

export async function deleteBookAction(id: number) {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('books').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error: unknown) {
    console.error('deleteBookAction Error:', error);
    return { error: `[삭제실패] ${getErrorMessage(error)}` };
  }
}

export async function deleteBooksAction(ids: number[]) {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('books').delete().in('id', ids);
    if (error) throw error;
    return { success: true };
  } catch (error: unknown) {
    console.error('deleteBooksAction Error:', error);
    return { error: `[선택 삭제 실패] ${getErrorMessage(error)}` };
  }
}

/**
 * 도서관 정보나루 API - 도서관 검색
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
  } catch (error) {
    console.error('searchLibrariesAction Error:', error);
    return { error: getErrorMessage(error) };
  }
}

/**
 * 도서관 정보나루 API - 특정 도서관 소장 여부 확인
 */
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
  } catch (error) {
    console.error('checkBookAvailabilityAction Error:', error);
    return { error: getErrorMessage(error) };
  }
}

/**
 * 도서관 정보나루 API - 특정 지역 내 도서 소장 도서관 찾기
 */
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
  } catch (error) {
    console.error('searchLibrariesByBookAction Error:', error);
    return { error: getErrorMessage(error) };
  }
}
