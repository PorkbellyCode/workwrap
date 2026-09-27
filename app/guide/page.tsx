import type { Metadata } from "next";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Mic,
  MoreVertical,
  Pin,
  Plus,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { RecordDemo, SummaryDemo } from "./demos";

export const metadata: Metadata = { title: "Workwrap 사용법" };

// 로그인 여부를 따지지 않는다. 승인 대기 화면(/pending)에서도 들어올 수 있어야 하고,
// 개인 데이터가 없는 정적 안내라 막을 이유가 없다.
// "메모로 돌아가기"는 /dashboard로 보낸다 — 미승인·비로그인이면 그쪽에서 알아서 돌려보낸다.

// 문장 속에서 실제 버튼과 같은 아이콘을 보여줘, 앱에서 같은 모양을 찾을 수 있게 한다.
function Glyph({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <Icon
      role="img"
      aria-label={label}
      className="inline size-[1.05em] align-[-0.15em] text-foreground"
    />
  );
}

// 실제 메모 행(memo-timeline)과 같은 글자 크기·색을 쓴 정적 복제본.
function MemoRow({
  text,
  meta,
  pinned,
}: {
  text: string;
  meta: string;
  pinned?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 py-3 [&+&]:border-t">
      <span className="text-base">{text}</span>
      <div className="flex items-center">
        <span className="mr-auto text-[13px] tabular-nums text-muted-foreground">
          {meta}
        </span>
        <Pin
          aria-hidden
          className={cn("size-4 text-muted-foreground", pinned && "fill-current")}
        />
      </div>
    </div>
  );
}

// 하루의 흐름 순서대로 둔 기본 사용법.
const DAY: {
  title: string;
  body: React.ReactNode;
  sample: React.ReactNode;
}[] = [
  {
    title: "업무 탭 고르기",
    body: (
      <>
        위쪽 탭이 업무 구분이에요. 지금 보고 있는 탭에 메모가 쌓여요. 탭은{" "}
        <Glyph icon={Plus} label="추가" />로 3개까지 만들 수 있고,{" "}
        <Glyph icon={MoreVertical} label="관리" />에서 이름을 바꾸거나 지워요.
      </>
    ),
    sample: (
      <div className="flex h-8 rounded-[9px] bg-muted p-0.5 text-[13px]">
        <span className="flex flex-1 items-center justify-center rounded-[7px] bg-card font-semibold shadow-[0_1px_3px_rgb(0_0_0/0.12)] dark:bg-input">
          생산
        </span>
        <span className="flex flex-1 items-center justify-center font-medium text-muted-foreground">
          설비
        </span>
        <span className="flex flex-1 items-center justify-center font-medium text-muted-foreground">
          구매
        </span>
      </div>
    ),
  },
  {
    title: "말로 남기기",
    body: (
      <>
        아래 <Glyph icon={Mic} label="마이크" />를 누르고 말한 뒤 한 번 더 누르면
        받아 적어요. 입력창에서 확인하고 고친 다음 추가를 누르면 저장돼요. 숫자와
        거래처 이름은 요약에도 그대로 남으니 또박또박 말해 주세요.
      </>
    ),
    sample: <RecordDemo />,
  },
  {
    title: "안 끝난 일은 고정",
    body: (
      <>
        오늘 끝나지 않은 메모는 <Glyph icon={Pin} label="고정" />을 눌러 두세요.
        다음 날부터 오늘 화면 맨 위 &lsquo;고정된 메모&rsquo;에 계속 보여서 다시
        녹음할 필요가 없어요. 일이 끝나면 한 번 더 눌러 해제해요.
      </>
    ),
    sample: (
      <div>
        <p className="text-[13px] font-medium text-muted-foreground">고정된 메모 1</p>
        <MemoRow text="3라인 컨베이어 벨트 교체, 부품 입고 대기 중" meta="9월 25일" pinned />
      </div>
    ),
  },
  {
    title: "요약하기",
    body: (
      <>
        요약에 넣을 메모만 체크하고 <Glyph icon={Sparkles} label="요약" /> 요약
        버튼을 누른 뒤 요약하기를 눌러요. 만든 요약은 복사하거나 공유해서 메신저로
        바로 보낼 수 있어요.
      </>
    ),
    sample: <SummaryDemo />,
  },
];

// 배경 정보 편집 화면(요약 탭의 context-editor)과 같은 모양의 행. 값은 예시다.
function ContextRow({ label, value }: { label: string; value?: string }) {
  return (
    <li className="flex h-11 items-center gap-3 [&+&]:border-t">
      <span className="max-w-[40%] shrink-0 truncate text-[15px]">{label}</span>
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-right text-[15px]",
          value ? "text-muted-foreground" : "text-brand"
        )}
      >
        {value || "적어두기"}
      </span>
      <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground/60" />
    </li>
  );
}

const SAMPLE_CONTEXT = "B사 신제품 파우치 리뉴얼 진행 중\n샘플 담당: 김 대리\nMOQ = 최소 주문 수량";

// 앱 화면을 그대로 옮긴 예시를 담는 틀. 가이드 본문과 섞이지 않도록 테두리로 구분하고,
// sheet는 아래에서 올라오는 편집 창처럼 손잡이와 위쪽 둥근 모서리만 둔다.
function Screen({
  sheet,
  caption,
  children,
}: {
  sheet?: boolean;
  caption: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    // min-w-0: 그리드 항목은 기본 최소 폭이 내용 폭이라, 긴 예시 값이 말줄임되지 않고 틀을 밀어낸다.
    <figure className="flex min-w-0 flex-col gap-2">
      <div
        aria-hidden
        className={cn(
          "overflow-hidden ring-1 ring-border",
          sheet
            ? "rounded-t-[20px] bg-background px-4 pb-4 dark:bg-card"
            : "rounded-[20px] bg-background px-4 py-4"
        )}
      >
        {sheet && (
          <div className="mx-auto mt-2 mb-3 h-1.5 w-9 rounded-full bg-muted-foreground/40" />
        )}
        {children}
      </div>
      <figcaption className="px-1 text-[13px] leading-relaxed text-muted-foreground">
        {caption}
      </figcaption>
    </figure>
  );
}

// 순서가 없는 참고 사항. 번호·시각을 붙이지 않고 설정 화면식 묶음 목록으로 둔다.
const MORE: { title: string; body: string }[] = [
  {
    title: "지난 날짜 보기",
    body: "날짜를 누르면 달력이 열려요. 메모 카드를 좌우로 밀어도 하루씩 넘어가요. 지난 날짜에도 메모를 추가할 수 있어요.",
  },
  {
    title: "요약 탭",
    body: "날짜별 요약이 모여 있어요. 다시 요약해도 이전 버전은 지워지지 않고 남아요. 여기서 다시 요약하면 그날 메모 전체를 써요.",
  },
  {
    title: "홈 화면에 추가",
    body: "아이폰은 Safari의 공유 버튼에서 '홈 화면에 추가', 안드로이드는 화면 위에 뜨는 설치 버튼을 누르면 앱처럼 열려요.",
  },
];

export default function GuidePage() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8 px-6 pt-6 pb-16">
      <header className="flex flex-col gap-6">
        <Link
          href="/dashboard"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ml-2.5 self-start text-muted-foreground"
          )}
        >
          <ChevronLeft className="size-4" />
          메모로 돌아가기
        </Link>
        <div className="flex flex-col gap-2">
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">
            하루 동안 말로 남기고,
            <br />
            퇴근 전에 한 번에 정리해요
          </h1>
          <p className="text-[15px] text-muted-foreground">
            Workwrap을 쓰는 하루는 이렇게 흘러가요.
          </p>
        </div>
      </header>

      {/* 각 단계의 카드는 앱의 실제 모양을 작게 옮긴 것이라,
          설명을 읽고 앱에서 같은 모양을 찾을 수 있다. */}
      <ol className="flex flex-col">
        {DAY.map((step) => (
          <li key={step.title}>
            <div className="flex flex-col gap-3 pb-10">
              <h2 className="text-[17px] font-semibold">{step.title}</h2>
              <p className="text-[15px] leading-relaxed text-muted-foreground">
                {step.body}
              </p>
              <div aria-hidden className="rounded-xl bg-card px-4 py-2">
                {step.sample}
              </div>
            </div>
          </li>
        ))}
      </ol>

      {/* 배경 정보는 효과가 눈에 안 보이는 기능이라 따로 설명한다.
          "왜"는 같은 메모의 요약 전후 비교로, "어떻게"는 실제 화면 두 장으로 보여준다. */}
      <section className="flex flex-col gap-6 border-t pt-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-[22px] leading-snug font-semibold tracking-tight">
            배경 정보를 적어 두면
            <br />
            요약이 정확해져요
          </h2>
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            메모에 &lsquo;그거&rsquo;처럼 대상이 빠져 있어도, 적어 둔 배경을 보고 무슨
            일인지 채워서 정리해요.
          </p>
        </div>

        <div aria-hidden className="flex flex-col gap-2">
          <div className="rounded-xl bg-card px-4 py-1">
            <MemoRow text="그거 2차 샘플 다시 요청함, 금요일까지" meta="14:20" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1 rounded-xl bg-card px-4 py-3">
              <span className="text-[13px] text-muted-foreground">배경 없이</span>
              <span className="text-[15px] text-muted-foreground">
                샘플 재요청 (금요일까지)
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl bg-card px-4 py-3 ring-1 ring-brand/40">
              <span className="text-[13px] text-brand">배경을 적으면</span>
              <span className="text-[15px]">B사 파우치 2차 샘플 재요청 (금요일까지)</span>
            </div>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Screen
            caption={
              <>
                요약 화면 맨 아래에 있어요. &lsquo;나&rsquo;는 모든 요약에, 업무 탭은 그 탭
                요약에만 쓰여요.
              </>
            }
          >
            <p className="px-4 pb-1.5 text-[13px] text-muted-foreground">
              요약에 쓰는 배경 정보
            </p>
            <ul className="rounded-xl bg-card pr-3 pl-4">
              <ContextRow label="나" />
              <ContextRow label="구매" value="B사 신제품 파우치 리뉴얼 진행 중" />
            </ul>
          </Screen>

          <Screen sheet caption="단어 위주로 짧게 적으면 충분해요. 창을 닫으면 저장돼요.">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold tracking-tight">구매에 대해</span>
              <span className="text-[15px] font-semibold text-brand">완료</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">구매 요약에만 쓰여요.</p>
            <p className="mt-3 rounded-xl bg-card px-4 py-3 text-base leading-relaxed whitespace-pre-line dark:bg-popover">
              {SAMPLE_CONTEXT}
            </p>
            <p className="mt-1.5 text-right text-[13px] tabular-nums text-muted-foreground">
              {SAMPLE_CONTEXT.length} / 1000
            </p>
          </Screen>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="px-4 text-[13px] font-medium text-muted-foreground">
          알아두면 좋은 것
        </h2>
        <ul className="rounded-xl bg-card px-4">
          {MORE.map((item) => (
            <li key={item.title} className="flex flex-col gap-1 py-3 [&+&]:border-t">
              <span className="text-base font-medium">{item.title}</span>
              <span className="text-[15px] leading-relaxed text-muted-foreground">
                {item.body}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <Link
        href="/dashboard"
        className={cn(buttonVariants({ size: "lg" }), "h-11 text-base")}
      >
        메모하러 가기
      </Link>
    </div>
  );
}
