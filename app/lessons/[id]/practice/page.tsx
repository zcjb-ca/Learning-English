import Link from "next/link";
import { notFound } from "next/navigation";
import { getLesson } from "@/lib/db";
import { Practice } from "@/components/Practice";

export const dynamic = "force-dynamic";

interface PracticePageProps {
  params: Promise<{ id: string }>;
}

export default async function PracticePage({ params }: PracticePageProps) {
  const { id } = await params;

  let lesson;
  try {
    lesson = await getLesson(id);
  } catch {
    lesson = null;
  }
  if (!lesson) notFound();

  return (
    <main className="mx-auto max-w-2xl space-y-5 px-5 py-6 safe-bottom">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-sm text-slate-500">
          ← 课程列表
        </Link>
        <Link href="/review" className="text-sm font-medium text-indigo-600">
          错题复习
        </Link>
      </header>
      <h1 className="text-xl font-semibold text-slate-900">{lesson.title}</h1>
      <Practice lesson={lesson} />
    </main>
  );
}
