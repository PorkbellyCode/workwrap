// 서버 타임존(UTC) 기준 날짜 계산. API 명세 2.3의 "date 생략 시 오늘" 및
// "해당 날짜(서버 타임존 기준 하루)" 조회에 쓰인다.

export function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

// date(YYYY-MM-DD) 하루의 [start, end) 범위.
export function dayRangeUtc(dateStr: string) {
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}
