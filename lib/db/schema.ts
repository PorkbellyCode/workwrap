import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createId } from "@/lib/id";

// --- NextAuth(Auth.js) DrizzleAdapter 필수 테이블 ---
// Google OAuth로 로그인하며, @auth/drizzle-adapter의 타입 시그니처가
// usersTable/accountsTable을 요구해 표준 형태를 그대로 따르되 users에는
// 프로젝트 전용 컬럼(approved, requestedAt, createdAt)을 추가했다.
// 가입은 별도 절차 없이 첫 로그인 시 자동 생성되고(approved 기본값 false),
// 관리자가 /admin에서 승인해야 대시보드를 사용할 수 있다.

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId("usr")),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  approved: boolean("approved").notNull().default(false),
  // 요약 프롬프트에 붙는 사용자 전역 배경(직무, 팀, 자주 쓰는 약어 등).
  // 길이 상한(MAX_CONTEXT_LENGTH)은 서버에서 검증한다 — varchar로 박으면
  // 숫자를 바꿀 때마다 마이그레이션이 필요해진다.
  context: text("context"),
  requestedAt: timestamp("requested_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ]
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => [
    primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  ]
);

// --- Workwrap 도메인 테이블 (프로젝트 컨텍스트 문서 6번, API 명세 6번 기준) ---

// 사용자가 직접 만드는 업무 분류(예: SRM / PSRM / 일상). 사용자당 최대 3개이며
// 최소 1개는 항상 유지된다(마지막 하나는 삭제 불가). 승인 시 'Work'가 자동 생성되므로
// 카테고리가 0개인 상태는 발생하지 않는다.
export const categories = pgTable("category", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId("cat")),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  // 이 업무에 한정된 배경. 요약은 항상 카테고리 하나 안에서 일어나므로
  // 프롬프트에는 그 요약의 카테고리 컨텍스트 하나만 붙는다.
  context: text("context"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const memos = pgTable(
  "memo",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId("memo")),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    // 사용자가 "이 메모가 속한 날"로 지정한 날짜. 클라이언트가 자기 로컬 날짜를 보낸다.
    // created_at(시스템이 기록한 실제 시각)과 역할이 다르다 — 타임라인/요약은 log_date로
    // 묶고, 운영·비용 집계는 created_at을 쓴다. 이 분리로 조회 쿼리에서 타임존 변환이 사라진다.
    logDate: date("log_date", { mode: "string" }).notNull(),
    audioUrl: text("audio_url"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (memo) => [index("memo_user_id_log_date_idx").on(memo.userId, memo.logDate)]
);

export const summaries = pgTable("summary", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId("sum")),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  categoryId: text("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  dateFrom: date("date_from", { mode: "string" }).notNull(),
  dateTo: date("date_to", { mode: "string" }).notNull(),
  format: text("format").notNull().default("default"),
  // 같은 (user, category, 기간, format)에 대해 재요약할 때마다 1부터 증가.
  // 덮어쓰지 않고 이력을 남겨 이전 요약본과 비교할 수 있게 한다.
  version: integer("version").notNull().default(1),
  content: text("content").notNull(),
  // 요약 생성 시점에 근거로 사용한 memo.id 스냅샷. 텍스트는 스냅샷하지 않고 표시할 때
  // memo 테이블과 조인한다 — 재요약 전에 메모가 수정되는 일은 드물어 id만으로 충분하다고 판단.
  memoIds: jsonb("memo_ids").notNull().$type<string[]>(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  // 소프트 삭제. 화면에서만 감추고 행은 남긴다.
  // quota가 별도 카운터 없이 "오늘 만들어진 summary 행 수"로 성립하기 때문에,
  // 물리 삭제를 허용하면 "생성 → 삭제 → 생성"으로 상한을 무한히 우회할 수 있다.
  // 보존 기간이 지난 행은 /api/cron/purge-summaries가 일괄 정리한다.
  deletedAt: timestamp("deleted_at", { mode: "date" }),
});
