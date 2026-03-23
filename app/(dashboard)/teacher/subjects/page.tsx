export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getTeacherProfile, getTeacherSubjects } from '@/lib/dal/teacher';
import { getSubjectsPageStats } from '@/lib/dal/dashboard';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Suspense } from 'react';
import { SubjectSortFilter } from './SubjectSortFilter';

export const metadata = {
  title: 'My Subjects | MSU Teacher Portal',
  description: 'Manage your subjects and course content',
};

type SubjectsPageData = {
  subjects: Awaited<ReturnType<typeof getTeacherSubjects>>;
  stats: {
    totalSubjects: number;
    totalModules: number;
    publishedModules: number;
    draftModules: number;
  };
};

const SUBJECT_THEMES: { keywords: string[]; icon: string; gradient: string }[] = [
  { keywords: ['math', 'calculus', 'algebra', 'geometry', 'statistics', 'trigonometry'], icon: 'calculate', gradient: 'from-blue-500 to-blue-700' },
  { keywords: ['english', 'literature', 'writing', 'reading', 'language arts'], icon: 'menu_book', gradient: 'from-purple-500 to-purple-700' },
  { keywords: ['science', 'biology', 'chemistry', 'physics', 'earth'], icon: 'science', gradient: 'from-emerald-500 to-emerald-700' },
  { keywords: ['history', 'social', 'economics', 'political', 'civics', 'araling panlipunan'], icon: 'public', gradient: 'from-amber-500 to-amber-700' },
  { keywords: ['pe', 'physical', 'health', 'mapeh', 'sports'], icon: 'fitness_center', gradient: 'from-rose-500 to-rose-700' },
  { keywords: ['computer', 'ict', 'tech', 'code', 'programming', 'tle'], icon: 'terminal', gradient: 'from-cyan-500 to-cyan-700' },
  { keywords: ['art', 'music', 'creative', 'drawing'], icon: 'palette', gradient: 'from-pink-500 to-pink-700' },
  { keywords: ['filipino', 'tagalog', 'edukasyon sa pagpapakatao', 'esp'], icon: 'translate', gradient: 'from-orange-500 to-orange-700' },
];

const FALLBACK_THEMES = [
  { icon: 'book_2', gradient: 'from-[#7B1113] to-[#9B1315]' },
  { icon: 'book_2', gradient: 'from-blue-600 to-blue-800' },
  { icon: 'book_2', gradient: 'from-emerald-600 to-emerald-800' },
  { icon: 'book_2', gradient: 'from-amber-600 to-amber-800' },
  { icon: 'book_2', gradient: 'from-purple-600 to-purple-800' },
  { icon: 'book_2', gradient: 'from-cyan-600 to-cyan-800' },
];

function getSubjectTheme(name: string, index: number) {
  const lower = name.toLowerCase();
  for (const theme of SUBJECT_THEMES) {
    if (theme.keywords.some((kw) => lower.includes(kw))) return theme;
  }
  return FALLBACK_THEMES[index % FALLBACK_THEMES.length];
}

async function getSubjectsPageData(): Promise<SubjectsPageData | null> {
  const teacherProfile = await getTeacherProfile();
  if (!teacherProfile) return null;

  const [subjects, stats] = await Promise.all([
    getTeacherSubjects(teacherProfile.id),
    getSubjectsPageStats(teacherProfile.id),
  ]);

  return { subjects, stats };
}

async function SubjectsContent({ sort, grade }: { sort: string; grade: string }) {
  const data = await getSubjectsPageData();
  if (!data) redirect('/login');

  let { subjects } = data;

  if (grade && grade !== 'all') {
    subjects = subjects.filter((s) => s.grade_level === grade);
  }

  switch (sort) {
    case 'name-desc':
      subjects = [...subjects].sort((a, b) => b.name.localeCompare(a.name));
      break;
    case 'students-desc':
      subjects = [...subjects].sort((a, b) => b.student_count - a.student_count);
      break;
    case 'modules-desc':
      subjects = [...subjects].sort((a, b) => b.module_count - a.module_count);
      break;
    case 'name-asc':
    default:
      subjects = [...subjects].sort((a, b) => a.name.localeCompare(b.name));
      break;
  }

  if (subjects.length === 0) {
    return (
      <EmptyState
        icon="book_2"
        title="No subjects found"
        description={
          grade && grade !== 'all'
            ? `No subjects found for Grade ${grade}. Try a different filter.`
            : "You don't have any subjects assigned yet. Contact your administrator to get assigned to courses."
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {subjects.map((subject, index) => {
        const subjectTheme = getSubjectTheme(subject.name, index);
        return (
          <Link key={subject.id} href={`/teacher/subjects/${subject.id}`} className="group block">
            <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full">

              {/* ── Flashcard Top (colored) ── */}
              <div className={`relative bg-gradient-to-br ${subjectTheme.gradient} px-5 pt-6 pb-8 flex flex-col items-center text-center`}>
                {/* Grade badge */}
                <span className="absolute top-3 right-3 px-2.5 py-0.5 bg-white/20 text-white text-[10px] font-bold uppercase tracking-wide rounded-full">
                  Grade {subject.grade_level}
                </span>

                {/* Icon */}
                <div className="size-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 shadow-inner">
                  <span className="material-symbols-outlined text-white text-4xl">
                    {subjectTheme.icon}
                  </span>
                </div>

                {/* Name */}
                <h3 className="text-white font-bold text-lg leading-tight line-clamp-2 drop-shadow-sm">
                  {subject.name}
                </h3>
                {subject.subject_code && (
                  <p className="text-white/60 text-xs mt-1">{subject.subject_code}</p>
                )}
              </div>

              {/* ── Flashcard Bottom (white) ── */}
              <div className="flex flex-col flex-1 px-5 pt-4 pb-5 -mt-3 bg-white dark:bg-slate-800 rounded-t-2xl relative z-10">
                {/* Section info */}
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-4">
                  <span className="material-symbols-outlined text-base">groups</span>
                  <span className="truncate">{subject.section_name}</span>
                </div>

                {/* Description */}
                {subject.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
                    {subject.description}
                  </p>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="flex flex-col items-center py-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                    <span className="text-2xl font-bold text-primary">{subject.module_count}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Modules</span>
                  </div>
                  <div className="flex flex-col items-center py-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                    <span className="text-2xl font-bold text-primary">{subject.student_count}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Students</span>
                  </div>
                </div>

                {/* Action row */}
                <div className="mt-auto flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 group-hover:text-primary transition-colors">
                    Manage Subject
                  </span>
                  <span className="material-symbols-outlined text-slate-400 group-hover:translate-x-1 group-hover:text-primary transition-all text-[20px]">
                    arrow_forward
                  </span>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

async function QuickStats() {
  const data = await getSubjectsPageData();
  if (!data) return null;

  const { stats } = data;

  const statItems = [
    { label: 'Total Subjects', value: stats.totalSubjects, icon: 'book_2', color: 'from-[#7B1113]/10 to-[#7B1113]/5', iconBg: 'bg-[#7B1113]/20', iconColor: 'text-[#7B1113]' },
    { label: 'Total Modules', value: stats.totalModules, icon: 'article', color: 'from-blue-500/10 to-blue-500/5', iconBg: 'bg-blue-500/20', iconColor: 'text-blue-600' },
    { label: 'Published', value: stats.publishedModules, icon: 'check_circle', color: 'from-green-500/10 to-green-500/5', iconBg: 'bg-green-500/20', iconColor: 'text-green-600' },
    { label: 'Drafts', value: stats.draftModules, icon: 'edit', color: 'from-yellow-500/10 to-yellow-500/5', iconBg: 'bg-yellow-500/20', iconColor: 'text-yellow-600' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statItems.map((item) => (
        <div key={item.label} className={`bg-gradient-to-br ${item.color} rounded-xl p-4 border border-slate-200 dark:border-slate-700`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${item.iconBg} flex items-center justify-center shrink-0`}>
              <span className={`material-symbols-outlined ${item.iconColor} text-xl`}>{item.icon}</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{item.value}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{item.label}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function SubjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; grade?: string }>;
}) {
  const { sort = 'name-asc', grade = 'all' } = await searchParams;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
            My Subjects
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base">
            Manage your subjects and course content
          </p>
        </div>
        <SubjectSortFilter />
      </div>

      {/* Quick Stats */}
      <Suspense fallback={<LoadingSpinner />}>
        <QuickStats />
      </Suspense>

      {/* Flashcard Grid */}
      <Suspense fallback={<LoadingSpinner />}>
        <SubjectsContent sort={sort} grade={grade} />
      </Suspense>
    </div>
  );
}
