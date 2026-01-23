'use client'

import { useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import GradebookCell from './GradebookCell'
import type {
  GradebookAssessment,
  GradeWeightConfig,
  AssessmentScore,
} from '@/lib/dal/types/gradebook'

interface GradebookStudent {
  student_id: string
  student_name: string
  lrn?: string
  profile_id: string
}

interface SerializedGradebookRow {
  student: GradebookStudent
  assessmentScores: Record<string, AssessmentScore>
  courseGrade?: {
    numeric_grade?: number
    letter_grade?: string
  }
}

interface GradebookTableProps {
  rows: SerializedGradebookRow[]
  assessments: GradebookAssessment[]
  weightConfig: GradeWeightConfig[]
  onScoreUpdate: (
    studentId: string,
    assessmentId: string,
    score: number | null
  ) => Promise<boolean>
  isSaving: boolean
}

export default function GradebookTable({
  rows,
  assessments,
  weightConfig,
  onScoreUpdate,
  isSaving,
}: GradebookTableProps) {
  const router = useRouter()
  const tableRef = useRef<HTMLDivElement>(null)

  // Group assessments by type
  const groupedAssessments = useMemo(() => {
    const groups: Record<string, GradebookAssessment[]> = {}
    assessments.forEach((assessment) => {
      if (!groups[assessment.type]) {
        groups[assessment.type] = []
      }
      groups[assessment.type].push(assessment)
    })
    return groups
  }, [assessments])

  // Calculate weighted average for each student
  const calculateWeightedAverage = (
    studentScores: Record<string, AssessmentScore>
  ) => {
    if (weightConfig.length === 0) {
      // Simple average if no weights configured
      let total = 0
      let count = 0
      assessments.forEach((assessment) => {
        const scoreData = studentScores[assessment.id]
        if (scoreData && scoreData.score !== undefined) {
          total += (scoreData.score / scoreData.max_score) * 100
          count++
        }
      })
      return count > 0 ? total / count : null
    }

    // Weighted average calculation
    let totalWeightedScore = 0
    let totalWeight = 0

    weightConfig.forEach((weight) => {
      const typeAssessments = assessments.filter(
        (a) => a.type === weight.assessment_type
      )

      if (typeAssessments.length === 0) return

      // Calculate scores for this type
      const typeScores = typeAssessments
        .map((assessment) => {
          const scoreData = studentScores[assessment.id]
          if (scoreData && scoreData.score !== undefined) {
            return {
              percentage: (scoreData.score / scoreData.max_score) * 100,
              earned: scoreData.score,
              possible: scoreData.max_score,
            }
          }
          return null
        })
        .filter((s): s is NonNullable<typeof s> => s !== null)

      if (typeScores.length === 0) return

      // Sort by percentage for drop_lowest
      typeScores.sort((a, b) => a.percentage - b.percentage)

      // Apply drop_lowest
      const scoresToUse = typeScores.slice(weight.drop_lowest)

      if (scoresToUse.length === 0) return

      // Calculate type average
      const typeAvg =
        scoresToUse.reduce((sum, s) => sum + s.percentage, 0) / scoresToUse.length

      totalWeightedScore += typeAvg * (weight.weight_percent / 100)
      totalWeight += weight.weight_percent
    })

    return totalWeight > 0 ? (totalWeightedScore / totalWeight) * 100 : null
  }

  // Convert numeric grade to letter grade
  const numericToLetterGrade = (numeric: number): string => {
    if (numeric >= 97) return 'A+'
    if (numeric >= 93) return 'A'
    if (numeric >= 90) return 'A-'
    if (numeric >= 87) return 'B+'
    if (numeric >= 83) return 'B'
    if (numeric >= 80) return 'B-'
    if (numeric >= 77) return 'C+'
    if (numeric >= 73) return 'C'
    if (numeric >= 70) return 'C-'
    if (numeric >= 67) return 'D+'
    if (numeric >= 63) return 'D'
    if (numeric >= 60) return 'D-'
    return 'F'
  }

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(date)
  }

  if (assessments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <span className="material-symbols-outlined text-6xl text-slate-400 mb-4">
          assignment
        </span>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
          No Assessments Yet
        </h3>
        <p className="text-slate-600 dark:text-slate-400 text-center max-w-md">
          There are no assessments for this grading period. Create assessments to start grading.
        </p>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <span className="material-symbols-outlined text-6xl text-slate-400 mb-4">
          group
        </span>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
          No Students Enrolled
        </h3>
        <p className="text-slate-600 dark:text-slate-400 text-center max-w-md">
          There are no students enrolled in this course.
        </p>
      </div>
    )
  }

  return (
    <div
      ref={tableRef}
      className="overflow-auto max-h-[calc(100vh-400px)]"
    >
      <table className="w-full border-collapse">
        <thead className="sticky top-0 z-20">
          {/* Type Header Row */}
          <tr className="bg-slate-100 dark:bg-slate-800">
            <th
              className="sticky left-0 z-30 bg-slate-100 dark:bg-slate-800 px-4 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider border-b border-r border-slate-200 dark:border-slate-700"
              rowSpan={2}
            >
              Student
            </th>
            {Object.entries(groupedAssessments).map(([type, typeAssessments]) => (
              <th
                key={type}
                colSpan={typeAssessments.length}
                className="px-4 py-2 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider border-b border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-sm">
                    {getAssessmentIcon(type)}
                  </span>
                  {type}
                  {weightConfig.find((w) => w.assessment_type === type) && (
                    <span className="text-primary">
                      ({weightConfig.find((w) => w.assessment_type === type)?.weight_percent}%)
                    </span>
                  )}
                </div>
              </th>
            ))}
            <th
              className="px-4 py-2 text-center text-xs font-semibold text-primary uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 bg-primary/10"
              colSpan={2}
              rowSpan={1}
            >
              Final Grade
            </th>
          </tr>

          {/* Assessment Header Row */}
          <tr className="bg-slate-50 dark:bg-slate-800/50">
            {assessments.map((assessment) => (
              <th
                key={assessment.id}
                className="px-2 py-3 text-center border-b border-r border-slate-200 dark:border-slate-700 min-w-[100px]"
              >
                <div className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate max-w-[100px]" title={assessment.title}>
                  {assessment.title}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {assessment.total_points} pts
                </div>
                {assessment.due_date && (
                  <div className="text-xs text-slate-400 dark:text-slate-500">
                    {formatDate(assessment.due_date)}
                  </div>
                )}
              </th>
            ))}
            <th className="px-2 py-3 text-center border-b border-r border-slate-200 dark:border-slate-700 min-w-[80px] bg-primary/5">
              <div className="text-xs font-medium text-slate-900 dark:text-slate-100">
                Average
              </div>
            </th>
            <th className="px-2 py-3 text-center border-b border-slate-200 dark:border-slate-700 min-w-[60px] bg-primary/5">
              <div className="text-xs font-medium text-slate-900 dark:text-slate-100">
                Grade
              </div>
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row, rowIndex) => {
            const weightedAverage = calculateWeightedAverage(row.assessmentScores)
            const letterGrade = weightedAverage !== null
              ? numericToLetterGrade(weightedAverage)
              : '—'

            return (
              <tr
                key={row.student.student_id}
                className={`
                  group transition-colors
                  ${rowIndex % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/30'}
                  hover:bg-blue-50 dark:hover:bg-blue-900/20
                `}
              >
                {/* Student Name - Sticky */}
                <td className="sticky left-0 z-10 px-4 py-3 border-b border-r border-slate-200 dark:border-slate-700 bg-inherit group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-semibold text-sm">
                        {row.student.student_name.charAt(0)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 dark:text-slate-100 truncate max-w-[180px]">
                        {row.student.student_name}
                      </div>
                      {row.student.lrn && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {row.student.lrn}
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                {/* Assessment Scores */}
                {assessments.map((assessment) => {
                  const scoreData = row.assessmentScores[assessment.id]

                  return (
                    <td
                      key={assessment.id}
                      className="px-1 py-1 text-center border-b border-r border-slate-200 dark:border-slate-700"
                    >
                      <GradebookCell
                        studentId={row.student.student_id}
                        assessmentId={assessment.id}
                        submissionId={scoreData?.submission_id}
                        score={scoreData?.score}
                        maxScore={assessment.total_points}
                        status={scoreData?.status || 'not_submitted'}
                        pendingGradingCount={scoreData?.pending_grading_count}
                        onSave={onScoreUpdate}
                        onViewGradingQueue={(submissionId) => {
                          // Navigate to grading queue filtered by submission
                          router.push(`/teacher/grading?submission=${submissionId}`)
                        }}
                        disabled={isSaving}
                      />
                    </td>
                  )
                })}

                {/* Weighted Average */}
                <td className="px-3 py-3 text-center border-b border-r border-slate-200 dark:border-slate-700 bg-primary/5">
                  <span
                    className={`font-semibold ${
                      weightedAverage !== null
                        ? weightedAverage >= 90
                          ? 'text-green-600 dark:text-green-400'
                          : weightedAverage >= 70
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-red-600 dark:text-red-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {weightedAverage !== null ? `${weightedAverage.toFixed(1)}%` : '—'}
                  </span>
                </td>

                {/* Letter Grade */}
                <td className="px-3 py-3 text-center border-b border-slate-200 dark:border-slate-700 bg-primary/5">
                  <span
                    className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm ${
                      letterGrade === '—'
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        : letterGrade.startsWith('A')
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : letterGrade.startsWith('B')
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        : letterGrade.startsWith('C')
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                        : letterGrade.startsWith('D')
                        ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}
                  >
                    {letterGrade}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// Helper function for assessment icons
function getAssessmentIcon(type: string): string {
  switch (type) {
    case 'quiz':
      return 'quiz'
    case 'exam':
      return 'school'
    case 'assignment':
      return 'assignment'
    case 'project':
      return 'folder'
    case 'participation':
      return 'groups'
    case 'midterm':
      return 'event'
    case 'final':
      return 'flag'
    default:
      return 'task'
  }
}
