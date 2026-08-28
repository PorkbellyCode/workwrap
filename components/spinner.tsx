"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

// public/image/3-dots-move.svg를 컴포넌트로 옮긴 것(원본 파일은 그대로 둔다).
//
// 원본은 fill이 파란색으로 박혀 있었는데 currentColor로 바꿨다. 그래야 버튼 안에서는
// 버튼 글자색을 그대로 따라가고(빨간 삭제 버튼, 검정 기본 버튼), 단독으로 쓰는 자리에서만
// text-brand로 오렌지를 입힐 수 있다. 외부 SVG를 <img>로 불러오면 CSS가 안 닿아서 못 하는 일이다.
//
// SMIL 애니메이션들이 id로 서로의 종료 시점을 참조한다(begin="xxx.end"). 원본의 고정 id를
// 그대로 두면 스피너가 화면에 둘 이상 떴을 때 id가 겹쳐 체인이 엉킨다. useId로 인스턴스마다
// 접두사를 붙여 격리했다.
export default function Spinner({
  className,
  // 스피너만으로 상태를 알리는 자리에서만 넘긴다. 옆에 글자가 있는 버튼 안에서는
  // 생략해서 스크린리더가 같은 말을 두 번 읽지 않게 한다.
  label,
}: {
  className?: string;
  label?: string;
}) {
  // useId 값에는 콜론 같은 문자가 섞여 있어 SMIL 참조에 그대로 못 쓴다.
  // 영숫자만 남기고, id가 숫자로 시작하지 않도록 앞에 글자를 하나 붙인다.
  const uid = `s${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("size-4 shrink-0", className)}
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <circle cx="4" cy="12" r="0"><animate begin={`0;${uid}z0Or.end`} attributeName="r" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="0;3" fill="freeze"/>
        <animate begin={`${uid}OLMs.end`} attributeName="cx" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="4;12" fill="freeze"/>
        <animate begin={`${uid}UHR2.end`} attributeName="cx" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="12;20" fill="freeze"/>
        <animate id={`${uid}lo66`} begin={`${uid}Aguh.end`} attributeName="r" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="3;0" fill="freeze"/>
        <animate id={`${uid}z0Or`} begin={`${uid}lo66.end`} attributeName="cx" dur="0.001s" values="20;4" fill="freeze"/>
        
      </circle>
      <circle cx="4" cy="12" r="3"><animate begin={`0;${uid}z0Or.end`} attributeName="cx" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="4;12" fill="freeze"/>
        <animate begin={`${uid}OLMs.end`} attributeName="cx" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="12;20" fill="freeze"/>
        <animate id={`${uid}JsnR`} begin={`${uid}UHR2.end`} attributeName="r" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="3;0" fill="freeze"/>
        <animate id={`${uid}Aguh`} begin={`${uid}JsnR.end`} attributeName="cx" dur="0.001s" values="20;4" fill="freeze"/>
        <animate begin={`${uid}Aguh.end`} attributeName="r" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="0;3" fill="freeze"/>
        
      </circle>
      <circle cx="12" cy="12" r="3"><animate begin={`0;${uid}z0Or.end`} attributeName="cx" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="12;20" fill="freeze"/>
        <animate id={`${uid}hSjk`} begin={`${uid}OLMs.end`} attributeName="r" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="3;0" fill="freeze"/>
        <animate id={`${uid}UHR2`} begin={`${uid}hSjk.end`} attributeName="cx" dur="0.001s" values="20;4" fill="freeze"/>
        <animate begin={`${uid}UHR2.end`} attributeName="r" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="0;3" fill="freeze"/>
        <animate begin={`${uid}Aguh.end`} attributeName="cx" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="4;12" fill="freeze"/>
        
      </circle>
      <circle cx="20" cy="12" r="3"><animate id={`${uid}4v5M`} begin={`0;${uid}z0Or.end`} attributeName="r" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="3;0" fill="freeze"/>
        <animate id={`${uid}OLMs`} begin={`${uid}4v5M.end`} attributeName="cx" dur="0.001s" values="20;4" fill="freeze"/>
        <animate begin={`${uid}OLMs.end`} attributeName="r" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="0;3" fill="freeze"/>
        <animate begin={`${uid}UHR2.end`} attributeName="cx" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="4;12" fill="freeze"/>
        <animate begin={`${uid}Aguh.end`} attributeName="cx" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="12;20" fill="freeze"/>
        
      </circle>
    </svg>
  );
}
