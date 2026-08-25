// 클라이언트 컴포넌트(카테고리 탭·관리 팝업)도 이 상수를 쓰므로
// 이 파일에는 DB 관련 import를 두지 않는다. 쿼리는 lib/db/categories.ts에 있다.

// 카테고리는 모바일에서 탭 바가 넘치지 않도록 사용자당 최대 3개로 제한한다.
// 하한도 있다 — 승인 시 'Work'가 자동 생성되고 마지막 하나는 삭제할 수 없어
// 개수는 항상 1~3 사이로 유지된다. 덕분에 카테고리가 0개인 화면을 만들 필요가 없다.
export const MAX_CATEGORIES = 3;

export const DEFAULT_CATEGORY_NAME = "Work";
