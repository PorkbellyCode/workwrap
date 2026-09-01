import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { accounts, sessions, users, verificationTokens } from "@/lib/db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [Google],
  pages: { error: "/dashboard" },
  callbacks: {
    // 기본 session 콜백은 name/email/image만 남기고 id를 지워버리기 때문에,
    // API 라우트에서 session.user.id로 소유자를 판별할 수 있도록 직접 채워준다.
    // (동시에 status 등 나머지 컬럼이 그대로 노출되는 것도 막는다)
    async session({ session, user }) {
      return {
        ...session,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        },
      };
    },
  },
});
