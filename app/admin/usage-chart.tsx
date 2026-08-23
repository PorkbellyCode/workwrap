"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export type DailyPoint = {
  date: string;
  memos: number;
  summaries: number;
};

// 서비스 전체가 완전 모노톤이라 두 시리즈도 명도 2단계로만 구분한다.
// 무채색이라 색각 이상 여부와 무관하게 분리가 유지되고(검증상 ΔE 약 35),
// 라이트/다크는 배경이 반대라 자동 반전이 아니라 각각 따로 고른 값이다.
const chartConfig = {
  memos: {
    label: "메모",
    theme: { light: "oklch(0.25 0 0)", dark: "oklch(0.95 0 0)" },
  },
  summaries: {
    label: "요약",
    theme: { light: "oklch(0.62 0 0)", dark: "oklch(0.60 0 0)" },
  },
} satisfies ChartConfig;

export default function UsageChart({ data }: { data: DailyPoint[] }) {
  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
      <BarChart data={data} margin={{ left: -20, right: 4 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          // 14일치라 전체 날짜를 다 찍으면 겹친다. MM-DD로 줄이고 격일로만 표시.
          tickFormatter={(value: string) => value.slice(5)}
          interval={1}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          width={40}
          // 건수라 정수 눈금만 의미가 있다.
          allowDecimals={false}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="memos" fill="var(--color-memos)" radius={[4, 4, 0, 0]} />
        <Bar
          dataKey="summaries"
          fill="var(--color-summaries)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}
