import Link from "next/link";
import { listMistakes } from "@/lib/db";
import type { MistakeRow } from "@/lib/types";
import { ReviewItem } from "@/components/ReviewItem";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  let mistakes: MistakeRow[] = [];
  let failed = false;
  try {
    mistakes = await listMistakes(50);
  } catch {
    failed = true;
  }

  return (
    <main className="mx-auto max-w-2xl space-y-5 px-5 py-8 safe-bottom">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-sm text-slate-500">
          ← 课程列表
        </Link>
        <h1 className="text-lg font-semibold text-slate-900">错题复习</h1>
      </header>

      {failed ? (
        <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-700">
          暂时读不到记录，请回首页确认数据库已初始化。
        </p>
      ) : mistakes.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          还没有错题。先去练几句，需要再调整的句子会自动收进来。
        </p>
      ) : (
        <ul className="space-y-3">
          {mistakes.map((m) => (
            <ReviewItem key={m.id} mistake={m} />
          ))}
        </ul>
      )}
    </main>
  );
}
