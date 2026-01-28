'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import GradebookTable from './GradebookTable'
import GradeWeightModal from './GradeWeightModal'
import BulkGradeModal from './BulkGradeModal'
import GradeReleaseModal from './GradeReleaseModal'
import type {
  GradingPeriod,
  GradebookAssessment,
  GradeWeightConfig,
  AssessmentScore,
} from '@/lib/dal/types/gradebook'

// Serialized row type (Map converted to object)
interface SerializedGradebookRow {
  student: {
    student_id: string
    student_name: string
    lrn?: string
    profile_id: string
  }
  assessmentScores: Record<string, AssessmentScore>
  courseGrade?: {
    numeric_grade?: number
    letter_grade?: string
  }
}

interface SerializedGradebookData {
  course_id: string
  course_name: string
  grading_period: GradingPeriod
  assessments: GradebookAssessment[]
  rows: SerializedGradebookRow[]
  weight_config: GradeWeightConfig[]
}

interface GradebookClientProps {
  gradebookData: SerializedGradebookData
  gradingPeriods: GradingPeriod[]
  currentPeriodId: string
  teacherId: string
}

export default function GradebookClient({
  gradebookData,
  gradingPeriods,
  currentPeriodId,
  teacherId,
}: GradebookClientProps) {
  const router = useRouter()
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false)
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [localRows, setLocalRows] = useState(gradebookData.rows)

  // Handle period change
  const handlePeriodChange = (periodId: string) => {
    router.push(`/teacher/gradebook/${gradebookData.course_id}?period=${periodId}`)
  }

  // Handle inline score update
  const handleScoreUpdate = useCallback(
    async (
      studentId: string,
      assessmentId: string,
      score: number | null
    ): Promise<boolean> => {
      setIsSaving(true)

      try {
        const response = await fetch('/api/teacher/gradebook/save-score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId,
            assessmentId,
            courseId: gradebookData.course_id,
            score,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to save score')
        }

        // Update local state
        setLocalRows((prev) =>
          prev.map((row) => {
            if (row.student.student_id === studentId) {
              const assessment = gradebookData.assessments.find(
                (a) => a.id === assessmentId
              )
              return {
                ...row,
                assessmentScores: {
                  ...row.assessmentScores,
                  [assessmentId]: {
                    score: score ?? undefined,
                    max_score: assessment?.total_points || 100,
                    status: score !== null ? 'graded' : 'not_submitted',
                  },
                },
              }
            }
            return row
          })
        )

        return true
      } catch (error) {
        console.error('Error saving score:', error)
        return false
      } finally {
        setIsSaving(false)
      }
    },
    [gradebookData.course_id, gradebookData.assessments]
  )

  // Handle weight configuration save
  const handleWeightsSave = async () => {
    router.refresh()
    setIsWeightModalOpen(false)
  }

  // Handle bulk grade entry
  const handleBulkSave = async () => {
    router.refresh()
    setIsBulkModalOpen(false)
  }

  // Handle grade release
  const handleGradeRelease = async () => {
    router.refresh()
    setIsReleaseModalOpen(false)
  }

  // Calculate class statistics
  const stats = calculateClassStats(localRows, gradebookData.assessments)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            {gradebookData.course_name}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {gradebookData.grading_period.name} - {gradebookData.grading_period.academic_year}
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Period Selector */}
          <select
            value={currentPeriodId}
            onChange={(e) => handlePeriodChange(e.target.value)}
            className="h-10 px-4 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {gradingPeriods.map((period) => (
              <option key={period.id} value={period.id}>
                {period.name} ({period.academic_year})
              </option>
            ))}
          </select>

          {/* Actions Dropdown */}
          <div className="relative group">
            <Button variant="outline" size="sm">
              <span className="material-symbols-outlined text-lg mr-2">
                more_vert
              </span>
              Actions
            </Button>
            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <button
                onClick={() => setIsWeightModalOpen(true)}
                className="w-full px-4 py-3 text-left text-sm text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">
                  tune
                </span>
                Configure Weights
              </button>
              <button
                onClick={() => setIsBulkModalOpen(true)}
                className="w-full px-4 py-3 text-left text-sm text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">
                  upload
                </span>
                Bulk Entry
              </button>
              <button
                onClick={() => setIsReleaseModalOpen(true)}
                className="w-full px-4 py-3 text-left text-sm text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 border-t border-slate-200 dark:border-slate-700"
              >
                <span className="material-symbols-outlined text-lg">
                  publish
                </span>
                Release Grades
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-blue-600 text-2xl">
                group
              </span>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {localRows.length}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Students
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-green-600 text-2xl">
                assignment
              </span>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {gradebookData.assessments.length}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Assessments
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-yellow-600 text-2xl">
                percent
              </span>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {stats.classAverage.toFixed(1)}%
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Class Average
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-purple-600 text-2xl">
                grading
              </span>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {stats.gradedPercentage.toFixed(0)}%
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Graded
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="grades">
        <TabsList>
          <TabsTrigger value="grades">
            <span className="material-symbols-outlined text-lg mr-2">
              table_chart
            </span>
            Grades
          </TabsTrigger>
          <TabsTrigger value="weights">
            <span className="material-symbols-outlined text-lg mr-2">
              tune
            </span>
            Weight Configuration
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <span className="material-symbols-outlined text-lg mr-2">
              analytics
            </span>
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="grades">
          <Card className="p-0 overflow-hidden">
            <GradebookTable
              rows={localRows}
              assessments={gradebookData.assessments}
              weightConfig={gradebookData.weight_config}
              onScoreUpdate={handleScoreUpdate}
              isSaving={isSaving}
            />
          </Card>
        </TabsContent>

        <TabsContent value="weights">
          <WeightConfigurationPanel
            courseId={gradebookData.course_id}
            periodId={currentPeriodId}
            weightConfig={gradebookData.weight_config}
            onSave={handleWeightsSave}
          />
        </TabsContent>

        <TabsContent value="analytics">
          <GradeAnalytics
            rows={localRows}
            assessments={gradebookData.assessments}
          />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <GradeWeightModal
        isOpen={isWeightModalOpen}
        onClose={() => setIsWeightModalOpen(false)}
        courseId={gradebookData.course_id}
        periodId={currentPeriodId}
        currentWeights={gradebookData.weight_config}
        onSave={handleWeightsSave}
      />

      <BulkGradeModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        courseId={gradebookData.course_id}
        assessments={gradebookData.assessments}
        students={localRows.map((r) => r.student)}
        onSave={handleBulkSave}
      />

      <GradeReleaseModal
        isOpen={isReleaseModalOpen}
        onClose={() => setIsReleaseModalOpen(false)}
        courseId={gradebookData.course_id}
        periodId={currentPeriodId}
        students={localRows.map((r) => r.student)}
        onRelease={handleGradeRelease}
      />
    </div>
  )
}

// Helper function to calculate class statistics
function calculateClassStats(
  rows: SerializedGradebookRow[],
  assessments: GradebookAssessment[]
) {
  let totalGraded = 0
  let totalPossible = rows.length * assessments.length
  let totalScore = 0
  let totalMaxScore = 0

  rows.forEach((row) => {
    assessments.forEach((assessment) => {
      const scoreData = row.assessmentScores[assessment.id]
      if (scoreData && scoreData.score !== undefined) {
        totalGraded++
        totalScore += scoreData.score
        totalMaxScore += scoreData.max_score
      }
    })
  })

  return {
    classAverage: totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0,
    gradedPercentage: totalPossible > 0 ? (totalGraded / totalPossible) * 100 : 0,
  }
}

// Weight Configuration Panel Component
function WeightConfigurationPanel({
  courseId,
  periodId,
  weightConfig,
  onSave,
}: {
  courseId: string
  periodId: string
  weightConfig: GradeWeightConfig[]
  onSave: () => void
}) {
  const assessmentTypes = [
    { type: 'quiz', label: 'Quizzes', icon: 'quiz' },
    { type: 'exam', label: 'Exams', icon: 'school' },
    { type: 'assignment', label: 'Assignments', icon: 'assignment' },
    { type: 'project', label: 'Projects', icon: 'folder' },
    { type: 'participation', label: 'Participation', icon: 'groups' },
    { type: 'midterm', label: 'Midterm', icon: 'event' },
    { type: 'final', label: 'Final', icon: 'flag' },
  ]

  const getWeight = (type: string) => {
    const config = weightConfig.find((w) => w.assessment_type === type)
    return config?.weight_percent || 0
  }

  const getDropLowest = (type: string) => {
    const config = weightConfig.find((w) => w.assessment_type === type)
    return config?.drop_lowest || 0
  }

  const totalWeight = weightConfig.reduce((sum, w) => sum + w.weight_percent, 0)

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Grade Weight Configuration
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Configure how different assessment types contribute to the final grade.
            </p>
          </div>
          <div
            className={`px-4 py-2 rounded-lg font-semibold ${
              Math.abs(totalWeight - 100) < 0.01
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
            }`}
          >
            Total: {totalWeight}%
          </div>
        </div>

        <div className="space-y-4">
          {assessmentTypes.map(({ type, label, icon }) => {
            const weight = getWeight(type)
            const dropLowest = getDropLowest(type)

            return (
              <div
                key={type}
                className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-primary">
                    {icon}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {label}
                  </div>
                  {dropLowest > 0 && (
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      Drop lowest {dropLowest} score{dropLowest > 1 ? 's' : ''}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${weight}%` }}
                    />
                  </div>
                  <span className="w-12 text-right font-semibold text-slate-900 dark:text-slate-100">
                    {weight}%
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
          <Button onClick={() => onSave()}>
            <span className="material-symbols-outlined text-lg mr-2">
              edit
            </span>
            Edit Weights
          </Button>
        </div>
      </Card>
    </div>
  )
}

// Grade Analytics Component
function GradeAnalytics({
  rows,
  assessments,
}: {
  rows: SerializedGradebookRow[]
  assessments: GradebookAssessment[]
}) {
  // Calculate grade distribution
  const gradeDistribution = {
    A: 0,
    B: 0,
    C: 0,
    D: 0,
    F: 0,
  }

  rows.forEach((row) => {
    if (row.courseGrade?.numeric_grade !== undefined) {
      const grade = row.courseGrade.numeric_grade
      if (grade >= 90) gradeDistribution.A++
      else if (grade >= 80) gradeDistribution.B++
      else if (grade >= 70) gradeDistribution.C++
      else if (grade >= 60) gradeDistribution.D++
      else gradeDistribution.F++
    }
  })

  // Calculate assessment averages
  const assessmentAverages = assessments.map((assessment) => {
    let total = 0
    let count = 0

    rows.forEach((row) => {
      const scoreData = row.assessmentScores[assessment.id]
      if (scoreData && scoreData.score !== undefined) {
        total += (scoreData.score / scoreData.max_score) * 100
        count++
      }
    })

    return {
      id: assessment.id,
      title: assessment.title,
      type: assessment.type,
      average: count > 0 ? total / count : 0,
      submissions: count,
      total: rows.length,
    }
  })

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Grade Distribution */}
      <Card>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Grade Distribution
        </h3>
        <div className="space-y-3">
          {Object.entries(gradeDistribution).map(([grade, count]) => {
            const percentage = rows.length > 0 ? (count / rows.length) * 100 : 0
            const colorClasses = {
              A: 'bg-green-500',
              B: 'bg-blue-500',
              C: 'bg-yellow-500',
              D: 'bg-orange-500',
              F: 'bg-red-500',
            }

            return (
              <div key={grade} className="flex items-center gap-4">
                <div className="w-8 font-bold text-slate-900 dark:text-slate-100">
                  {grade}
                </div>
                <div className="flex-1 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                  <div
                    className={`h-full ${colorClasses[grade as keyof typeof colorClasses]} transition-all`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="w-16 text-right text-sm text-slate-600 dark:text-slate-400">
                  {count} ({percentage.toFixed(0)}%)
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Assessment Performance */}
      <Card>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Assessment Performance
        </h3>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {assessmentAverages.map((assessment) => (
            <div
              key={assessment.id}
              className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                  {assessment.title}
                </div>
                <span className="text-sm text-slate-600 dark:text-slate-400 capitalize">
                  {assessment.type}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      assessment.average >= 70
                        ? 'bg-green-500'
                        : assessment.average >= 50
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${assessment.average}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 w-16 text-right">
                  {assessment.average.toFixed(1)}%
                </span>
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {assessment.submissions} of {assessment.total} graded
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
