import OpenAI from "openai";
import { and, asc, desc, eq, gte, inArray, isNull, lt, lte } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { categories, memos, summaries } from "@/lib/db/schema";
import { dayRangeSeoul, todaySeoul } from "@/lib/date";
import {
  SUMMARY_MODEL,
  buildSummaryMessages,
  summaryDailyLimit,
} from "@/lib/summary";

// 요약 생성은 모델 응답을 끝까지 기다려야 해서 기본 타임아웃으로는 부족할 수 있다.
export const maxDuration = 60;

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
  const from = body?.dateRange?.from ?? todaySeoul();
  const to = body?.dateRange?.to ?? from;
  const format = typeof body?.format === "string" ? body.format : "default";
  const categoryId =
    typeof body?.categoryId === "string" ? body.categoryId : "";

  // 대시보드에서 체크한 메모만 요약한다. 없으면(직접 '다시 요약' 등) 기간 전체를 본다.
  let selectedMemoIds: string[] | null = null;
  if (body?.memoIds !== undefined) {
    if (
      !Array.isArray(body.memoIds) ||
      body.memoIds.some((id: unknown) => typeof id !== "string")
    ) {
      return errorResponse(
        "INVALID_MEMO_IDS",
        "memoIds는 문자열 배열이어야 합니다.",
        400
      );
    }
    if (body.memoIds.length === 0) {
      return errorResponse(
        "EMPTY_MEMO_SELECTION",
        "요약에 포함할 메모를 하나 이상 선택하세요.",
        422
      );
    }
    selectedMemoIds = body.memoIds;
  }

  if (!DATE_PATTERN.test(from) || !DATE_PATTERN.test(to) || from > to) {
    return errorResponse(
      "INVALID_DATE_RANGE",
      "dateRange는 YYYY-MM-DD 형식이어야 하고 from이 to보다 늦을 수 없습니다.",
      400
    );
  }

  // 스트리밍을 시작하기 전에 실패할 수 있는 검사는 모두 여기서 끝낸다.
  // (스트림이 열린 뒤에는 HTTP 상태 코드를 바꿀 수 없다)

  // 남의 카테고리로 요약을 만들지 못하게 소유권을 확인한다.
  const [category] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
    .limit(1);

  if (!category) {
    return errorResponse(
      "INVALID_CATEGORY",
      "카테고리를 찾을 수 없습니다.",
      400
    );
  }

  // 상한이 설정된 경우에만 집계한다. 기본값(무제한)에서는 쿼리 자체를 돌리지 않는다.
  //
  // 여기에는 deleted_at 조건을 걸지 않는다 — 의도적이다. 삭제된 버전까지 세야
  // "생성 → 삭제 → 생성"으로 상한을 우회할 수 없다. 요약은 만든 순간 비용이 발생했고,
  // 나중에 화면에서 감췄다고 그 호출이 없던 일이 되지는 않는다.
  const dailyLimit = summaryDailyLimit();
  if (dailyLimit !== null) {
    const { start: todayStart, end: todayEnd } = dayRangeSeoul(todaySeoul());
    const todaysSummaries = await db
      .select({ id: summaries.id })
      .from(summaries)
      .where(
        and(
          eq(summaries.userId, userId),
          gte(summaries.createdAt, todayStart),
          lt(summaries.createdAt, todayEnd)
        )
      );

    if (todaysSummaries.length >= dailyLimit) {
      return errorResponse(
        "QUOTA_EXCEEDED",
        `하루 요약 생성은 ${dailyLimit}회까지 가능합니다.`,
        429
      );
    }
  }

  const rows = await db
    .select({ id: memos.id, text: memos.text })
    .from(memos)
    .where(
      and(
        eq(memos.userId, userId),
        eq(memos.categoryId, categoryId),
        gte(memos.logDate, from),
        lte(memos.logDate, to),
        // userId 조건과 함께 걸러지므로 남의 메모 id가 섞여 들어와도 무시된다.
        selectedMemoIds ? inArray(memos.id, selectedMemoIds) : undefined
      )
    )
    .orderBy(asc(memos.logDate), asc(memos.createdAt));

  if (rows.length === 0) {
    return errorResponse(
      "NO_MEMOS_IN_RANGE",
      "해당 기간에 요약할 메모가 없습니다.",
      422
    );
  }

  // 다음 버전 번호도 삭제된 행을 포함해 계산한다. 번호는 한번 붙으면 고정이라
  // v3을 지운 자리에 새 v3이 들어오면 안 된다(지운 v3과 새 v3이 같은 이름이 된다).
  // 그래서 목록에는 v1, v3처럼 빈 번호가 남을 수 있다 — 의도한 결과다.
  const [latest] = await db
    .select({ version: summaries.version })
    .from(summaries)
    .where(
      and(
        eq(summaries.userId, userId),
        eq(summaries.categoryId, categoryId),
        eq(summaries.dateFrom, from),
        eq(summaries.dateTo, to),
        eq(summaries.format, format)
      )
    )
    .orderBy(desc(summaries.version))
    .limit(1);

  const version = (latest?.version ?? 0) + 1;
  const memoIds = rows.map((row) => row.id);

  // 모듈 최상단에서 만들면 빌드 타임에 평가돼 OPENAI_API_KEY가 없는 환경에서 빌드가 깨진다.
  const openai = new OpenAI();

  const completion = await openai.chat.completions.create({
    model: SUMMARY_MODEL,
    messages: buildSummaryMessages(rows.map((row) => row.text)),
    // 메모를 정리해 다시 쓰는 작업이라 추론 토큰이 필요 없다. 비용 절감을 위해 끈다.
    reasoning_effort: "none",
    stream: true,
  });

  const encoder = new TextEncoder();
  const send = (data: unknown) =>
    encoder.encode(`data: ${JSON.stringify(data)}\n\n`);

  const stream = new ReadableStream({
    async start(controller) {
      let content = "";
      try {
        for await (const chunk of completion) {
          const delta = chunk.choices[0]?.delta?.content;
          if (!delta) continue;
          content += delta;
          controller.enqueue(send({ type: "delta", text: delta }));
        }

        const [saved] = await db
          .insert(summaries)
          .values({
            userId,
            categoryId,
            dateFrom: from,
            dateTo: to,
            format,
            version,
            content,
            memoIds,
          })
          .returning({ id: summaries.id, createdAt: summaries.createdAt });

        controller.enqueue(
          send({
            type: "done",
            id: saved.id,
            version,
            memoIds,
            createdAt: saved.createdAt,
          })
        );
      } catch (error) {
        console.error("summary stream failed", error);
        controller.enqueue(
          send({
            type: "error",
            code: "SUMMARY_FAILED",
            message: "요약 생성에 실패했습니다.",
          })
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse("UNAUTHORIZED", "로그인이 필요합니다.", 401);
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? todaySeoul();
  const format = searchParams.get("format") ?? "default";
  const categoryId = searchParams.get("category") ?? "";

  if (!DATE_PATTERN.test(date)) {
    return errorResponse(
      "INVALID_DATE",
      "date는 YYYY-MM-DD 형식이어야 합니다.",
      400
    );
  }

  if (!categoryId) {
    return errorResponse(
      "INVALID_CATEGORY",
      "category 쿼리 파라미터가 필요합니다.",
      400
    );
  }

  // 버전 이력을 모두 돌려줘 클라이언트에서 이전 요약본과 비교할 수 있게 한다.
  const rows = await db
    .select({
      id: summaries.id,
      version: summaries.version,
      content: summaries.content,
      memoIds: summaries.memoIds,
      createdAt: summaries.createdAt,
    })
    .from(summaries)
    .where(
      and(
        eq(summaries.userId, session.user.id),
        eq(summaries.categoryId, categoryId),
        eq(summaries.dateFrom, date),
        eq(summaries.dateTo, date),
        eq(summaries.format, format),
        isNull(summaries.deletedAt)
      )
    )
    .orderBy(asc(summaries.version));

  return Response.json({ date, format, summaries: rows });
}
