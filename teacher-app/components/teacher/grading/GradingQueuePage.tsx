'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import GradingQueueList from './GradingQueueList'
import GradingPanel from './GradingPanel'
import { GradingQueueItem, GradingQueueStats, GradingQueueFilters } from '@/lib/dal/grading-queue'

interface GradingQueuePageProps {
  teacherId: string
}

interface Assessment {
  id: string
  title: string
  pending_count: number
}

export default function GradingQueuePage({ teacherId }: GradingQueuePageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const submissionFilter = searchParams.get('submission') || ''

  const [items, setItems] = useState<GradingQueueItem[]>([])
  const [selectedItem, setSelectedItem] = useState<GradingQueueItem | null>(null)
  const [questionDetails, setQuestionDetails] = useState<any | null>(null)
  const [stats, setStats] = useState<GradingQueueStats | null>(null)
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingItem, setLoadingItem] = useState(false)

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'graded' | 'flagged'>('pending')
  const [assessmentFilter, setAssessmentFilter] = useState<string>('')
  const [questionTypeFilter, setQuestionTypeFilter] = useState<string>('')

  // Clear submission filter helper
  const clearSubmissionFilter = useCallback(() => {
    router.push('/teacher/grading')
  }, [router])

  // Fetch queue items
  const fetchQueue = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (assessmentFilter) params.set('assessmentId', assessmentFilter)
      if (questionTypeFilter) params.set('questionType', questionTypeFilter)
      if (submissionFilter) params.set('submission', submissionFilter)

      const response = await fetch(`/api/teacher/grading/queue?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setItems(data.items)
      }
    } catch (error) {
      console.error('Error fetching queue:', error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, assessmentFilter, questionTypeFilter, submissionFilter])

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/teacher/grading/queue/stats')
      const data = await response.json()

      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }, [])

  // Fetch assessments for filter
  const fetchAssessments = useCallback(async () => {
    try {
      const response = await fetch('/api/teacher/grading/queue/assessments')
      const data = await response.json()

      if (data.success) {
        setAssessments(data.assessments)
      }
    } catch (error) {
      console.error('Error fetching assessments:', error)
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchQueue()
    fetchStats()
    fetchAssessments()
  }, [fetchQueue, fetchStats, fetchAssessments])

  // Re-fetch when filters change
  useEffect(() => {
    fetchQueue()
  }, [statusFilter, assessmentFilter, questionTypeFilter, submissionFilter, fetchQueue])

  // Fetch question details when item is selected
  const handleSelectItem = useCallback(async (item: GradingQueueItem) => {
    setSelectedItem(item)
    setLoadingItem(true)

    try {
      const response = await fetch(`/api/teacher/grading/queue/${item.id}`)
      const data = await response.json()

      if (data.success && data.questionDetails) {
        setQuestionDetails(data.questionDetails)
      } else {
        setQuestionDetails(null)
      }
    } catch (error) {
      console.error('Error fetching item details:', error)
      setQuestionDetails(null)
    } finally {
      setLoadingItem(false)
    }
  }, [])

  // Grade an item
  const handleGrade = useCallback(async (itemId: string, points: number, feedback: string) => {
    const response = await fetch(`/api/teacher/grading/queue/${itemId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points, feedback })
    })

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error || 'Failed to save grade')
    }

    // Refresh the list and stats
    await Promise.all([fetchQueue(), fetchStats()])
  }, [fetchQueue, fetchStats])

  // Flag an item
  const handleFlag = useCallback(async (itemId: string, reason: string) => {
    const response = await fetch(`/api/teacher/grading/queue/${itemId}/flag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    })

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error || 'Failed to flag item')
    }

    // Refresh the list and stats
    await Promise.all([fetchQueue(), fetchStats()])
  }, [fetchQueue, fetchStats])

  // Move to next item
  const handleNext = useCallback(() => {
    const currentIndex = items.findIndex(i => i.id === selectedItem?.id)
    const nextItem = items[currentIndex + 1] || items[0]

    if (nextItem && nextItem.id !== selectedItem?.id) {
      handleSelectItem(nextItem)
    } else {
      setSelectedItem(null)
      setQuestionDetails(null)
    }
  }, [items, selectedItem, handleSelectItem])

  // Question type options
  const questionTypes = [
    { value: '', label: 'All Types' },
    { value: 'essay', label: 'Essay' },
    { value: 'short_answer', label: 'Short Answer' },
    { value: 'matching', label: 'Matching' },
    { value: 'fill_in_blank', label: 'Fill in Blank' },
    { value: 'ordering', label: 'Ordering' },
  ]

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Grading Queue
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Review and grade student submissions that require manual review
            </p>
          </div>
          <Button onClick={() => fetchQueue()} variant="outline">
            <span className="material-symbols-rounded mr-2">refresh</span>
            Refresh
          </Button>
        </div>

        {/* Submission Filter Banner */}
        {submissionFilter && (
          <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg mb-4">
            <span className="material-symbols-rounded text-amber-600 dark:text-amber-400">
              filter_alt
            </span>
            <span className="text-sm text-amber-800 dark:text-amber-200">
              Showing items from a specific submission
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSubmissionFilter}
              className="ml-auto text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-800/30"
            >
              <span className="material-symbols-rounded mr-1 text-sm">close</span>
              Clear Filter
            </Button>
          </div>
        )}

        {/* Stats Bar */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <Card className="p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <span className="material-symbols-rounded text-2xl text-amber-600 dark:text-amber-400">
                  pending
                </span>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stats.pending}
                </div>
                <div className="text-sm text-slate-500">Pending</div>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <span className="material-symbols-rounded text-2xl text-green-600 dark:text-green-400">
                  check_circle
                </span>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stats.graded}
                </div>
                <div className="text-sm text-slate-500">Graded</div>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <span className="material-symbols-rounded text-2xl text-red-600 dark:text-red-400">
                  flag
                </span>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stats.flagged}
                </div>
                <div className="text-sm text-slate-500">Flagged</div>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <span className="material-symbols-rounded text-2xl text-blue-600 dark:text-blue-400">
                  inventory
                </span>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stats.total}
                </div>
                <div className="text-sm text-slate-500">Total</div>
              </div>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          {/* Status Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            {['all', 'pending', 'graded', 'flagged'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status as typeof statusFilter)}
                className={cn(
                  'px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize',
                  statusFilter === status
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                )}
              >
                {status}
                {status === 'pending' && stats?.pending ? (
                  <Badge variant="warning" className="ml-2">{stats.pending}</Badge>
                ) : null}
              </button>
            ))}
          </div>

          {/* Assessment Filter */}
          <select
            value={assessmentFilter}
            onChange={(e) => setAssessmentFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="">All Assessments</option>
            {assessments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title} ({a.pending_count})
              </option>
            ))}
          </select>

          {/* Question Type Filter */}
          <select
            value={questionTypeFilter}
            onChange={(e) => setQuestionTypeFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
          >
            {questionTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Queue List */}
        <div className="w-96 flex-shrink-0 overflow-y-auto">
          <GradingQueueList
            items={items}
            selectedId={selectedItem?.id}
            onSelect={handleSelectItem}
            loading={loading}
          />
        </div>

        {/* Grading Panel */}
        <div className="flex-1 min-w-0">
          <Card className="h-full overflow-hidden">
            <GradingPanel
              item={selectedItem}
              questionDetails={questionDetails}
              onGrade={handleGrade}
              onFlag={handleFlag}
              onNext={handleNext}
              loading={loadingItem}
            />
          </Card>
        </div>
      </div>
    </div>
  )
}
