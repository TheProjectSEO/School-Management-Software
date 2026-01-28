import Link from "next/link";
import { getCurrentStudent, getStudentSubjects } from "@/lib/dal";
import { redirect } from "next/navigation";

export const revalidate = 180; // 3 minutes - enrollment list

export default async function SubjectsPage() {
  const student = await getCurrentStudent();

  if (!student) {
    redirect("/login");
  }

  const enrollments = await getStudentSubjects(student.id);

  // Map enrollments to subjects with calculated data
  const subjects = enrollments.map((enrollment) => {
    const course = enrollment.course;
    return {
      id: course?.id || enrollment.course_id,
      name: course?.name || "Unknown Course",
      category: course?.subject_code || "General",
      progress: enrollment.progress_percent || 0,
      nextModule: "Continue Learning",
      hasLiveClass: false,
      pendingAssignments: 0,
      image: getGradientForIndex(enrollments.indexOf(enrollment)),
    };
  });

  return (
    <>
      {/* Header */}
      <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
        <div>
          <h1 className="text-slate-900 dark:text-white text-3xl md:text-4xl font-bold leading-tight tracking-tight">
            My Subjects
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-base mt-2">
            Track your progress, join live classes, and manage pending work.
          </p>
        </div>
        <button className="size-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-primary hover:border-primary transition-colors shadow-sm relative">
          <span className="material-symbols-outlined text-[22px]">notifications</span>
          <span className="absolute top-2 right-2 size-2 bg-msu-gold rounded-full border border-white dark:border-slate-800"></span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-white dark:bg-slate-900 p-2 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 mb-8">
        <div className="relative w-full md:w-96 group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-slate-400">search</span>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2.5 border-none rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary/20 text-sm font-medium"
            placeholder="Search subjects, modules..."
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
          <button className="flex shrink-0 items-center justify-center gap-x-2 rounded-lg bg-primary text-white px-4 py-2 hover:bg-[#5a0c0e] transition-colors shadow-sm">
            <span className="text-sm font-medium">In Progress</span>
          </button>
          <button className="flex shrink-0 items-center justify-center gap-x-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <span className="text-sm font-medium">Completed</span>
          </button>
          <button className="flex shrink-0 items-center justify-center gap-x-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <span className="text-sm font-medium">Upcoming</span>
          </button>
        </div>
      </div>

      {/* Subject Cards */}
      {subjects.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4">
            school
          </span>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            No Subjects Yet
          </h3>
          <p className="text-slate-500 dark:text-slate-400">
            You are not enrolled in any subjects. Contact your administrator.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          {subjects.map((subject) => (
            <div
              key={subject.id}
              className="group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300 flex flex-col"
            >
              {/* Subject Image */}
              <div className={`h-40 ${subject.image} relative`}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                <div className="absolute bottom-4 left-4 text-white pr-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-msu-gold mb-1">
                    {subject.category}
                  </p>
                  <h3 className="text-xl font-bold leading-tight">{subject.name}</h3>
                </div>
              </div>

              {/* Subject Info */}
              <div className="p-5 flex flex-col gap-4 flex-1">
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                    <span>Course Progress</span>
                    <span className="text-primary font-bold">{subject.progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-[#5a0c0e] rounded-full"
                      style={{ width: `${subject.progress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Next:{" "}
                    <span className="text-slate-800 dark:text-slate-200 font-semibold">
                      {subject.nextModule}
                    </span>
                  </p>
                </div>

                {/* Status Cards */}
                <div className="flex flex-col gap-2 mt-auto">
                  {subject.hasLiveClass && (
                    <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200 bg-red-50 dark:bg-red-900/10 p-2.5 rounded-lg border border-red-100 dark:border-red-900/20">
                      <div className="size-8 rounded-md bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[18px]">videocam</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-red-600/80 font-bold uppercase">Live Class</span>
                        <span className="font-medium text-xs">Available</span>
                      </div>
                    </div>
                  )}

                  {subject.progress >= 100 ? (
                    <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300 p-2">
                      <span className="material-symbols-outlined text-msu-green text-[20px]">
                        check_circle
                      </span>
                      <span className="text-xs font-medium">Course Completed</span>
                    </div>
                  ) : subject.progress > 0 ? (
                    <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300 p-2">
                      <span className="material-symbols-outlined text-msu-gold text-[20px]">
                        trending_up
                      </span>
                      <span className="text-xs font-medium">In Progress</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300 p-2">
                      <span className="material-symbols-outlined text-slate-400 text-[20px]">
                        play_circle
                      </span>
                      <span className="text-xs font-medium">Not Started</span>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <Link
                  href={`/subjects/${subject.id}`}
                  className="w-full py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-[#5a0c0e] transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>{subject.progress > 0 ? "Continue Module" : "Start Learning"}</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Explore Section */}
      <div className="pt-8 border-t border-slate-200 dark:border-slate-800">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Explore New Topics</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Discover additional learning resources.
            </p>
          </div>
          <button
            disabled
            className="text-slate-400 cursor-not-allowed font-bold text-sm flex items-center gap-1"
            title="Coming soon"
          >
            View all catalog
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: "Intro to Python", icon: "code", desc: "Learn the basics of programming with Python." },
            { name: "Psychology 101", icon: "psychology", desc: "Understanding human behavior and mental processes." },
            { name: "Digital Art Basics", icon: "brush", desc: "Start your journey in digital illustration." },
          ].map((demo, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:border-primary transition-all cursor-pointer group hover:shadow-md"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="size-10 rounded-lg bg-msu-green/10 flex items-center justify-center text-msu-green">
                  <span className="material-symbols-outlined">{demo.icon}</span>
                </div>
                <span className="px-2 py-1 rounded text-[10px] font-bold bg-msu-gold/20 text-yellow-700 dark:text-yellow-400 uppercase tracking-wide">
                  Free Demo
                </span>
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-2 text-lg">{demo.name}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-2 leading-relaxed">
                {demo.desc}
              </p>
              <button className="w-full py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-white font-semibold group-hover:bg-primary group-hover:text-white transition-all">
                Try Now
              </button>
            </div>
          ))}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4 hover:border-primary/50 hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer group flex flex-col justify-center items-center text-center">
            <div className="size-14 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center text-slate-400 mb-3 group-hover:text-primary group-hover:scale-110 transition-all shadow-sm">
              <span className="material-symbols-outlined text-2xl">add</span>
            </div>
            <h4 className="font-bold text-slate-900 dark:text-white text-base">View Full Catalog</h4>
            <p className="text-[11px] text-slate-500 mt-1">More Subjects available</p>
          </div>
        </div>
      </div>
    </>
  );
}

// Helper function to get gradient colors for subjects
function getGradientForIndex(index: number): string {
  const gradients = [
    "bg-gradient-to-br from-blue-500 to-indigo-600",
    "bg-gradient-to-br from-purple-500 to-pink-600",
    "bg-gradient-to-br from-amber-500 to-orange-600",
    "bg-gradient-to-br from-emerald-500 to-teal-600",
    "bg-gradient-to-br from-rose-500 to-red-600",
    "bg-gradient-to-br from-cyan-500 to-blue-600",
  ];
  return gradients[index % gradients.length];
}
