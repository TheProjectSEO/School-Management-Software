import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getTeacherProfile, getModulesForCourse } from '@/lib/dal/teacher'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ModulesTab from '@/components/teacher/ModulesTab'

export const metadata = {
  title: 'Subject Workspace | MSU Teacher Portal',
  description: 'Manage modules, assessments, question banks, and rubrics'
}

interface PageProps {
  params: {
    subjectId: string
  }
}

async function SubjectWorkspaceContent({ subjectId }: { subjectId: string }) {
  const teacherProfile = await getTeacherProfile()

  if (!teacherProfile) {
    redirect('/teacher/login')
  }

  const modules = await getModulesForCourse(subjectId, teacherProfile.id)

  return (
    <Tabs defaultValue="modules">
      <TabsList>
        <TabsTrigger value="modules">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">article</span>
            <span>Modules</span>
          </div>
        </TabsTrigger>
        <TabsTrigger value="assessments">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">assignment</span>
            <span>Assessments</span>
          </div>
        </TabsTrigger>
        <TabsTrigger value="question-banks">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">quiz</span>
            <span>Question Banks</span>
          </div>
        </TabsTrigger>
        <TabsTrigger value="rubrics">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">rule</span>
            <span>Rubrics</span>
          </div>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="modules">
        <ModulesTab modules={modules} subjectId={subjectId} />
      </TabsContent>

      <TabsContent value="assessments">
        <EmptyState
          icon="assignment"
          title="Assessments"
          description="Manage quizzes, assignments, and exams for this subject."
        />
      </TabsContent>

      <TabsContent value="question-banks">
        <EmptyState
          icon="quiz"
          title="Question Banks"
          description="Create and manage reusable question banks for assessments."
        />
      </TabsContent>

      <TabsContent value="rubrics">
        <EmptyState
          icon="rule"
          title="Rubrics"
          description="Create and manage grading rubrics for assessments."
        />
      </TabsContent>
    </Tabs>
  )
}

export default function SubjectWorkspacePage({ params }: PageProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Subject Workspace
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage all content and materials for this subject
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline">
            <span className="material-symbols-outlined text-lg">settings</span>
            Settings
          </Button>
          <Button>
            <span className="material-symbols-outlined text-lg">publish</span>
            Publish Changes
          </Button>
        </div>
      </div>

      {/* Content */}
      <Suspense fallback={<LoadingSpinner />}>
        <SubjectWorkspaceContent subjectId={params.subjectId} />
      </Suspense>
    </div>
  )
}
