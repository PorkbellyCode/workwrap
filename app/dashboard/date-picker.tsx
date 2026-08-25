"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
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

export default function DatePicker({
  date,
  onSelect,
}: {
  date: string;
  onSelect: (date: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseDate(date);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {/* Base UI에는 Radix의 asChild가 없어서 트리거에 버튼 클래스를 직접 입힌다. */}
      {/* CardHeader가 grid라 그냥 두면 트리거가 카드 폭만큼 늘어나 가운데 정렬처럼 보인다. */}
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
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(next) => {
            if (!next) return;
            setOpen(false);
            onSelect(formatDate(next));
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
