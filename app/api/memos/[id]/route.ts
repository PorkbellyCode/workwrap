import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { memos } from "@/lib/db/schema";

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse("UNAUTHORIZED", "로그인이 필요합니다.", 401);
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  // text와 pinned는 각각 생략할 수 있다. 본문 수정과 고정 표시는 화면에서
  // 따로 일어나는 동작이라, 한쪽만 보낼 때 다른 쪽을 건드리지 않아야 한다.
  const changes: { text?: string; pinned?: boolean } = {};

  if (body?.text !== undefined) {
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) {
      return errorResponse("INVALID_TEXT", "메모 텍스트가 비어있습니다.", 400);
    }
    changes.text = text;
  }

  if (body?.pinned !== undefined) {
    if (typeof body.pinned !== "boolean") {
      return errorResponse("INVALID_PINNED", "pinned는 boolean이어야 합니다.", 400);
    }
    changes.pinned = body.pinned;
  }

  if (Object.keys(changes).length === 0) {
    return errorResponse("INVALID_TEXT", "메모 텍스트가 비어있습니다.", 400);
  }

  const [memo] = await db
    .update(memos)
    .set(changes)
    .where(and(eq(memos.id, id), eq(memos.userId, session.user.id)))
    .returning();

  // 본인 소유가 아니거나 존재하지 않으면 404 (존재 유무 노출 방지, API 명세 0번 공통 사항)
  if (!memo) {
    return errorResponse("NOT_FOUND", "메모를 찾을 수 없습니다.", 404);
  }

  return Response.json({
    id: memo.id,
    text: memo.text,
    audioUrl: memo.audioUrl,
    pinned: memo.pinned,
    createdAt: memo.createdAt,
  });
}

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
    .delete(memos)
    .where(and(eq(memos.id, id), eq(memos.userId, session.user.id)))
    .returning({ id: memos.id });

  if (!deleted) {
    return errorResponse("NOT_FOUND", "메모를 찾을 수 없습니다.", 404);
  }

  return new Response(null, { status: 204 });
}
