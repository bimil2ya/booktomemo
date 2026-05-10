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
  isbn: string;
  title: string;
  authors: string;
  thumbnail: string;
  contents: string;
  publisher: string;
  personal_memo?: string;
  owner_name: string;
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

export type SortColumn = 'created_at' | 'title' | 'authors' | 'publisher';
export type SortOrder = 'asc' | 'desc';

export interface AvailabilityStatus {
  status: 'loading' | 'available' | 'loaned' | 'not_found' | 'error';
  otherLibsInfo?: string;
}
