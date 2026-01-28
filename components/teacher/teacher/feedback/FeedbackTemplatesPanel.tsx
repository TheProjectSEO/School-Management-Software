"use client";

import { useState, useEffect, useCallback } from "react";

interface FeedbackTemplate {
  id: string;
  name: string;
  category: string;
  content: string;
  variables: string[];
  is_default: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

interface FeedbackTemplatesPanelProps {
  onSelectTemplate?: (content: string) => void;
  submissionContext?: {
    student_name?: string;
    score?: number;
    max_score?: number;
    assessment_title?: string;
    course_name?: string;
  };
  compact?: boolean;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  excellent_work: {
    label: "Excellent Work",
    icon: "star",
    color: "text-green-600 dark:text-green-400",
  },
  good_work: {
    label: "Good Work",
    icon: "thumb_up",
    color: "text-blue-600 dark:text-blue-400",
  },
  needs_improvement: {
    label: "Needs Improvement",
    icon: "trending_up",
    color: "text-amber-600 dark:text-amber-400",
  },
  incomplete: {
    label: "Incomplete",
    icon: "assignment_late",
    color: "text-orange-600 dark:text-orange-400",
  },
  late_submission: {
    label: "Late Submission",
    icon: "schedule",
    color: "text-red-600 dark:text-red-400",
  },
  missing_requirements: {
    label: "Missing Requirements",
    icon: "checklist",
    color: "text-purple-600 dark:text-purple-400",
  },
  plagiarism_concern: {
    label: "Plagiarism Concern",
    icon: "warning",
    color: "text-red-600 dark:text-red-400",
  },
  general: {
    label: "General",
    icon: "description",
    color: "text-slate-600 dark:text-slate-400",
  },
};

const AVAILABLE_VARIABLES = [
  { key: "student_name", label: "Student Name", example: "John Doe" },
  { key: "first_name", label: "First Name", example: "John" },
  { key: "score", label: "Score", example: "85" },
  { key: "max_score", label: "Max Score", example: "100" },
  { key: "percentage", label: "Percentage", example: "85" },
  { key: "grade_letter", label: "Letter Grade", example: "B" },
  { key: "assessment_title", label: "Assessment Title", example: "Quiz 1" },
  { key: "course_name", label: "Course Name", example: "Mathematics" },
  { key: "date", label: "Current Date", example: "Monday, January 20, 2025" },
];

export function FeedbackTemplatesPanel({
  onSelectTemplate,
  submissionContext,
  compact = false,
}: FeedbackTemplatesPanelProps) {
  const [templates, setTemplates] = useState<FeedbackTemplate[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<FeedbackTemplate | null>(null);
  const [isApplying, setIsApplying] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("general");
  const [formContent, setFormContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.set("category", selectedCategory);
      if (searchQuery) params.set("search", searchQuery);

      const response = await fetch(`/api/teacher/feedback-templates?${params.toString()}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch templates");
      }

      setTemplates(data.templates);
      setCategories(data.categories);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load templates");
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleApplyTemplate = async (template: FeedbackTemplate) => {
    if (!onSelectTemplate) return;

    setIsApplying(template.id);

    try {
      const response = await fetch(`/api/teacher/feedback-templates/${template.id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionContext || {}),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to apply template");
      }

      onSelectTemplate(data.feedback);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply template");
    } finally {
      setIsApplying(null);
    }
  };

  const handleCreateTemplate = async () => {
    if (!formName || !formContent) return;

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/teacher/feedback-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          category: formCategory,
          content: formContent,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to create template");
      }

      // Reset form and refresh
      setFormName("");
      setFormCategory("general");
      setFormContent("");
      setShowCreateForm(false);
      fetchTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create template");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate || !formName || !formContent) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/teacher/feedback-templates/${editingTemplate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          category: formCategory,
          content: formContent,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to update template");
      }

      setEditingTemplate(null);
      setFormName("");
      setFormCategory("general");
      setFormContent("");
      fetchTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update template");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const response = await fetch(`/api/teacher/feedback-templates/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to delete template");
      }

      fetchTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete template");
    }
  };

  const startEditing = (template: FeedbackTemplate) => {
    setEditingTemplate(template);
    setFormName(template.name);
    setFormCategory(template.category);
    setFormContent(template.content);
    setShowCreateForm(true);
  };

  const insertVariable = (variable: string) => {
    setFormContent(prev => prev + `{{${variable}}}`);
  };

  // Compact view for integration into grading panel
  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-slate-900 dark:text-white">
            Quick Feedback
          </h4>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="text-xs text-primary hover:underline"
          >
            + New Template
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <span className="material-symbols-outlined animate-spin text-slate-400">sync</span>
          </div>
        ) : templates.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">No templates yet</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {templates.slice(0, 5).map((template) => {
              const catConfig = CATEGORY_CONFIG[template.category] || CATEGORY_CONFIG.general;
              return (
                <button
                  key={template.id}
                  onClick={() => handleApplyTemplate(template)}
                  disabled={isApplying === template.id}
                  className="w-full text-left p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <span className={`material-symbols-outlined text-[14px] ${catConfig.color}`}>
                      {catConfig.icon}
                    </span>
                    <span className="font-medium text-slate-900 dark:text-white truncate">
                      {template.name}
                    </span>
                    {isApplying === template.id && (
                      <span className="material-symbols-outlined animate-spin text-[12px] text-slate-400">
                        sync
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Full view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Feedback Templates
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Create and manage reusable feedback templates for grading
          </p>
        </div>
        <button
          onClick={() => {
            setEditingTemplate(null);
            setFormName("");
            setFormCategory("general");
            setFormContent("");
            setShowCreateForm(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-[#5a0c0e] text-white rounded-lg text-sm font-medium transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Template
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a2634]">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4">
            {editingTemplate ? "Edit Template" : "Create New Template"}
          </h3>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Template Name
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Great Work Response"
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0d1520] text-slate-900 dark:text-white placeholder:text-slate-400 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0d1520] text-slate-900 dark:text-white text-sm"
                >
                  {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Variables Helper */}
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                Insert Variable
              </label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_VARIABLES.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => insertVariable(v.key)}
                    className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    title={`Example: ${v.example}`}
                  >
                    {`{{${v.key}}}`}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                Template Content
              </label>
              <textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="Write your feedback template here. Use {{variable}} syntax for dynamic content..."
                rows={6}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0d1520] text-slate-900 dark:text-white placeholder:text-slate-400 text-sm resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingTemplate(null);
                }}
                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
                disabled={!formName || !formContent || isSubmitting}
                className="px-4 py-2 bg-primary hover:bg-[#5a0c0e] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : editingTemplate ? "Update Template" : "Create Template"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0d1520] text-slate-900 dark:text-white placeholder:text-slate-400 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === null
                ? "bg-primary text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            All
          </button>
          {categories.map((cat) => {
            const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.general;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === cat
                    ? "bg-primary text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{config.icon}</span>
                {config.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Templates List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <span className="material-symbols-outlined animate-spin text-4xl text-slate-400">sync</span>
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a2634] p-8 text-center">
          <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-3 block">
            description
          </span>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
            No Templates Yet
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            Create your first feedback template to speed up grading.
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-[#5a0c0e] text-white rounded-lg text-sm font-medium transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Create Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => {
            const catConfig = CATEGORY_CONFIG[template.category] || CATEGORY_CONFIG.general;
            return (
              <div
                key={template.id}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a2634] overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`material-symbols-outlined text-[20px] ${catConfig.color}`}>
                        {catConfig.icon}
                      </span>
                      <h3 className="font-bold text-slate-900 dark:text-white">
                        {template.name}
                      </h3>
                    </div>
                    <span className="text-xs text-slate-400">
                      {template.usage_count} uses
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                    {catConfig.label}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3">
                    {template.content}
                  </p>

                  {template.variables.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {template.variables.map((v) => (
                        <span
                          key={v}
                          className="px-1.5 py-0.5 text-[10px] bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded"
                        >
                          {`{{${v}}}`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEditing(template)}
                      className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                      title="Edit"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                  {onSelectTemplate && (
                    <button
                      onClick={() => handleApplyTemplate(template)}
                      disabled={isApplying === template.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-[#5a0c0e] text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                    >
                      {isApplying === template.id ? (
                        <span className="material-symbols-outlined animate-spin text-[14px]">sync</span>
                      ) : (
                        <span className="material-symbols-outlined text-[14px]">content_paste</span>
                      )}
                      Use
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default FeedbackTemplatesPanel;
