'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AssessmentBuilderPage } from '@/components/teacher/assessment-builder';
import {
  Assessment,
  AssessmentQuestion,
  BankRule,
  QuestionBank,
} from '@/lib/types/assessment-builder';
import {
  getAssessmentQuestions,
  getBankRules,
  getQuestionBanks,
  updateAssessment,
  publishAssessment,
  reorderAssessmentQuestions,
  addQuestionToAssessment,
  deleteAssessmentQuestion,
  addBankRule,
  updateBankRule,
  deleteBankRule,
} from '@/lib/dal/assessment-builder';

export default function AssessmentBuilderPageRoute() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = params.assessmentId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [bankRules, setBankRules] = useState<BankRule[]>([]);
  const [availableBanks, setAvailableBanks] = useState<QuestionBank[]>([]);

  // Fetch initial data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        // Fetch assessment details
        const assessmentRes = await fetch(`/api/teacher/assessments/${assessmentId}`);
        if (!assessmentRes.ok) {
          throw new Error('Failed to load assessment');
        }
        const assessmentData = await assessmentRes.json();
        setAssessment(assessmentData.assessment);

        // Fetch questions
        const questionsResult = await getAssessmentQuestions(assessmentId);
        if (questionsResult.error) {
          console.warn('Failed to load questions:', questionsResult.error);
        } else {
          setQuestions(questionsResult.data?.questions || []);
        }

        // Fetch bank rules
        const rulesResult = await getBankRules(assessmentId);
        if (rulesResult.error) {
          console.warn('Failed to load bank rules:', rulesResult.error);
        } else {
          setBankRules(rulesResult.data?.rules || []);
        }

        // Fetch available banks
        const banksResult = await getQuestionBanks();
        if (banksResult.error) {
          console.warn('Failed to load banks:', banksResult.error);
        } else {
          setAvailableBanks(banksResult.data?.banks || []);
        }
      } catch (err) {
        console.error('Error loading assessment builder:', err);
        setError(err instanceof Error ? err.message : 'Failed to load assessment');
      } finally {
        setLoading(false);
      }
    }

    if (assessmentId) {
      loadData();
    }
  }, [assessmentId]);

  // Handle save
  const handleSave = async (updates: Partial<Assessment>) => {
    const result = await updateAssessment(assessmentId, updates);
    if (result.error) {
      throw new Error(result.error);
    }
    if (result.data?.assessment) {
      setAssessment(result.data.assessment);
    }
  };

  // Handle publish
  const handlePublish = async () => {
    const result = await publishAssessment(assessmentId);
    if (result.error) {
      throw new Error(result.error);
    }
    // Refresh assessment to get updated status
    const assessmentRes = await fetch(`/api/teacher/assessments/${assessmentId}`);
    if (assessmentRes.ok) {
      const data = await assessmentRes.json();
      setAssessment(data.assessment);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-msu-maroon mx-auto mb-4"></div>
          <p className="text-slate-500">Loading assessment builder...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mx-auto mb-4">
            <span className="material-symbols-outlined text-3xl text-red-600">error</span>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Error Loading Assessment</h2>
          <p className="text-sm text-slate-500 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="rounded-lg bg-msu-maroon px-4 py-2 text-sm font-medium text-white hover:bg-msu-maroon/90"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <AssessmentBuilderPage
      assessmentId={assessmentId}
      initialAssessment={assessment || undefined}
      initialQuestions={questions}
      initialBankRules={bankRules}
      availableBanks={availableBanks}
      onSave={handleSave}
      onPublish={handlePublish}
    />
  );
}
