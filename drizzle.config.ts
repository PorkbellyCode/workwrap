import { defineConfig } from "drizzle-kit";

// Next.js는 .env.local을 자동으로 읽지만, drizzle-kit CLI는 별도 프로세스라
// 직접 로드해줘야 한다(.env.local은 drizzle-kit이 기본으로 보는 .env가 아님).
process.loadEnvFile(".env.local");

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
