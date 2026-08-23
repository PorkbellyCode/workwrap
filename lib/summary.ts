// 요약 생성에 쓰이는 상수와 프롬프트 조립. API 명세 4.1 기준.

// 하루 요약 생성 횟수 상한(명세 5.1의 summary.limitCount).
// 기본값은 무제한. 요약 1회 비용이 $0.001 미만이라 상시 제한을 둘 이유가 없다고 판단했다.
// 폭주(버튼 연타, 클라이언트 루프 버그)를 막아야 할 상황이 오면
// SUMMARY_DAILY_LIMIT 환경변수에 숫자를 넣고 재배포하면 즉시 상한이 걸린다.
// 빌드 타임에 값이 고정되지 않도록 상수가 아닌 함수로 노출한다.
export function summaryDailyLimit(): number | null {
  const limit = Number(process.env.SUMMARY_DAILY_LIMIT);
  return limit > 0 ? limit : null;
}

export const SUMMARY_MODEL = "gpt-5.6-luna";

const SYSTEM_PROMPT = `너는 개발자의 하루 작업 기록을 정리해주는 어시스턴트다.
사용자가 작업 중 틈틈이 남긴 짧은 메모들을 시간순으로 받게 된다.

다음 규칙을 지켜 한국어 마크다운으로 요약한다:
- 메모에 실제로 있는 내용만 쓴다. 추측하거나 지어내지 않는다.
- 같은 작업에 대한 여러 메모는 하나로 묶는다.
- "## 오늘 한 일"에 완료한 작업을, "## 진행 중/ 남은 일"에 아직 끝나지 않은 것을 정리한다.
- 막힌 지점이나 결정 사항이 있으면 "## 메모"에 덧붙인다. 없으면 이 섹션은 생략한다.
- 메모가 적으면 짧게 쓴다. 분량을 채우려 늘리지 않는다.`;

export function buildSummaryMessages(
  memoTexts: string[]
): { role: "system" | "user"; content: string }[] {
  const body = memoTexts.map((text, i) => `${i + 1}. ${text}`).join("\n");

  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `오늘 남긴 메모:\n${body}` },
  ];
}
