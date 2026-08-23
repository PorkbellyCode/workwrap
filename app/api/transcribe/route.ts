import OpenAI from "openai";
import { auth } from "@/auth";

// 오디오 업로드 + 전사는 응답까지 시간이 걸릴 수 있다.
export const maxDuration = 60;

const TRANSCRIBE_MODEL = "gpt-4o-mini-transcribe";

// OpenAI 전사 API의 파일 크기 상한. 초과분은 호출 전에 걸러 낭비를 막는다.
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse("UNAUTHORIZED", "로그인이 필요합니다.", 401);
  }

  const form = await request.formData().catch(() => null);
  const audio = form?.get("audio");

  if (!(audio instanceof File) || audio.size === 0) {
    return errorResponse("INVALID_AUDIO", "오디오 파일이 없습니다.", 400);
  }

  if (audio.size > MAX_AUDIO_BYTES) {
    return errorResponse(
      "AUDIO_TOO_LARGE",
      "녹음이 너무 깁니다. 25MB 이하로 나눠서 녹음해주세요.",
      413
    );
  }

  // 모듈 최상단에서 만들면 빌드 타임에 평가돼 OPENAI_API_KEY가 없는 환경에서 빌드가 깨진다.
  const openai = new OpenAI();

  const transcription = await openai.audio.transcriptions.create({
    file: audio,
    model: TRANSCRIBE_MODEL,
    language: "ko",
    stream: true,
  });

  const encoder = new TextEncoder();
  const send = (data: unknown) =>
    encoder.encode(`data: ${JSON.stringify(data)}\n\n`);

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of transcription) {
          if (event.type === "transcript.text.delta") {
            controller.enqueue(send({ type: "delta", text: event.delta }));
          } else if (event.type === "transcript.text.done") {
            // done 이벤트의 text가 최종 전사문이다. 델타를 이어붙인 것과 같아야 하지만,
            // 클라이언트가 재조립하지 않고 그대로 쓸 수 있도록 전체 텍스트를 함께 보낸다.
            controller.enqueue(send({ type: "done", text: event.text }));
          }
        }
      } catch (error) {
        console.error("transcribe stream failed", error);
        controller.enqueue(
          send({
            type: "error",
            code: "TRANSCRIBE_FAILED",
            message: "전사에 실패했습니다.",
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
