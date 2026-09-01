"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { MAX_CONTEXT_LENGTH } from "@/lib/context";

// 요약 프롬프트에 붙는 배경 정보를 여기서 편집한다.
//
// ⋮ 카테고리 관리 팝업이 아니라 이 화면에 둔 이유: 그 팝업은 "카테고리 자체의
// 관리(이름·삭제)"고 컨텍스트는 요약의 입력값이다. 대시보드 요약 시트에 넣는 안도
// 폐기했다 — 시트는 이미 체크리스트와 결과로 85dvh가 차 있어, 여기에 두 개를 더
// 얹으면 요약을 보려고 연 시트에서 요약이 화면 밖으로 밀린다.
//
// 접이식(2026-09-01 이전 결정)을 뒤집었다: 자주 쓰는 값이 아니라는 실사용
// 피드백이 나왔고, 요약 본문이 길어지면 이 화면도 세로 공간이 남지 않는다 —
// "카드 하나뿐이라 여백이 남는다"던 전제가 더는 성립하지 않는다. 대신 이미
// 적어둔 게 있으면(hasContext) 기본으로 펼쳐서, 접어둔 채로 그 존재를 잊는
// 문제는 피한다.
export default function ContextEditor({
  userContext,
  categoryId,
  categoryName,
  categoryContext,
  onSave,
}: {
  userContext: string;
  categoryId: string;
  categoryName: string;
  categoryContext: string;
  // 요약이 이 저장을 기다릴 수 있도록 진행 중인 요청을 부모에게 넘긴다.
  onSave: (request: Promise<unknown>) => void;
}) {
  const router = useRouter();
  const [mine, setMine] = useState(userContext);
  const [work, setWork] = useState(categoryContext);
  const [error, setError] = useState("");
  const hasContext = Boolean(userContext.trim() || categoryContext.trim());

  // 카테고리 이름 편집과 같은 방식으로 blur에 저장한다. 저장 버튼을 두면
  // 안 누른 채로 요약을 돌리는 일이 생긴다.
  async function save(url: string, value: string, saved: string) {
    if (value.trim() === saved.trim()) return;

    const request = fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context: value }),
    });
    onSave(request);
    const res = await request;

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error?.message ?? "컨텍스트를 저장하지 못했어요.");
      return;
    }

    setError("");
    router.refresh();
  }

  return (
    <Card>
      <Collapsible defaultOpen={hasContext}>
        <CardHeader>
          <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 rounded-sm text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <CardTitle className="text-base">요약에 참고할 컨텍스트</CardTitle>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform data-panel-open:rotate-180" />
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsiblePanel>
          <CardContent className="flex flex-col gap-4">
            <Field
              label="나에 대해"
              placeholder="나에 대해 배경지식을 작성해주세요, 요약 결과 품질 향상에 도움이 됩니다."
              value={mine}
              onChange={setMine}
              onBlur={() => save("/api/me", mine, userContext)}
            />

            <Field
              label={`${categoryName} 에 대해`}
              placeholder={`${categoryName}에 대한 배경지식을 작성해주세요, 요약 결과 품질 향상에 도움이 됩니다.`}
              value={work}
              onChange={setWork}
              onBlur={() =>
                save(`/api/categories/${categoryId}`, work, categoryContext)
              }
            />

            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </CollapsiblePanel>
      </Collapsible>
    </Card>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
  onBlur,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs tabular-nums text-muted-foreground">
          {value.length} / {MAX_CONTEXT_LENGTH}
        </span>
      </div>
      <Textarea
        value={value}
        placeholder={placeholder}
        maxLength={MAX_CONTEXT_LENGTH}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        // 대시보드 입력창과 같은 처리 — 리사이즈 핸들은 끄고 스크롤바는 숨긴다.
        className="max-h-40 min-h-20 resize-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      />
    </div>
  );
}
