// 날짜 버킷은 memo.log_date(순수 DATE 컬럼)로 관리한다. 사용자가 캘린더에서 고른 날짜가
// 그대로 저장되므로 타임라인 조회 쿼리에는 타임존 변환이 아예 개입하지 않는다.
//
// 여기 남은 Asia/Seoul 하드코딩은 두 곳에만 쓰인다.
// 1) 클라이언트가 날짜를 지정하지 않았을 때 서버가 정하는 "오늘"
// 2) created_at 기준 운영·비용 집계(요약 quota, 관리자 통계)의 하루 경계
// 서버(Vercel 서버리스)는 UTC로 동작하므로 그냥 new Date()의 날짜를 쓰면
// KST 00:00~09:00 구간에서 하루가 밀린다.

const TIME_ZONE = "Asia/Seoul";

// en-CA 로케일이 YYYY-MM-DD 형식을 준다.
export function todaySeoul() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(
    new Date()
  );
}

// KST 하루의 [start, end) 를 UTC 시각으로. created_at 기준 집계에 쓴다.
// 한국은 서머타임이 없어 오프셋이 항상 +09:00으로 고정이다.
export function dayRangeSeoul(dateStr: string) {
  const start = new Date(`${dateStr}T00:00:00.000+09:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}
