export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { getTeacherProfile } from '@/lib/dal/teacher'
import { getTeacherAnnouncements, getTargetableSections } from '@/lib/dal/announcements'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import AnnouncementForm from './AnnouncementForm'

export const metadata = {
  title: 'Announcements | MSU Teacher Portal',
  description: 'Create and manage announcements for your students'
}

interface PageProps {
  searchParams: Promise<{ sectionId?: string }>
}

async function AnnouncementsContent({ sectionId }: { sectionId?: string }) {
  const teacherProfile = await getTeacherProfile()

  if (!teacherProfile) {
    redirect('/login')
  }

  const [announcements, sections] = await Promise.all([
    getTeacherAnnouncements({ limit: 20 }),
    getTargetableSections()
  ])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
      case 'normal': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'low': return 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400'
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400'
    }
  }

  // Find the pre-selected section if sectionId is provided
  const preSelectedSection = sectionId
    ? sections.find(s => s.id === sectionId)
    : undefined

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Announcements
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {preSelectedSection
              ? `Create announcement for ${preSelectedSection.name}`
              : 'Create and manage announcements for your students'
            }
          </p>
        </div>
        {preSelectedSection && (
          <Link
            href={`/teacher/classes/${sectionId}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium transition-colors"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            Back to Section
          </Link>
        )}
      </div>

      {/* Create Announcement Form */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary">campaign</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              New Announcement
            </h2>
            <p className="text-sm text-slate-500">
              Send a message to your students
            </p>
          </div>
        </div>

        <AnnouncementForm
          sections={sections}
          preSelectedSectionId={sectionId}
        />
      </Card>

      {/* Announcements List */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Recent Announcements
          </h2>
          <Badge variant="info">{announcements.length} announcements</Badge>
        </div>

        {announcements.length === 0 ? (
          <EmptyState
            icon="campaign"
            title="No announcements yet"
            description="Create your first announcement to communicate with your students."
          />
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className="p-4 rounded-lg border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {announcement.title}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getPriorityColor(announcement.priority)}`}>
                        {announcement.priority}
                      </span>
                      {announcement.is_published ? (
                        <Badge variant="success">Published</Badge>
                      ) : (
                        <Badge variant="warning">Draft</Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                      {announcement.content}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">schedule</span>
                        {formatDate(announcement.created_at)}
                      </span>
                      {announcement.target_count !== undefined && (
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">group</span>
                          {announcement.target_count} students
                        </span>
                      )}
                      {announcement.read_count !== undefined && announcement.target_count !== undefined && (
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">visibility</span>
                          {announcement.read_count}/{announcement.target_count} read
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!announcement.is_published && (
                      <Link
                        href={`/teacher/announcements/${announcement.id}/edit`}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                      >
                        <span className="material-symbols-outlined">edit</span>
                      </Link>
                    )}
                    <Link
                      href={`/teacher/announcements/${announcement.id}`}
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                    >
                      <span className="material-symbols-outlined">visibility</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

export default async function AnnouncementsPage({ searchParams }: PageProps) {
  const { sectionId } = await searchParams

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AnnouncementsContent sectionId={sectionId} />
    </Suspense>
  )
}
