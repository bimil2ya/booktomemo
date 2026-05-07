'use server';

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jmfgxmpgedcxyvaclci.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ifts273gFtkSiY1SZBxNWg_lnSIKD-m';

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
    const err = error as { message?: string };
    return { error: err.message || String(error) };
  }
}

export async function saveBookAction(book: { isbn: string; title: string; authors: string; thumbnail: string; contents: string; publisher: string; owner_name: string }) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  try {
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
    const err = error as { message?: string };
    return { error: err.message || String(error) };
  }
}

export async function updateBookAction(id: number, editData: Partial<{ title: string; authors: string; publisher: string; personal_memo: string }>) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  try {
    const { error } = await supabase.from('books').update(editData).eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error: unknown) {
    const err = error as { message?: string };
    return { error: err.message || String(error) };
  }
}

export async function deleteBookAction(id: number) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  try {
    const { error } = await supabase.from('books').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error: unknown) {
    const err = error as { message?: string };
    return { error: err.message || String(error) };
  }
}
