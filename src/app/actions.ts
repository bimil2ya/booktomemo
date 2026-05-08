'use server';

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jmfgxmpgedcxyvaclci.supabase.co'.trim();
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptZmd4bXBncGVkY3h5dmFjbGNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwOTMxOTIsImV4cCI6MjA5MzY2OTE5Mn0.DYfK9_Ei844hRGub0xKwGQr9XjmKswYqpQDc6zKMwBg'.trim();

// Supabase 클라이언트 생성 함수 (강력한 옵션 적용)
function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: {
      fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }),
    },
  });
}

async function diagnoseNetwork() {
  const report: string[] = [];
  
  // 1. 외부망 확인 (Google)
  try {
    const res = await fetch('https://www.google.com', { method: 'HEAD', cache: 'no-store' });
    report.push(`[외부망] 성공(${res.status})`);
  } catch (e) {
    report.push(`[외부망] 실패: ${String(e)}`);
  }

  // 2. Supabase 서버 직접 응답 확인
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/books?select=count`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      cache: 'no-store'
    });
    report.push(`[직접연결] 성공(${res.status})`);
  } catch (e) {
    report.push(`[직접연결] 실패: ${String(e)}`);
  }

  return report.join(' | ');
}

function stringifyError(error: unknown) {
  try {
    return JSON.stringify(error, Object.getOwnPropertyNames(error));
  } catch {
    return String(error);
  }
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
    const diag = await diagnoseNetwork();
    return { error: `[조회실패] ${diag}\n상세: ${stringifyError(error)}` };
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
    const diag = await diagnoseNetwork();
    return { error: `[저장실패] ${diag}\n상세: ${stringifyError(error)}` };
  }
}

export async function updateBookAction(id: number, editData: Partial<{ title: string; authors: string; publisher: string; personal_memo: string }>) {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('books').update(editData).eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error: unknown) {
    const diag = await diagnoseNetwork();
    return { error: `[수정실패] ${diag}\n상세: ${stringifyError(error)}` };
  }
}

export async function deleteBookAction(id: number) {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('books').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error: unknown) {
    const diag = await diagnoseNetwork();
    return { error: `[삭제실패] ${diag}\n상세: ${stringifyError(error)}` };
  }
}
