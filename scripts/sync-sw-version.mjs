/**
 * sw.js CACHE_NAME을 page.tsx의 VERSION과 자동으로 동기화하는 스크립트
 * `npm run build` 전 prebuild 훅으로 자동 실행됨
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// 1. page.tsx에서 VERSION 추출
const pageContent = readFileSync(join(root, 'src/app/page.tsx'), 'utf8');
const versionMatch = pageContent.match(/const VERSION = "경호v([\d.]+)"/);

if (!versionMatch) {
  console.error('[sw-sync] ❌ page.tsx에서 VERSION을 찾을 수 없습니다.');
  process.exit(1);
}

const version = versionMatch[1]; // e.g. "2.5.7"
const newCacheName = `book-memo-v${version}`;

// 2. sw.js에서 CACHE_NAME 교체
const swPath = join(root, 'public/sw.js');
const swContent = readFileSync(swPath, 'utf8');
const updatedContent = swContent.replace(
  /const CACHE_NAME = 'book-memo-v[\d.]+';/,
  `const CACHE_NAME = '${newCacheName}';`
);

if (swContent === updatedContent) {
  console.log(`[sw-sync] ✅ CACHE_NAME 이미 최신: ${newCacheName}`);
} else {
  writeFileSync(swPath, updatedContent, 'utf8');
  console.log(`[sw-sync] ✅ CACHE_NAME 업데이트 완료: ${newCacheName}`);
}
