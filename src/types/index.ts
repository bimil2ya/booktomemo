export interface Book {
  title: string;
  authors: string[];
  thumbnail: string;
  contents: string;
  publisher: string;
  isbn: string;
}

export interface SavedBook {
  id?: number;
  created_at?: string;
  read_at?: string | null;
  isbn: string;
  title: string;
  authors: string;
  thumbnail: string;
  contents: string;
  publisher: string;
  personal_memo?: string;
  owner_name: string;
}

export interface OriginalBookInfo {
  title: string;
  authors: string[];
  isbn?: string;
  publisher?: string;
  publishedYear?: string;
  language?: string;
  source: 'Open Library' | 'Google Books' | '국립중앙도서관' | '알라딘';
  sourceUrl?: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface LibraryInfo {
  libCode: string;
  libName: string;
  address: string;
  homepage?: string;
}

export interface LibApiResponse {
  lib: LibraryInfo;
}

export type SortColumn = 'created_at' | 'title' | 'authors';
export type SortOrder = 'asc' | 'desc';

export interface AvailabilityStatus {
  status: 'loading' | 'available' | 'loaned' | 'not_found' | 'error';
  otherLibsInfo?: string;
}
