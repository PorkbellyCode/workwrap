import { redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
// 지역 변수 categories(탭 목록)와 이름이 겹쳐 테이블은 별칭으로 가져온다.
import {
  categories as categoryTable,
  memos,
  users,
} from "@/lib/db/schema";
import { listCategories } from "@/lib/db/categories";
import { todaySeoul } from "@/lib/date";
import TopNav from "@/components/top-nav";
import { InstallPrompt } from "@/components/install-prompt";
import CategoryTabs from "./category-tabs";
import MemoTimeline from "./memo-timeline";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export default async function DashboardPage({
  searchParams,
}: PageProps<"/dashboard">) {
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
  // 날짜를 지정하지 않은 첫 진입에서만 서버가 '오늘'을 정한다.
  // 이후에는 화면에서 고른 날짜가 URL에 남아 그대로 쓰인다.
  const date =
    typeof rawDate === "string" && DATE_PATTERN.test(rawDate)
      ? rawDate
      : todaySeoul();

  const categories = await listCategories(userId);

  const rawCategory = params.category;
  // '전체' 탭이 없으므로 항상 카테고리 하나를 보고 있다.
  // 지정하지 않았거나 없는 카테고리를 가리키면(삭제된 뒤 링크로 들어온 경우)
  // 첫 번째 카테고리로 떨어뜨린다. 카테고리는 최소 1개가 보장된다.
  const selectedCategoryId =
    typeof rawCategory === "string" &&
    categories.some((category) => category.id === rawCategory)
      ? rawCategory
      : categories[0].id;

  const [selectedCategory] = await db
    .select({ context: categoryTable.context })
    .from(categoryTable)
    .where(eq(categoryTable.id, selectedCategoryId))
    .limit(1);

  const rows = await db
    .select({
      id: memos.id,
      categoryId: memos.categoryId,
      logDate: memos.logDate,
      text: memos.text,
      audioUrl: memos.audioUrl,
      createdAt: memos.createdAt,
    })
    .from(memos)
    .where(
      and(
        eq(memos.userId, userId),
        eq(memos.logDate, date),
        eq(memos.categoryId, selectedCategoryId)
      )
    )
    .orderBy(asc(memos.createdAt));

  const initialMemos = rows.map((memo) => ({
    ...memo,
    createdAt: memo.createdAt.toISOString(),
  }));

  return (
    // 화면 높이에 맞춘 앱 셸. 메모가 몇 개든 입력창과 녹음 버튼이 같은 자리에 있고,
    // 늘어나는 건 가운데 메모 목록뿐이다. dvh라 모바일 브라우저 주소창 높이 변화도 따라간다.
    // w-full이 없으면 이 div는 폭이 "내용에 맞춤"이 된다 — body가 flex 컨테이너인데
    // mx-auto가 교차축 stretch를 꺼버리기 때문이다. 그 상태에서 입력창의
    // field-sizing:content가 글자 수에 따라 max-content 폭을 키우면
    // 페이지 전체(네비·탭·카드) 폭이 같이 흔들린다.
    <div className="mx-auto flex h-dvh w-full max-w-xl flex-col gap-4 px-6 py-6">
      {/* flex-1인 카드가 남는 높이를 가져가려면 위아래 고정 영역이 줄어들지 않아야 한다. */}
      <div className="flex shrink-0 flex-col gap-4">
        <InstallPrompt />

        <TopNav current="dashboard" />

        <CategoryTabs
          categories={categories}
          selectedId={selectedCategoryId}
          date={date}
        />
      </div>

      {/* 날짜나 카테고리가 바뀌면 서버가 새 목록을 내려주므로 key로 다시 마운트해
          클라이언트 state(작성 중 텍스트, 편집 상태)를 초기화한다. */}
      <MemoTimeline
        key={`${date}:${selectedCategoryId}`}
        date={date}
        categoryId={selectedCategoryId}
        initialMemos={initialMemos}
        // 컨텍스트 편집은 요약 화면에 있다. 여기서 요약을 만드는 사람이 그 존재를
        // 영영 모르지 않도록, 비어 있을 때만 시트에서 안내한다.
        hasContext={Boolean(me.context || selectedCategory.context)}
      />
    </div>
  );
}
