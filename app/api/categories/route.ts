import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { MAX_CATEGORIES } from "@/lib/category";
import { listCategories } from "@/lib/db/categories";

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse("UNAUTHORIZED", "로그인이 필요합니다.", 401);
  }

  return Response.json({ categories: await listCategories(session.user.id) });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse("UNAUTHORIZED", "로그인이 필요합니다.", 401);
  }
  const userId = session.user.id;

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!name) {
    return errorResponse("INVALID_NAME", "카테고리 이름이 비어있습니다.", 400);
  }

  const existing = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.userId, userId));

  if (existing.length >= MAX_CATEGORIES) {
    return errorResponse(
      "CATEGORY_LIMIT",
      `카테고리는 최대 ${MAX_CATEGORIES}개까지 만들 수 있습니다.`,
      409
    );
  }

  const [category] = await db
    .insert(categories)
    .values({ userId, name })
    .returning({ id: categories.id, name: categories.name });

  return Response.json({ ...category, memoCount: 0 }, { status: 201 });
}
