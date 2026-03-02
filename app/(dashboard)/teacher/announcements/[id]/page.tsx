export const dynamic = 'force-dynamic';
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTeacherProfile } from '@/lib/dal/teacher'
import { getAnnouncement } from '@/lib/dal/announcements'
import { format } from 'date-fns'

interface PageProps {
  params: Promise<{ id: string }>
}

function getPriorityStyle(priority: string) {
  switch (priority) {
    case 'urgent':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    case 'high':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
    case 'normal':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    case 'low':
    default:
      return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
  }
}

export default async function AnnouncementDetailPage({ params }: PageProps) {
  const teacherProfile = await getTeacherProfile()
  if (!teacherProfile) {
    notFound()
  }

  const { id } = await params
  const announcement = await getAnnouncement(id)

  if (!announcement) {
    notFound()
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/teacher/announcements"
          className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-primary transition-colors mb-4"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Back to Announcements
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {announcement.title}
            </h1>
            <div className="mt-2 flex items-center gap-3">
              <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getPriorityStyle(announcement.priority)}`}>
                {announcement.priority}
              </span>
              {announcement.is_published ? (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  Published
                </span>
              ) : (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                  Draft
                </span>
              )}
            </div>
          </div>

          {!announcement.is_published && (
            <Link
              href={`/teacher/announcements/${id}/edit`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">edit</span>
              Edit
            </Link>
          )}
        </div>
      </div>

      {/* Content Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
        <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Content</h2>
        <div className="prose dark:prose-invert max-w-none">
          <p className="whitespace-pre-wrap text-slate-700 dark:text-slate-300">
            {announcement.content}
          </p>
        </div>
      </div>

      {/* Details Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
        <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">Details</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Target Type</p>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">
              {announcement.target_type === 'school' ? 'All Students' : announcement.target_type}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Created</p>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {format(new Date(announcement.created_at), 'PPP p')}
            </p>
          </div>

          {announcement.published_at && (
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Published</p>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {format(new Date(announcement.published_at), 'PPP p')}
              </p>
            </div>
          )}

          {announcement.expires_at && (
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Expires</p>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {format(new Date(announcement.expires_at), 'PPP p')}
              </p>
            </div>
          )}

          {announcement.target_count !== undefined && (
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Target Audience</p>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {announcement.target_count} student{announcement.target_count !== 1 ? 's' : ''}
              </p>
            </div>
          )}

          {announcement.read_count !== undefined && announcement.is_published && (
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Read By</p>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {announcement.read_count} / {announcement.target_count || 0} students
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Attachments */}
      {announcement.attachments && announcement.attachments.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">Attachments</h2>
          <div className="flex flex-wrap gap-2">
            {announcement.attachments.map((attachment, index) => (
              <a
                key={index}
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <span className="material-symbols-outlined text-base">description</span>
                {attachment.name || `Attachment ${index + 1}`}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
