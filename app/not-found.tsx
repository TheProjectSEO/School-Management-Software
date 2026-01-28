import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="text-center px-4">
        <h1 className="text-6xl font-bold text-primary dark:text-msu-gold mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">
          Page Not Found
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          <span className="material-symbols-outlined">home</span>
          Go Home
        </Link>
      </div>
    </div>
  );
}
