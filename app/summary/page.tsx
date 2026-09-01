import { redirect } from "next/navigation";
import { and, asc, eq, isNull } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
// 지역 변수 categories(탭 목록)와 이름이 겹쳐 테이블은 별칭으로 가져온다.
import {
  categories as categoryTable,
  summaries,
  users,
} from "@/lib/db/schema";
import { listCategories } from "@/lib/db/categories";
import { todaySeoul } from "@/lib/date";
import TopNav from "@/components/top-nav";
import CategoryTabs from "../dashboard/category-tabs";
import SummaryView from "./summary-view";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export default async function SummaryPage({
  searchParams,
}: PageProps<"/summary">) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = session.user.id;

  const [me] = await db
    .select({ status: users.status, context: users.context })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (me?.status !== "active") {
    redirect("/pending");
  }

  const params = await searchParams;
  const rawDate = params.date;
  const date =
    typeof rawDate === "string" && DATE_PATTERN.test(rawDate)
      ? rawDate
      : todaySeoul();

  const categories = await listCategories(userId);

  const rawCategory = params.category;
  // 대시보드와 마찬가지로 '전체' 요약은 없다 — 항상 카테고리 하나를 본다.
  // 지정하지 않았거나 없는 카테고리를 가리키면 첫 번째 카테고리로 떨어뜨린다.
  const selectedCategoryId =
    typeof rawCategory === "string" &&
    categories.some((category) => category.id === rawCategory)
      ? rawCategory
      : categories[0].id;

  // 탭 목록(listCategories)은 이름과 메모 건수만 싣는다 — 컨텍스트까지 넣으면
  // 대시보드 탭에도 쓰이는 타입이라 안 쓰는 본문이 클라이언트로 따라간다.
  const [selectedCategory] = await db
    .select({ name: categoryTable.name, context: categoryTable.context })
    .from(categoryTable)
    .where(eq(categoryTable.id, selectedCategoryId))
    .limit(1);

  const summaryRows = await db
    .select({
      id: summaries.id,
      version: summaries.version,
      content: summaries.content,
      // 그 버전이 어떤 메모로 만들어졌는지. 시트로 만든 버전은 부분집합이라
      // 번호만으로는 같은 목록의 다른 버전과 구분되지 않는다.
      memoIds: summaries.memoIds,
      createdAt: summaries.createdAt,
    })
    .from(summaries)
    .where(
      and(
        eq(summaries.userId, userId),
        eq(summaries.categoryId, selectedCategoryId),
        eq(summaries.dateFrom, date),
        eq(summaries.dateTo, date),
        eq(summaries.format, "default"),
        // 소프트 삭제된 버전은 화면에서 감춘다. 행 자체는 quota 집계용으로 남아 있다.
        isNull(summaries.deletedAt)
      )
    )
    .orderBy(asc(summaries.version));

  const initialSummaries = summaryRows.map((summary) => ({
    ...summary,
    createdAt: summary.createdAt.toISOString(),
  }));

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-4 px-6 py-6">
      <TopNav current="summary" />

      {/* 탑메뉴로 바로 들어오면 첫 카테고리에 떨어지므로, 여기서도 탭으로
          카테고리를 옮겨 볼 수 있어야 히스토리를 찾을 수 있다. */}
      <CategoryTabs
        categories={categories}
        selectedId={selectedCategoryId}
        date={date}
        basePath="/summary"
      />

      <SummaryView
        date={date}
        categoryId={selectedCategoryId}
        categoryName={selectedCategory.name}
        initialSummaries={initialSummaries}
        userContext={me.context ?? ""}
        categoryContext={selectedCategory.context ?? ""}
      />
    </div>
  );
}
