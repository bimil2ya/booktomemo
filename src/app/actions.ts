'use server';

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { cookies } from 'next/headers';

import { normalizeIsbn } from '@/utils/isbn';
import type { OriginalBookInfo } from '@/types';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(url, key);
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
  return '[' + context + ' 실패] ' + (err.message || String(err));
}

function containsKorean(text: string) {
  return /[가-힣]/.test(text);
}

function parseOriginalFromContents(contents: string, isbn?: string): OriginalBookInfo | null {
  const patterns = [
    /원제\s*[:：]\s*([^\n\r,.(]+)/,
    /원서명\s*[:：]\s*([^\n\r,.(]+)/,
    /\(원제\s*[:：]?\s*([^)]+)\)/,
    /Original Title\s*[:：]\s*([^\n\r,.(]+)/i,
  ];
  for (const pattern of patterns) {
    const match = contents?.match(pattern);
    if (match) {
      const title = match[1].trim();
      if (title && !containsKorean(title)) {
        return { title, authors: [], isbn, source: '국립중앙도서관', confidence: 'high', language: 'en' };
      }
    }
  }
  return null;
}

async function searchNationalLibrary(title: string, isbn?: string): Promise<OriginalBookInfo[]> {
  const apiKey = process.env.NL_LIBRARY_API_KEY;
  if (!apiKey) return [];
  try {
    const params: Record<string, string> = {
      key: apiKey,
      resultStyle: 'json',
      pageNum: '1',
      pageSize: '5',
    };
    if (isbn) params.isbn13 = isbn;
    else params.title = title;

    const res = await axios.get('https://seoji.nl.go.kr/landingPage/SearchApi.do', {
      params,
      timeout: 5000,
    });

    const docs: Record<string, string>[] = res.data?.docs || [];
    const results: OriginalBookInfo[] = [];

    for (const doc of docs) {
      const originalTitle = doc.EA_TITLE || doc.ORIGINAL_TITLE || doc.TITLE_ROMAN;
      if (originalTitle && !containsKorean(originalTitle)) {
        results.push({
          title: originalTitle.trim(),
          authors: doc.AUTHOR ? [doc.AUTHOR] : [],
          isbn: doc.EA_ISBN,
          publisher: doc.PUBLISHER,
          publishedYear: doc.PUBLISH_PREDATE?.slice(0, 4),
          language: 'en',
          source: '국립중앙도서관',
          sourceUrl: doc.EA_ISBN ? `https://seoji.nl.go.kr/landingPage?isbn=${doc.EA_ISBN}` : undefined,
          confidence: 'high',
        });
      }
    }
    return results;
  } catch {
    return [];
  }
}

async function searchAladin(title: string, isbn?: string): Promise<OriginalBookInfo[]> {
  const apiKey = process.env.ALADIN_TTB_KEY;
  if (!apiKey) return [];
  try {
    let item: Record<string, string> | null = null;

    if (isbn) {
      const res = await axios.get('https://www.aladin.co.kr/ttb/api/ItemLookUp.aspx', {
        params: { ttbkey: apiKey, itemIdType: 'ISBN13', ItemId: isbn, output: 'js', Version: '20131101' },
        timeout: 5000,
      });
      item = res.data?.item?.[0] ?? null;
    }

    if (!item) {
      const res = await axios.get('https://www.aladin.co.kr/ttb/api/ItemSearch.aspx', {
        params: { ttbkey: apiKey, Query: title, QueryType: 'Title', SearchTarget: 'Book', output: 'js', Version: '20131101', MaxResults: 3 },
        timeout: 5000,
      });
      const items: Record<string, string>[] = res.data?.item || [];
      item = items.find(i => i.originalTitle && !containsKorean(i.originalTitle)) ?? items[0] ?? null;
    }

    if (!item?.originalTitle || containsKorean(item.originalTitle)) return [];

    return [{
      title: item.originalTitle.trim(),
      authors: item.originalAuthor ? [item.originalAuthor.trim()] : [],
      isbn: item.isbn13,
      publisher: item.publisher,
      publishedYear: item.pubDate?.slice(0, 4),
      language: 'en',
      source: '알라딘',
      sourceUrl: item.link,
      confidence: 'high',
    }];
  } catch {
    return [];
  }
}

function getFirstYear(value: unknown) {
  if (typeof value === 'number') return String(value);
  if (typeof value !== 'string') return undefined;
  const match = value.match(/\b(1[5-9]\d{2}|20\d{2})\b/);
  return match?.[0];
}

function buildOpenLibraryUrl(key?: string, isbn?: string, title?: string) {
  if (key) return `https://openlibrary.org${key}`;
  if (isbn) return `https://openlibrary.org/isbn/${encodeURIComponent(isbn)}`;
  if (title) return `https://openlibrary.org/search?q=${encodeURIComponent(title)}`;
  return undefined;
}

function dedupeOriginals(items: OriginalBookInfo[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.title.toLowerCase()}|${item.authors.join(',').toLowerCase()}|${item.isbn || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function scoreOriginalCandidate(item: OriginalBookInfo, translatedTitle: string, translatedAuthors: string[]) {
  let score = item.confidence === 'high' ? 80 : item.confidence === 'medium' ? 50 : 25;
  if (item.source === '알라딘' || item.source === '국립중앙도서관') score += 25;
  if (item.language === 'en') score += 20;
  if (!containsKorean(item.title)) score += 15;
  if (item.isbn) score += 8;
  const authorText = item.authors.join(' ').toLowerCase();
  translatedAuthors.forEach((author) => {
    const clean = author.split(/[(\[]/)[0].trim().toLowerCase();
    if (clean && authorText.includes(clean)) score += 12;
  });
  if (item.title.trim() === translatedTitle.trim()) score -= 30;
  return score;
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
    if (masterCode !== (process.env.ADMIN_MASTER_CODE || '8633')) return { password: null, error: 'MASTER_CODE_INCORRECT' };
    const { data, error } = await getSupabase().from('libraries').select('password').eq('owner_name', ownerName).single();
    if (error) throw error;
    return { password: data.password, error: null };
  } catch (e) {
    return { password: null, error: handleSupabaseError(e, '비밀번호 조회') };
  }
}

export async function searchBooksAction(query: string, owner_name: string, page: number = 1, size: number = 20, target?: 'title' | 'isbn' | 'publisher' | 'person') {
  try {
    await verifySession(owner_name, true);
    if (!process.env.KAKAO_REST_API_KEY) return { data: null, error: '도서 검색 API 키가 누락되었습니다.' };
    const res = await axios.get('https://dapi.kakao.com/v3/search/book', {
      params: { query, page, size, ...(target ? { target } : {}) },
      headers: { Authorization: 'KakaoAK ' + process.env.KAKAO_REST_API_KEY },
      timeout: 5000
    });
    return { data: res.data.documents || [], meta: res.data.meta, error: null };
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err.code === 'ECONNABORTED') return { data: null, error: '도서 검색 시간이 초과되었습니다. 다시 시도해 주세요.' };
    return { data: null, error: '도서 검색 중 오류가 발생했습니다.' };
  }
}

interface OpenLibraryEdition {
  key?: string;
  title?: string;
  author_name?: string[];
  isbn?: string[];
  language?: string[];
  publisher?: string[];
  publish_year?: number[];
}

interface OpenLibraryDoc {
  key?: string;
  title?: string;
  author_name?: string[];
  isbn?: string[];
  language?: string[];
  publisher?: string[];
  first_publish_year?: number;
  editions?: {
    docs?: OpenLibraryEdition[];
  };
}

interface GoogleBooksVolume {
  id?: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    language?: string;
    infoLink?: string;
    industryIdentifiers?: { type?: string; identifier?: string }[];
  };
}

function openLibraryDocToOriginal(doc: OpenLibraryDoc, confidence: OriginalBookInfo['confidence']): OriginalBookInfo | null {
  if (!doc.title) return null;
  const isbn = doc.isbn?.find(code => code.length === 13) || doc.isbn?.[0];
  return {
    title: doc.title,
    authors: doc.author_name || [],
    isbn,
    publisher: doc.publisher?.[0],
    publishedYear: getFirstYear(doc.first_publish_year),
    language: doc.language?.[0],
    source: 'Open Library',
    sourceUrl: buildOpenLibraryUrl(doc.key, isbn, doc.title),
    confidence
  };
}

function openLibraryEditionToOriginal(edition: OpenLibraryEdition, confidence: OriginalBookInfo['confidence']): OriginalBookInfo | null {
  if (!edition.title) return null;
  const isbn = edition.isbn?.find(code => code.length === 13) || edition.isbn?.[0];
  return {
    title: edition.title,
    authors: edition.author_name || [],
    isbn,
    publisher: edition.publisher?.[0],
    publishedYear: getFirstYear(edition.publish_year?.[0]),
    language: edition.language?.[0],
    source: 'Open Library',
    sourceUrl: buildOpenLibraryUrl(edition.key, isbn, edition.title),
    confidence
  };
}

function googleVolumeToOriginal(volume: GoogleBooksVolume, confidence: OriginalBookInfo['confidence']): OriginalBookInfo | null {
  const info = volume.volumeInfo;
  if (!info?.title) return null;
  const isbn13 = info.industryIdentifiers?.find(item => item.type === 'ISBN_13')?.identifier;
  const isbn10 = info.industryIdentifiers?.find(item => item.type === 'ISBN_10')?.identifier;
  return {
    title: info.title,
    authors: info.authors || [],
    isbn: isbn13 || isbn10,
    publisher: info.publisher,
    publishedYear: getFirstYear(info.publishedDate),
    language: info.language,
    source: 'Google Books',
    sourceUrl: info.infoLink || (volume.id ? `https://books.google.com/books?id=${encodeURIComponent(volume.id)}` : undefined),
    confidence
  };
}

export async function findOriginalBookAction(book: { title: string; authors: string[] | string; isbn?: string; contents?: string; owner_name: string }) {
  try {
    await verifySession(book.owner_name, true);

    const title = book.title.trim();
    const authors = Array.isArray(book.authors)
      ? book.authors.map(author => author.trim()).filter(Boolean)
      : book.authors.split(',').map(author => author.trim()).filter(Boolean);
    const normalizedIsbn = normalizeIsbn(book.isbn || '');
    const candidates: OriginalBookInfo[] = [];

    // 1. contents 필드 원제 패턴 파싱 (무비용)
    if (book.contents) {
      const fromContents = parseOriginalFromContents(book.contents, normalizedIsbn || undefined);
      if (fromContents) candidates.push(fromContents);
    }

    // 2. 알라딘 + 국립중앙도서관 병렬 호출
    const [aladinResults, nlResults] = await Promise.all([
      searchAladin(title, normalizedIsbn || undefined),
      searchNationalLibrary(title, normalizedIsbn || undefined),
    ]);
    candidates.push(...aladinResults, ...nlResults);

    // 3. Open Library — ISBN 검색
    if (normalizedIsbn) {
      const isbnRes = await axios.get('https://openlibrary.org/search.json', {
        params: {
          isbn: normalizedIsbn,
          fields: 'key,title,author_name,isbn,language,publisher,first_publish_year,editions,editions.key,editions.title,editions.author_name,editions.isbn,editions.language,editions.publisher,editions.publish_year',
          limit: 3
        },
        timeout: 5000
      });

      const docs = (isbnRes.data?.docs || []) as OpenLibraryDoc[];
      docs.forEach(doc => {
        doc.editions?.docs
          ?.filter(edition => edition.language?.includes('eng') || edition.language?.includes('en'))
          .forEach(edition => {
            const item = openLibraryEditionToOriginal(edition, 'high');
            if (item) candidates.push({ ...item, language: 'en' });
          });

        const item = openLibraryDocToOriginal(doc, containsKorean(doc.title || '') ? 'low' : 'medium');
        if (item && (item.language === 'eng' || item.language === 'en' || !containsKorean(item.title))) {
          candidates.push({ ...item, language: item.language === 'eng' ? 'en' : item.language });
        }
      });
    }

    // 4. Open Library + Google Books — 텍스트 검색 (제목/저자 조합)
    const primaryAuthor = authors[0]?.split(/[(\[]/)[0].trim();
    const textQueries = Array.from(new Set([
      primaryAuthor ? `${title} ${primaryAuthor}` : title,
      primaryAuthor || title,
    ]));

    for (const query of textQueries) {
      const baseConfidence: OriginalBookInfo['confidence'] = query === primaryAuthor ? 'low' : 'medium';
      const [openLibraryRes, googleRes] = await Promise.allSettled([
        axios.get('https://openlibrary.org/search.json', {
          params: {
            q: query,
            language: 'eng',
            fields: 'key,title,author_name,isbn,language,publisher,first_publish_year',
            limit: 5
          },
          timeout: 5000
        }),
        axios.get('https://www.googleapis.com/books/v1/volumes', {
          params: {
            q: query,
            langRestrict: 'en',
            maxResults: 5,
            printType: 'books'
          },
          timeout: 5000
        })
      ]);

      if (openLibraryRes.status === 'fulfilled') {
        ((openLibraryRes.value.data?.docs || []) as OpenLibraryDoc[])
          .map(doc => openLibraryDocToOriginal(doc, baseConfidence))
          .filter((item): item is OriginalBookInfo => !!item)
          .filter(item => !containsKorean(item.title))
          .forEach(item => candidates.push({ ...item, language: item.language === 'eng' ? 'en' : item.language }));
      }

      if (googleRes.status === 'fulfilled') {
        ((googleRes.value.data?.items || []) as GoogleBooksVolume[])
          .map(volume => googleVolumeToOriginal(volume, baseConfidence))
          .filter((item): item is OriginalBookInfo => !!item)
          .filter(item => item.language === 'en' && !containsKorean(item.title))
          .forEach(item => candidates.push(item));
      }
    }

    const ranked = dedupeOriginals(candidates)
      .sort((a, b) => scoreOriginalCandidate(b, title, authors) - scoreOriginalCandidate(a, title, authors))
      .slice(0, 3);

    return { data: ranked, error: null };
  } catch (error: unknown) {
    console.error('Original Book Search Error:', error);
    return { data: null, error: '원서 정보를 찾지 못했습니다. 잠시 후 다시 시도해 주세요.' };
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
    const normalizedIsbn = normalizeIsbn(book.isbn);
    const { data, error: checkError } = await getSupabase().from('books').select('id').eq('owner_name', book.owner_name).eq('isbn', normalizedIsbn).maybeSingle();
    if (checkError) throw checkError;
    if (data) return { success: false, error: 'ALREADY_EXISTS' };
    const { error } = await getSupabase().from('books').insert([{ ...book, isbn: normalizedIsbn }]);
    if (error) throw error;
    return { success: true, error: null };
  } catch (e) {
    return { success: false, error: handleSupabaseError(e, '도서 저장') };
  }
}

export async function markBookAsReadAction(id: number, isRead: boolean, owner_name: string, readAt?: string | null) {
  try {
    await verifySession(owner_name);
    // 호출 측에서 타임스탬프를 넘기면 그것을 사용 (일관성 보장)
    const updateData = isRead ? { read_at: readAt ?? new Date().toISOString() } : { read_at: null };
    const { error } = await getSupabase().from('books').update(updateData).eq('id', id).eq('owner_name', owner_name);
    if (error) throw error;
    return { success: true, error: null };
  } catch (e) {
    return { success: false, error: handleSupabaseError(e, '읽음 상태 변경') };
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
    if (!process.env.LIBRARY_API_KEY) return { data: null, error: '도서관 API 키가 누락되었습니다.' };

    const fetchLibs = async (r: string, dtl: string) => {
      const response = await axios.get('http://data4library.kr/api/libSrch', {
        params: { authKey: process.env.LIBRARY_API_KEY, format: 'json', pageSize: 100, region: r, ...(dtl ? { dtl_region: dtl } : {}) },
        timeout: 5000
      });
      const errorMsg = response.data?.response?.error;
      if (errorMsg) throw { response: { data: response.data } }; // catch 블록에서 처리되도록 유도
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

export async function checkBookAvailabilityAction(isbn: string, libCode: string, owner_name: string, title?: string) {
  try {
    await verifySession(owner_name, true);
    if (!process.env.LIBRARY_API_KEY) return { data: null, error: '도서관 API 키 누락' };
    
    const normalizedIsbn = normalizeIsbn(isbn);
    
    // 1차: ISBN 기반 확인 (가장 정확)
    const res = await axios.get('http://data4library.kr/api/bookExist', {
      params: { authKey: process.env.LIBRARY_API_KEY, libCode, isbn13: normalizedIsbn, format: 'json' },
      timeout: 5000
    });
    
    let result = res.data?.response?.result;
    
    // 2차: ISBN 결과가 'N'이고 도서명이 제공된 경우 제목 기반으로 해당 도서관 내 검색 시도 (업데이트 지연 대비)
    if ((!result || result.hasBook === 'N') && title) {
      // 검색어 정규화: 특수문자(:, (, [ 등) 이후의 부제 제거 및 순수 제목만 추출
      const cleanTitle = title.split(/[:(\[]/)[0].trim();
      
      const searchRes = await axios.get('http://data4library.kr/api/srchBooks', {
        params: { 
          authKey: process.env.LIBRARY_API_KEY, 
          libCode, 
          title: cleanTitle, 
          exactMatch: 'true',
          format: 'json',
          pageSize: 1
        },
        timeout: 5000
      });
      
      const foundBook = searchRes.data?.response?.docs?.[0]?.doc;
      if (foundBook) {
        // 검색된 책이 있다면 소장 중인 것으로 판단
        result = { 
          hasBook: 'Y', 
          loanAvailable: foundBook.loanAvailable === 'N' ? 'N' : 'Y' 
        };
      }
    }

    return { data: result || { hasBook: 'N' }, error: null };
  } catch (error: unknown) {
    console.error('Availability Check Error:', error);
    
    let errorMsg = '도서관 정보를 불러오지 못했습니다.';
    
    if (axios.isAxiosError(error)) {
      const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
      const isQuotaError = error.response?.data?.response?.error?.includes('500건 이상');
      
      if (isTimeout) errorMsg = '도서관 서버 응답이 지연되고 있습니다. (타임아웃)';
      if (isQuotaError) errorMsg = '도서관 API 조회 한도가 초과되었습니다.';
    }
    
    return { data: null, error: errorMsg };
  }
}

export async function searchLibrariesByBookAction(isbn: string, region: string, dtl_region: string, owner_name: string) {
  try {
    await verifySession(owner_name, true);
    if (!process.env.LIBRARY_API_KEY) return { data: null, error: '도서관 API 키 누락' };

    const normalizedIsbn = normalizeIsbn(isbn);

    const fetchByBook = async (r: string, dtl: string) => {
      const response = await axios.get('http://data4library.kr/api/libSrchByBook', {
        params: { authKey: process.env.LIBRARY_API_KEY, isbn: normalizedIsbn, region: r, ...(dtl ? { dtl_region: dtl } : {}), format: 'json' },
        timeout: 5000
      });
      const errorMsg = response.data?.response?.error;
      if (errorMsg) throw { response: { data: response.data } };
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
