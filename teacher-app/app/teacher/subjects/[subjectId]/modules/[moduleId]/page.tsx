import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getTeacherProfile, getModule } from '@/lib/dal/teacher'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ModuleEditor from '@/components/teacher/ModuleEditor'

export const metadata = {
  title: 'Module Editor | MSU Teacher Portal',
  description: 'Edit module content, lessons, and materials'
}

interface PageProps {
  params: {
    subjectId: string
    moduleId: string
  }
}

async function ModuleEditorContent({ subjectId, moduleId }: { subjectId: string; moduleId: string }) {
  const teacherProfile = await getTeacherProfile()

  if (!teacherProfile) {
    redirect('/teacher/login')
  }

  const moduleData = await getModule(moduleId, teacherProfile.id)

  if (!moduleData) {
    redirect(`/teacher/subjects/${subjectId}`)
  }

  return <ModuleEditor module={moduleData} subjectId={subjectId} />
}

export default function ModuleEditorPage({ params }: PageProps) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ModuleEditorContent subjectId={params.subjectId} moduleId={params.moduleId} />
    </Suspense>
  )
}
