// 요약 프롬프트에 붙는 컨텍스트(사용자 전역 / 카테고리별)의 길이 상한.
// 클라이언트(글자 수 카운터)와 서버(검증)가 함께 쓰므로 DB import가 없는 파일에 둔다 —
// lib/summary.ts는 프롬프트 조립용이라 서버 전용이고, 거기 두면 클라이언트 번들에
// 딸려 들어간다(lib/category.ts를 쪼갰던 것과 같은 이유).
export const MAX_CONTEXT_LENGTH = 1000;
