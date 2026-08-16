import { and, asc, eq, gte, lt } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { memos } from "@/lib/db/schema";
import { dayRangeUtc, todayUtc } from "@/lib/date";

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse("UNAUTHORIZED", "로그인이 필요합니다.", 401);
  }

  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const audioUrl = typeof body?.audioUrl === "string" ? body.audioUrl : null;

  if (!text) {
    return errorResponse("INVALID_TEXT", "메모 텍스트가 비어있습니다.", 400);
  }

  const [memo] = await db
    .insert(memos)
    .values({ userId: session.user.id, text, audioUrl })
    .returning();

  return Response.json(
    {
      id: memo.id,
      text: memo.text,
      audioUrl: memo.audioUrl,
      createdAt: memo.createdAt,
    },
    { status: 201 }
  );
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse("UNAUTHORIZED", "로그인이 필요합니다.", 401);
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? todayUtc();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return errorResponse(
      "INVALID_DATE",
      "date는 YYYY-MM-DD 형식이어야 합니다.",
      400
    );
  }

  const { start, end } = dayRangeUtc(date);

  const rows = await db
    .select({
      id: memos.id,
      text: memos.text,
      audioUrl: memos.audioUrl,
      createdAt: memos.createdAt,
    })
    .from(memos)
    .where(
      and(
        eq(memos.userId, session.user.id),
        gte(memos.createdAt, start),
        lt(memos.createdAt, end)
      )
    )
    .orderBy(asc(memos.createdAt));

  return Response.json({ date, memos: rows });
}
