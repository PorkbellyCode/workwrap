"use client";

import Markdown from "react-markdown";
import type { Components } from "react-markdown";
import remend from "remend";

// 요약 본문 렌더러. 대시보드 시트와 /summary가 함께 쓴다.
//
// 스타일은 @tailwindcss/typography 대신 컴포넌트 매핑으로 직접 준다. preflight가
// h2·ul의 기본 스타일을 지워놔서 렌더러만 붙이면 제목이 본문과 똑같이 보이는데,
// 요약이 쓰는 요소가 제목·목록·굵기 정도라 플러그인을 들이는 것보다 모노톤 컨셉에
// 맞춰 몇 줄 쓰는 편이 통제가 쉽다.
//
// h1·h3도 h2와 같게 그린다. 프롬프트는 "##"만 시키지만 모델이 항상 지킨다는 보장은 없고,
// 어긋났을 때 제목이 본문으로 뭉개지는 것보다 깊이만 사라지는 편이 낫다.
const heading = "mt-5 mb-2 font-semibold first:mt-0";

const components: Components = {
  h1: ({ children }) => <h2 className={heading}>{children}</h2>,
  h2: ({ children }) => <h2 className={heading}>{children}</h2>,
  h3: ({ children }) => <h3 className={heading}>{children}</h3>,
  p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => (
    <ul className="my-2 list-disc space-y-1 pl-5 marker:text-muted-foreground">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 list-decimal space-y-1 pl-5 marker:text-muted-foreground">
      {children}
    </ol>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  code: ({ children }) => (
    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
      {children}
    </code>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="underline underline-offset-4"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 pl-3 text-muted-foreground">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4" />,
};

export default function SummaryMarkdown({
  content,
  streaming,
}: {
  content: string;
  streaming: boolean;
}) {
  // 스트리밍 중에는 마지막 토큰이 늘 문법 한가운데서 끊긴다 — "**진행"이 닫히기 전까지
  // 별표가 그대로 보이고, 다음 토큰에 굵기로 바뀐다. remend가 그 끝을 임시로 닫아준다.
  // 스트리밍이 끝난 뒤에는 원문 그대로 그린다(고칠 것이 없고, 고치면 원문과 달라진다).
  const text = streaming ? remend(content) : content;

  return (
    <div className="text-sm leading-relaxed">
      <Markdown components={components}>{text}</Markdown>
    </div>
  );
}
