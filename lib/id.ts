/**
 * API 명세(memo_123, sum_123, usr_123 등)에 맞춘 접두사 붙은 랜덤 ID 생성.
 */
export function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}
