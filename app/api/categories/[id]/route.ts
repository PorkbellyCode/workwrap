import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { MAX_CONTEXT_LENGTH } from "@/lib/context";

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

  // 이름 변경과 컨텍스트 편집이 서로 다른 화면에서 따로 저장되므로
  // 두 필드 모두 선택이고, 온 것만 반영한다.
  const patch: { name?: string; context?: string | null } = {};

  if (body?.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return errorResponse("INVALID_NAME", "카테고리 이름이 비어있습니다.", 400);
    }
    patch.name = name;
  }

  if (body?.context !== undefined) {
    const context = typeof body.context === "string" ? body.context.trim() : "";
    if (context.length > MAX_CONTEXT_LENGTH) {
      return errorResponse(
        "CONTEXT_TOO_LONG",
        `컨텍스트는 ${MAX_CONTEXT_LENGTH}자까지 쓸 수 있습니다.`,
        400
      );
    }
    // 빈 문자열은 지운 것으로 본다. 프롬프트에서 줄째로 빠지려면 NULL이어야 한다.
    patch.context = context || null;
  }

  if (Object.keys(patch).length === 0) {
    return errorResponse("NOTHING_TO_UPDATE", "변경할 내용이 없습니다.", 400);
  }

  const [category] = await db
    .update(categories)
    .set(patch)
    .where(and(eq(categories.id, id), eq(categories.userId, session.user.id)))
    .returning({
      id: categories.id,
      name: categories.name,
      context: categories.context,
    });

  // 본인 소유가 아니거나 존재하지 않으면 404 (존재 유무 노출 방지, API 명세 0번 공통 사항)
  if (!category) {
    return errorResponse("NOT_FOUND", "카테고리를 찾을 수 없습니다.", 404);
  }

  return Response.json(category);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse("UNAUTHORIZED", "로그인이 필요합니다.", 401);
  }
  const userId = session.user.id;

  const { id } = await params;

  // 마지막 하나는 지울 수 없다. memo.category_id가 NOT NULL이라 카테고리가 0개면
  // 메모를 아예 쓸 수 없어지기 때문. 클라이언트에서 버튼을 비활성화하지만
  // 서버에서도 같은 규칙을 지킨다.
  const owned = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.userId, userId));

  if (!owned.some((category) => category.id === id)) {
    return errorResponse("NOT_FOUND", "카테고리를 찾을 수 없습니다.", 404);
  }

  if (owned.length <= 1) {
    return errorResponse(
      "LAST_CATEGORY",
      "마지막 카테고리는 삭제할 수 없습니다.",
      409
    );
  }

  // 이 카테고리의 메모도 함께 삭제된다 (FK ON DELETE CASCADE).
  await db
    .delete(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)));

  return new Response(null, { status: 204 });
}
