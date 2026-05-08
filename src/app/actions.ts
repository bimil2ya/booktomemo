'use server';

import { createClient } from '@supabase/supabase-js';

// 오타 수정: jmfgxmpgedcxyvaclci -> jmfgxmpgpedcxyvaclci ('p' 추가)
const SUPABASE_URL = 'https://jmfgxmpgpedcxyvaclci.supabase.co'.trim();
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptZmd4bXBncGVkY3h5dmFjbGNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwOTMxOTIsImV4cCI6MjA5MzY2OTE5Mn0.DYfK9_Ei844hRGub0xKwGQr9XjmKswYqpQDc6zKMwBg'.trim();

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

export async function updateBookAction(id: number, editData: Partial<{ title: string; authors: string; publisher: string; personal_memo: string }>) {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('books').update(editData).eq('id', id);
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
