'use server';

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jmfgxmpgedcxyvaclci.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ifts273gFtkSiY1SZBxNWg_lnSIKD-m';

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) return String(error.message);
  return String(error);
}

export async function getBooksAction(owner_name: string, sortColumn: string, sortOrder: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  try {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .eq('owner_name', owner_name)
      .order(sortColumn, { ascending: sortOrder === 'asc' });

    if (error) throw error;
    return { data };
  } catch (error: unknown) {
    console.error('getBooksAction Error:', error);
    return { error: `[DB 조회 실패] ${getErrorMessage(error)}` };
  }
}

export async function saveBookAction(book: { isbn: string; title: string; authors: string; thumbnail: string; contents: string; publisher: string; owner_name: string }) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  try {
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
    return { error: `[저장 실패] ${getErrorMessage(error)}` };
  }
}

export async function updateBookAction(id: number, editData: Partial<{ title: string; authors: string; publisher: string; personal_memo: string }>) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  try {
    const { error } = await supabase.from('books').update(editData).eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error: unknown) {
    console.error('updateBookAction Error:', error);
    return { error: `[수정 실패] ${getErrorMessage(error)}` };
  }
}

export async function deleteBookAction(id: number) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  try {
    const { error } = await supabase.from('books').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error: unknown) {
    console.error('deleteBookAction Error:', error);
    return { error: `[삭제 실패] ${getErrorMessage(error)}` };
  }
}
