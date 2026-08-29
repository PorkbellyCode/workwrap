import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { MAX_CONTEXT_LENGTH } from "@/lib/context";

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

// 사용자 전역 컨텍스트. 대상이 세션 사용자 자신이라 소유권 검사가 필요 없다.
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse("UNAUTHORIZED", "로그인이 필요합니다.", 401);
  }

  const body = await request.json().catch(() => null);
  if (body?.context === undefined) {
    return errorResponse("NOTHING_TO_UPDATE", "변경할 내용이 없습니다.", 400);
  }

  const context = typeof body.context === "string" ? body.context.trim() : "";
  if (context.length > MAX_CONTEXT_LENGTH) {
    return errorResponse(
      "CONTEXT_TOO_LONG",
      `컨텍스트는 ${MAX_CONTEXT_LENGTH}자까지 쓸 수 있습니다.`,
      400
    );
  }

  // 빈 문자열은 지운 것으로 본다 — 프롬프트에서 줄째로 빠지려면 NULL이어야 한다.
  const [me] = await db
    .update(users)
    .set({ context: context || null })
    .where(eq(users.id, session.user.id))
    .returning({ context: users.context });

  return Response.json(me);
}
