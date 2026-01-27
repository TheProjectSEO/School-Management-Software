"use client";

import { useState } from "react";

// Subject type matching TeacherSubject from teacher DAL
interface Subject {
  id: string;
  name: string;
  subject_code: string;
  section_id: string;
  section_name: string;
  grade_level: string;
}

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (session: SessionFormData) => void;
  selectedDate?: Date;
  subjects?: Subject[];
}

export interface SessionFormData {
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  courseId: string;
  sectionId: string;
  isRecurring: boolean;
  recurringPattern?: "daily" | "weekly" | "monthly";
}

export default function CreateSessionModal({
  isOpen,
  onClose,
  onSubmit,
  selectedDate,
  subjects = [],
}: CreateSessionModalProps) {
  const [formData, setFormData] = useState<SessionFormData>({
    title: "",
    description: "",
    date: selectedDate?.toISOString().split("T")[0] || "",
    startTime: "09:00",
    endTime: "10:00",
    courseId: "",
    sectionId: "",
    isRecurring: false,
    recurringPattern: undefined,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Placeholder: submit to API
      onSubmit?.(formData);
      onClose();
    } catch (error) {
      console.error("Failed to create session:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-slate-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Create Session
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Session Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              placeholder="Enter session title"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              className="w-full resize-none rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              placeholder="Enter session description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 focus:border-primary focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Course
              </label>
              <select
                value={formData.courseId}
                onChange={(e) => {
                  const selectedSubject = subjects.find(s => s.id === e.target.value);
                  setFormData({
                    ...formData,
                    courseId: e.target.value,
                    sectionId: selectedSubject?.section_id || "",
                  });
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 focus:border-primary focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              >
                <option value="">Select course</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name} ({subject.section_name} - {subject.grade_level})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Start Time
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) =>
                  setFormData({ ...formData, startTime: e.target.value })
                }
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 focus:border-primary focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                End Time
              </label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) =>
                  setFormData({ ...formData, endTime: e.target.value })
                }
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 focus:border-primary focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isRecurring"
              checked={formData.isRecurring}
              onChange={(e) =>
                setFormData({ ...formData, isRecurring: e.target.checked })
              }
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
            />
            <label
              htmlFor="isRecurring"
              className="text-sm text-slate-700 dark:text-slate-300"
            >
              Recurring session
            </label>
          </div>

          {formData.isRecurring && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Repeat Pattern
              </label>
              <select
                value={formData.recurringPattern || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    recurringPattern: e.target.value as
                      | "daily"
                      | "weekly"
                      | "monthly",
                  })
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 focus:border-primary focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              >
                <option value="">Select pattern</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create Session"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
