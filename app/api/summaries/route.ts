import OpenAI from "openai";
import { and, asc, desc, eq, gte, lt } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { memos, summaries } from "@/lib/db/schema";
import { dayRangeUtc, todayUtc } from "@/lib/date";
import {
  SUMMARY_DAILY_LIMIT,
  SUMMARY_MODEL,
  buildSummaryMessages,
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
  const from = body?.dateRange?.from ?? todayUtc();
  const to = body?.dateRange?.to ?? from;
  const format = typeof body?.format === "string" ? body.format : "default";

  if (!DATE_PATTERN.test(from) || !DATE_PATTERN.test(to) || from > to) {
    return errorResponse(
      "INVALID_DATE_RANGE",
      "dateRange는 YYYY-MM-DD 형식이어야 하고 from이 to보다 늦을 수 없습니다.",
      400
    );
  }

  // 스트리밍을 시작하기 전에 실패할 수 있는 검사는 모두 여기서 끝낸다.
  // (스트림이 열린 뒤에는 HTTP 상태 코드를 바꿀 수 없다)

  const { start: todayStart, end: todayEnd } = dayRangeUtc(todayUtc());
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

  if (todaysSummaries.length >= SUMMARY_DAILY_LIMIT) {
    return errorResponse(
      "QUOTA_EXCEEDED",
      `하루 요약 생성은 ${SUMMARY_DAILY_LIMIT}회까지 가능합니다.`,
      429
    );
  }

  const rows = await db
    .select({ text: memos.text })
    .from(memos)
    .where(
      and(
        eq(memos.userId, userId),
        gte(memos.createdAt, dayRangeUtc(from).start),
        lt(memos.createdAt, dayRangeUtc(to).end)
      )
    )
    .orderBy(asc(memos.createdAt));

  if (rows.length === 0) {
    return errorResponse(
      "NO_MEMOS_IN_RANGE",
      "해당 기간에 요약할 메모가 없습니다.",
      422
    );
  }

  const [latest] = await db
    .select({ version: summaries.version })
    .from(summaries)
    .where(
      and(
        eq(summaries.userId, userId),
        eq(summaries.dateFrom, from),
        eq(summaries.dateTo, to),
        eq(summaries.format, format)
      )
    )
    .orderBy(desc(summaries.version))
    .limit(1);

  const version = (latest?.version ?? 0) + 1;

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
            dateFrom: from,
            dateTo: to,
            format,
            version,
            content,
          })
          .returning({ id: summaries.id, createdAt: summaries.createdAt });

        controller.enqueue(
          send({
            type: "done",
            id: saved.id,
            version,
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
  const date = searchParams.get("date") ?? todayUtc();
  const format = searchParams.get("format") ?? "default";

  if (!DATE_PATTERN.test(date)) {
    return errorResponse(
      "INVALID_DATE",
      "date는 YYYY-MM-DD 형식이어야 합니다.",
      400
    );
  }

  // 버전 이력을 모두 돌려줘 클라이언트에서 이전 요약본과 비교할 수 있게 한다.
  const rows = await db
    .select({
      id: summaries.id,
      version: summaries.version,
      content: summaries.content,
      createdAt: summaries.createdAt,
    })
    .from(summaries)
    .where(
      and(
        eq(summaries.userId, session.user.id),
        eq(summaries.dateFrom, date),
        eq(summaries.dateTo, date),
        eq(summaries.format, format)
      )
    )
    .orderBy(asc(summaries.version));

  return Response.json({ date, format, summaries: rows });
}
