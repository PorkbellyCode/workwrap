import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { summaries } from "@/lib/db/schema";

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

// 요약 버전 삭제는 소프트 삭제다(행을 남기는 이유는 schema.ts의 deletedAt 주석 참조).
// 보존 기간이 지난 행은 /api/cron/purge-summaries가 일괄 정리한다.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse("UNAUTHORIZED", "로그인이 필요합니다.", 401);
  }

  const { id } = await params;

  const [deleted] = await db
    .update(summaries)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(summaries.id, id),
        eq(summaries.userId, session.user.id),
        // 이미 지운 행을 또 지우면 deletedAt이 갱신돼 보존 기간이 뒤로 밀린다.
        isNull(summaries.deletedAt)
      )
    )
    .returning({ id: summaries.id });

  // 본인 소유가 아니거나 존재하지 않으면 404 (존재 유무 노출 방지, API 명세 0번 공통 사항)
  if (!deleted) {
    return errorResponse("NOT_FOUND", "요약을 찾을 수 없습니다.", 404);
  }

  return new Response(null, { status: 204 });
}
