import { and, isNotNull, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { summaries } from "@/lib/db/schema";
import { SUMMARY_PURGE_AFTER_DAYS } from "@/lib/summary";

// 소프트 삭제된 요약을 보존 기간이 지난 뒤 실제로 지운다. Vercel Cron이 하루 한 번 호출한다(vercel.json).
//
// quota 집계는 "오늘 만들어진 행"만 보므로, 보존 기간이 하루보다 길기만 하면
// 여기서 지운 행이 상한 계산에 영향을 주지 않는다. 두 기능이 구조적으로 안 부딪힌다.
//
// 이 파일의 시각 계산에는 KST 변환이 없다. lib/date.ts의 원칙이 적용되는 건 "사용자가 말하는 하루"이고,
// 여기서 재는 건 달력상의 날짜가 아니라 삭제 시점부터 흐른 절대 시간이라 타임존이 개입할 여지가 없다.
export async function GET(request: Request) {
  // Vercel은 CRON_SECRET 환경변수 값을 Authorization: Bearer 헤더에 실어 보낸다.
  // 이 라우트에는 로그인 세션이 없으므로 이 검사가 유일한 접근 통제다.
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const cutoff = new Date(
    Date.now() - SUMMARY_PURGE_AFTER_DAYS * 24 * 60 * 60 * 1000
  );

  const purged = await db
    .delete(summaries)
    .where(and(isNotNull(summaries.deletedAt), lt(summaries.deletedAt, cutoff)))
    .returning({ id: summaries.id });

  // Vercel의 cron 전달은 best effort라 누락도 중복 호출도 생길 수 있다.
  // 이 작업은 조건에 걸리는 행을 지우기만 하므로 두 경우 모두 그대로 안전하다
  // (중복 호출: 이미 지운 행은 조건에 안 걸림 / 누락: 다음 날 실행이 밀린 분까지 함께 처리).
  return Response.json({ purged: purged.length, cutoff: cutoff.toISOString() });
}
