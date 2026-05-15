export function normalizeName(name: string): string {
  return name.replace(/\s*의\s*서재\s*$/, '').replace(/\s*의서재\s*$/, '').trim();
}
