import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, memos } from "@/lib/db/schema";

// 관리 팝업의 삭제 확인이 "메모 N건도 함께 삭제됩니다"를 보여줘야 해서
// 목록에 메모 건수를 같이 실어 보낸다.
export async function listCategories(userId: string) {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      memoCount: sql<number>`count(${memos.id})::int`,
    })
    .from(categories)
    .leftJoin(memos, eq(memos.categoryId, categories.id))
    .where(eq(categories.userId, userId))
    .groupBy(categories.id, categories.name, categories.createdAt)
    .orderBy(asc(categories.createdAt));
}
