-- 화면 용어를 "이어가기"에서 "고정"으로 바꾸면서 컬럼 이름도 맞춘다. 값은 그대로 유지된다.
-- drizzle-kit이 이름 변경을 대화형으로 묻기 때문에 --custom으로 만들고 스냅샷을 직접 맞췄다.
ALTER TABLE "memo" RENAME COLUMN "carry_over" TO "pinned";
