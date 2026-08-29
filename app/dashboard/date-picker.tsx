"use client";

import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { ko } from "react-day-picker/locale";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// "YYYY-MM-DD" ↔ Date 변환은 로컬 시간대 안에서만 한다.
// new Date("2026-08-22")로 파싱하면 UTC 자정으로 해석돼 KST에서 하루가 밀린다.
function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

// 월 그리드와 같은 모양(4열 × 3줄)으로 맞춘다.
const YEARS_PER_PAGE = 12;

// 표시 중인 연도가 속한 12년 블록의 시작. 페이지를 넘겨도 경계가 흔들리지 않는다.
function yearBlockStart(year: number) {
  return year - (year % YEARS_PER_PAGE);
}

// 캘린더 폭(7칸 × 28px + 패딩 = 212px)보다 조금 넓게 잡아, 뷰를 오갈 때
// 팝오버 폭이 바뀌지 않게 한다.
const PANEL_WIDTH = "w-56";

type View = "day" | "month" | "year";

// 월 그리드와 연도 그리드가 같은 모양이라 한 컴포넌트로 그린다.
function PickerGrid({
  title,
  onTitleClick,
  onPrev,
  onNext,
  options,
}: {
  title: string;
  // 연도 그리드에는 더 올라갈 곳이 없어 제목이 버튼이 아니다.
  onTitleClick?: () => void;
  onPrev: () => void;
  onNext: () => void;
  options: { label: string; selected: boolean; onSelect: () => void }[];
}) {
  return (
    <div className="p-2">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" aria-label="이전" onClick={onPrev}>
          <ChevronLeft className="size-4" />
        </Button>

        {onTitleClick ? (
          <Button variant="ghost" size="sm" onClick={onTitleClick}>
            {title}
          </Button>
        ) : (
          <span className="text-sm font-medium">{title}</span>
        )}

        <Button variant="ghost" size="icon" aria-label="다음" onClick={onNext}>
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1">
        {options.map((option) => (
          <Button
            key={option.label}
            variant={option.selected ? "secondary" : "ghost"}
            size="sm"
            onClick={option.onSelect}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export default function DatePicker({
  date,
  onSelect,
}: {
  date: string;
  onSelect: (date: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseDate(date);
  const today = formatDate(new Date());

  // 날짜 → 월 → 연도로 올라갔다가 고르면 되짚어 내려온다.
  const [view, setView] = useState<View>("day");
  // 표시 중인 달. 세 뷰가 이 값 하나를 공유한다.
  const [month, setMonth] = useState(selected);
  const [yearStart, setYearStart] = useState(() =>
    yearBlockStart(selected.getFullYear())
  );

  function choose(next: string) {
    setOpen(false);
    onSelect(next);
  }

  // 고르지 않고 닫았다면 다음에 열 때 날짜 화면부터 다시 시작한다.
  function toggle(next: boolean) {
    setOpen(next);
    if (!next) {
      setView("day");
      setMonth(selected);
    }
  }

  return (
    <Popover open={open} onOpenChange={toggle}>
      {/* Base UI에는 Radix의 asChild가 없어서 트리거에 버튼 클래스를 직접 입힌다. */}
      {/* CardHeader가 grid라 그냥 두면 트리거가 카드 폭만큼 늘어난다. */}
      <PopoverTrigger
        className={cn(
          buttonVariants({ variant: "secondary", size: "sm" }),
          "w-fit"
        )}
        aria-label="날짜 선택"
      >
        <CalendarDays className="size-4" />
        {date}
      </PopoverTrigger>

      <PopoverContent align="start" className={cn(PANEL_WIDTH, "p-0")}>
        {view === "day" && (
          <div className="flex justify-center">
            {/* 날짜 그리드는 react-day-picker에 맡긴다 — 주 계산, 인접 월,
                오늘/선택 표시, 키보드 이동을 직접 짜면 버그만 새로 만든다.
                우리가 얹는 건 캡션을 눌러 위로 올라가는 길뿐이다. */}
            <Calendar
              mode="single"
              locale={ko}
              month={month}
              onMonthChange={setMonth}
              selected={selected}
              onSelect={(next) => next && choose(formatDate(next))}
              components={{
                // 캡션 라벨만 버튼으로 바꾼다. MonthCaption(바깥 컨테이너)을 통째로
                // 갈아끼우면 화살표 자리를 비워두는 좌우 패딩까지 다시 써야 한다.
                CaptionLabel: () => (
                  <Button
                    variant="ghost"
                    size="sm"
                    // RDP의 nav가 absolute로 캡션 줄 전체를 덮고 있어, 그냥 두면
                    // 가운데 클릭을 nav가 가로챈다.
                    className="relative z-10"
                    onClick={() => setView("month")}
                  >
                    {month.getFullYear()}년 {month.getMonth() + 1}월
                  </Button>
                ),
              }}
            />
          </div>
        )}

        {view === "month" && (
          <PickerGrid
            title={`${month.getFullYear()}년`}
            onTitleClick={() => {
              setYearStart(yearBlockStart(month.getFullYear()));
              setView("year");
            }}
            onPrev={() =>
              setMonth(new Date(month.getFullYear() - 1, month.getMonth(), 1))
            }
            onNext={() =>
              setMonth(new Date(month.getFullYear() + 1, month.getMonth(), 1))
            }
            // 미래 월도 그대로 연다 — #4의 "과거·미래 제한 없음"을 따른다.
            options={Array.from({ length: 12 }, (_, index) => ({
              label: `${index + 1}월`,
              selected: month.getMonth() === index,
              onSelect: () => {
                setMonth(new Date(month.getFullYear(), index, 1));
                setView("day");
              },
            }))}
          />
        )}

        {view === "year" && (
          <PickerGrid
            title={`${yearStart} – ${yearStart + YEARS_PER_PAGE - 1}`}
            onPrev={() => setYearStart(yearStart - YEARS_PER_PAGE)}
            onNext={() => setYearStart(yearStart + YEARS_PER_PAGE)}
            options={Array.from({ length: YEARS_PER_PAGE }, (_, index) => {
              const year = yearStart + index;
              return {
                label: `${year}`,
                selected: month.getFullYear() === year,
                onSelect: () => {
                  setMonth(new Date(year, month.getMonth(), 1));
                  setView("month");
                },
              };
            })}
          />
        )}

        {/* 오늘로 돌아오는 건 가장 잦은 이동이라 어느 뷰에서든 한 번에 닿게 둔다. */}
        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            // 이미 오늘이면 같은 URL로 이동해 화면만 한 번 깜빡인다.
            disabled={date === today}
            onClick={() => choose(today)}
          >
            오늘
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
