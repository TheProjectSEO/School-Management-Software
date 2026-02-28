"use client";

import { authFetch } from "@/lib/utils/authFetch";

import { useState, useEffect, useCallback } from "react";

interface FeedbackTemplate {
  id: string;
  name: string;
  category: string;
  content: string;
  variables: string[];
  usage_count: number;
  is_default: boolean;
  created_at: string;
}

interface FeedbackTemplatesPanelProps {
  onSelectTemplate?: (content: string) => void;
  compact?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  excellent_work: "Excellent Work",
  good_work: "Good Work",
  needs_improvement: "Needs Improvement",
  incomplete: "Incomplete",
  late_submission: "Late Submission",
  missing_requirements: "Missing Requirements",
  plagiarism_concern: "Plagiarism Concern",
  general: "General",
};

const CATEGORY_COLORS: Record<string, string> = {
  excellent_work: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  good_work: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  needs_improvement: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  incomplete: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  late_submission: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  missing_requirements: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  plagiarism_concern: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  general: "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300",
};

export default function FeedbackTemplatesPanel({
  onSelectTemplate,
  compact = false,
}: FeedbackTemplatesPanelProps) {
  const [templates, setTemplates] = useState<FeedbackTemplate[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [newContent, setNewContent] = useState("");

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (selectedCategory) {
        params.set("category", selectedCategory);
      }

      const response = await authFetch(`/api/teacher/feedback-templates?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch templates");
      }

      const data = await response.json();
      if (data.success) {
        setTemplates(data.templates || []);
        setCategories(data.categories || []);
      } else {
        throw new Error(data.error || "Failed to fetch templates");
      }
    } catch (err) {
      console.error("Error fetching feedback templates:", err);
      setError("Unable to load templates");
      setTemplates([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Create new template
  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newName.trim() || !newContent.trim()) {
      return;
    }

    setIsCreating(true);

    try {
      const response = await authFetch("/api/teacher/feedback-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          category: newCategory,
          content: newContent.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTemplates((prev) => [data.template, ...prev]);
        setNewName("");
        setNewContent("");
        setNewCategory("general");
        setShowCreateForm(false);
      } else {
        throw new Error(data.error || "Failed to create template");
      }
    } catch (err) {
      console.error("Error creating template:", err);
      alert("Failed to create template. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  // Apply template (increment usage count)
  const handleApplyTemplate = async (template: FeedbackTemplate) => {
    if (onSelectTemplate) {
      onSelectTemplate(template.content);

      // Increment usage count in background
      try {
        await authFetch(`/api/teacher/feedback-templates/${template.id}/apply`, {
          method: "POST",
        });
        // Update local state
        setTemplates((prev) =>
          prev.map((t) =>
            t.id === template.id ? { ...t, usage_count: t.usage_count + 1 } : t
          )
        );
      } catch (err) {
        console.error("Error updating usage count:", err);
      }
    }
  };

  // Delete template
  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template?")) {
      return;
    }

    try {
      const response = await authFetch(`/api/teacher/feedback-templates/${templateId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      }
    } catch (err) {
      console.error("Error deleting template:", err);
    }
  };

  if (isLoading && templates.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

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

        {showCreateForm && (
          <form onSubmit={handleCreateTemplate} className="space-y-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Template name"
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Feedback content..."
              rows={2}
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
            <button
              type="submit"
              disabled={isCreating}
              className="w-full rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {isCreating ? "Creating..." : "Create"}
            </button>
          </form>
        )}

        {error ? (
          <p className="py-4 text-center text-xs text-red-500">{error}</p>
        ) : templates.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-500">
            No templates yet
          </p>
        ) : (
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {templates.slice(0, 5).map((template) => (
              <button
                key={template.id}
                onClick={() => handleApplyTemplate(template)}
                className="w-full rounded-lg border border-slate-200 p-2 text-left text-xs transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <span className="font-medium text-slate-900 dark:text-white">
                  {template.name}
                </span>
                <span className={`ml-2 inline-flex rounded px-1 py-0.5 text-xs ${CATEGORY_COLORS[template.category] || CATEGORY_COLORS.general}`}>
                  {CATEGORY_LABELS[template.category] || template.category}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Feedback Templates
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Create and manage reusable feedback templates
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          New Template
        </button>
      </div>

      {/* Category Filter */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory("")}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            selectedCategory === ""
              ? "bg-primary text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
          }`}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              selectedCategory === category
                ? "bg-primary text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
            }`}
          >
            {CATEGORY_LABELS[category] || category}
          </button>
        ))}
      </div>

      {/* Create Form Modal */}
      {showCreateForm && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-600 dark:bg-slate-900">
          <h3 className="mb-4 font-semibold text-slate-900 dark:text-white">
            Create New Template
          </h3>
          <form onSubmit={handleCreateTemplate} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Template Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Great Work!"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Category
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS[cat] || cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Content
              </label>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Enter your feedback template. Use {{student_name}}, {{score}}, {{percentage}} as variables."
                rows={4}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                required
              />
              <p className="mt-1 text-xs text-slate-500">
                Variables: {"{{student_name}}"}, {"{{score}}"}, {"{{max_score}}"}, {"{{percentage}}"}, {"{{assessment_title}}"}, {"{{course_name}}"}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isCreating}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {isCreating ? "Creating..." : "Create Template"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={fetchTemplates}
            className="mt-2 text-sm text-red-600 underline hover:no-underline dark:text-red-400"
          >
            Retry
          </button>
        </div>
      )}

      {/* Templates List */}
      {!error && templates.length === 0 ? (
        <div className="py-8 text-center">
          <p className="mb-4 text-slate-500 dark:text-slate-400">
            {selectedCategory
              ? "No templates in this category."
              : "No templates yet. Create your first template to speed up grading."}
          </p>
          {!showCreateForm && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              Create Template
            </button>
          )}
        </div>
      ) : !error && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="rounded-lg border border-slate-200 p-4 transition-shadow hover:shadow-md dark:border-slate-700"
            >
              <div className="mb-2 flex items-start justify-between">
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  {template.name}
                </h3>
                <button
                  onClick={() => handleDeleteTemplate(template.id)}
                  className="text-slate-400 hover:text-red-500"
                  title="Delete template"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[template.category] || CATEGORY_COLORS.general}`}>
                {CATEGORY_LABELS[template.category] || template.category}
              </span>
              <p className="mt-2 line-clamp-3 text-sm text-slate-600 dark:text-slate-300">
                {template.content}
              </p>
              {template.variables && template.variables.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {template.variables.map((variable) => (
                    <span
                      key={variable}
                      className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-400"
                    >
                      {`{{${variable}}}`}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {template.usage_count} use{template.usage_count !== 1 ? "s" : ""}
                </span>
                {onSelectTemplate && (
                  <button
                    onClick={() => handleApplyTemplate(template)}
                    className="rounded bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                  >
                    Use
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
