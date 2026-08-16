import {
  boolean,
  date,
  integer,
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

export const memos = pgTable("memo", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId("memo")),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  audioUrl: text("audio_url"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const summaries = pgTable("summary", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId("sum")),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  dateFrom: date("date_from", { mode: "string" }).notNull(),
  dateTo: date("date_to", { mode: "string" }).notNull(),
  format: text("format").notNull().default("default"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});
