import Link from "next/link";
import { listLessons } from "@/lib/db";
import type { LessonSummary } from "@/lib/types";
import { UploadForm } from "@/components/UploadForm";
import { LogoutButton } from "@/components/LogoutButton";
import { InitButton } from "@/components/InitButton";

// Reads the DB and depends on the session cookie, so never prerender it.
export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
}

export default async function HomePage() {
  let lessons: LessonSummary[] | null = null;
  try {
    lessons = await listLessons();
  } catch {
    lessons = null; // tables not created yet, or DB unreachable
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-5 py-8 safe-bottom">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">英语口语训练</h1>
          <p className="text-sm text-slate-500">五步法 · 地道度 + 语法双反馈</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/review" className="text-sm font-medium text-indigo-600">
            错题复习
          </Link>
          <LogoutButton />
        </div>
      </header>

      {lessons === null ? (
        <section className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="font-medium text-amber-800">第一次使用，先初始化数据库</h2>
          <p className="text-sm text-amber-700">
            点一下下面的按钮，创建保存课程和练习记录所需的数据表。只需做这一次。
          </p>
          <InitButton />
        </section>
      ) : (
        <>
          <UploadForm />

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              我的课程
            </h2>
            {lessons.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
                还没有课程。上传一个 PDF，几十秒后就能开始练。
              </p>
            ) : (
              <ul className="space-y-2">
                {lessons.map((lesson) => (
                  <li key={lesson.id}>
                    <Link
                      href={`/lessons/${lesson.id}/practice`}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 active:bg-slate-50"
                    >
                      <span className="font-medium text-slate-900">{lesson.title}</span>
                      <span className="text-xs text-slate-400">
                        {formatDate(lesson.created_at)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
