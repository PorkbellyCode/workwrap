import { and, asc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { categories, memos } from "@/lib/db/schema";
import { todaySeoul } from "@/lib/date";

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse("UNAUTHORIZED", "로그인이 필요합니다.", 401);
  }
  const userId = session.user.id;

  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const audioUrl = typeof body?.audioUrl === "string" ? body.audioUrl : null;
  const categoryId = typeof body?.categoryId === "string" ? body.categoryId : "";
  // 클라이언트가 화면에서 선택 중인 날짜를 보낸다. 서버가 '오늘'을 계산하지 않으므로
  // 서버 타임존과 무관하고, 과거 날짜에 메모를 채워 넣는 것도 같은 경로로 처리된다.
  const logDate = typeof body?.logDate === "string" ? body.logDate : "";

  if (!text) {
    return errorResponse("INVALID_TEXT", "메모 텍스트가 비어있습니다.", 400);
  }

  if (!DATE_PATTERN.test(logDate)) {
    return errorResponse(
      "INVALID_DATE",
      "logDate는 YYYY-MM-DD 형식이어야 합니다.",
      400
    );
  }

  // 남의 카테고리에 메모를 넣지 못하게 소유권을 확인한다.
  const [category] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
    .limit(1);

  if (!category) {
    return errorResponse("INVALID_CATEGORY", "카테고리를 찾을 수 없습니다.", 400);
  }

  const [memo] = await db
    .insert(memos)
    .values({ userId, categoryId, logDate, text, audioUrl })
    .returning();

  return Response.json(
    {
      id: memo.id,
      categoryId: memo.categoryId,
      logDate: memo.logDate,
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
  const date = searchParams.get("date") ?? todaySeoul();
  // 생략하면 그날의 모든 카테고리('전체' 탭).
  const categoryId = searchParams.get("category");

  if (!DATE_PATTERN.test(date)) {
    return errorResponse(
      "INVALID_DATE",
      "date는 YYYY-MM-DD 형식이어야 합니다.",
      400
    );
  }

  const rows = await db
    .select({
      id: memos.id,
      categoryId: memos.categoryId,
      logDate: memos.logDate,
      text: memos.text,
      audioUrl: memos.audioUrl,
      createdAt: memos.createdAt,
    })
    .from(memos)
    .where(
      and(
        eq(memos.userId, session.user.id),
        eq(memos.logDate, date),
        categoryId ? eq(memos.categoryId, categoryId) : undefined
      )
    )
    // 과거 날짜에 나중에 채워 넣은 메모는 created_at이 실제 시각이라 목록 맨 끝에 붙는다.
    .orderBy(asc(memos.createdAt));

  return Response.json({ date, memos: rows });
}
