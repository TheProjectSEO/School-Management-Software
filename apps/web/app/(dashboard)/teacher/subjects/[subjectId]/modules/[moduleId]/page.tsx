import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getCurrentUser } from '@/lib/auth/session'
import { getModule } from '@/lib/dal/teacher'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ModuleEditor from '@/components/teacher/teacher/ModuleEditor'

export const metadata = {
  title: 'Module Editor | Teacher Portal',
  description: 'Edit module content, lessons, and materials'
}

interface PageProps {
  params: Promise<{
    subjectId: string
    moduleId: string
  }>
}

async function ModuleEditorContent({ subjectId, moduleId }: { subjectId: string; moduleId: string }) {
  const user = await getCurrentUser()

  if (!user || user.role !== 'teacher') {
    redirect('/login')
  }

  const moduleData = await getModule(moduleId, user.profile_id)

  if (!moduleData) {
    redirect(`/teacher/subjects/${subjectId}`)
  }

  return <ModuleEditor module={moduleData} subjectId={subjectId} />
}

export default async function ModuleEditorPage({ params }: PageProps) {
  const { subjectId, moduleId } = await params

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    }>
      <ModuleEditorContent subjectId={subjectId} moduleId={moduleId} />
    </Suspense>
  )
}
