/**
 * ISBN 번호를 정규화합니다.
 * 카카오 API 등에서 제공하는 "ISBN10 ISBN13" 형식의 문자열에서 ISBN13을 우선적으로 추출하고,
 * 없을 경우 ISBN10을 반환합니다.
 */
export function normalizeIsbn(isbn: string): string {
  if (!isbn) return '';
  
  // 공백으로 구분된 ISBN 목록 중 13자리 숫자를 먼저 찾음
  const parts = isbn.trim().split(/\s+/);
  const isbn13 = parts.find(part => part.length === 13);
  if (isbn13) return isbn13;
  
  // 13자리가 없으면 10자리 숫자를 찾음
  const isbn10 = parts.find(part => part.length === 10);
  if (isbn10) return isbn10;
  
  // 그 외의 경우 첫 번째 요소를 반환 (정규화 실패 대비)
  return parts[0] || '';
}
