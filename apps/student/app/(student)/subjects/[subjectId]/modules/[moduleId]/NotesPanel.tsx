"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Note {
  id: string;
  title: string;
  content: string;
  type: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface NotesPanelProps {
  studentId: string;
  courseId: string;
  lessonId: string;
  lessonTitle: string;
}

export default function NotesPanel({ studentId, courseId, lessonId, lessonTitle }: NotesPanelProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentNote, setCurrentNote] = useState("");
  const [savedStatus, setSavedStatus] = useState<"idle" | "saving" | "saved">("idle");

  // Fetch existing notes for this lesson
  useEffect(() => {
    if (isExpanded) {
      fetchNotes();
    }
  }, [isExpanded, lessonId]);

  const fetchNotes = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/notes?courseId=${courseId}&lessonId=${lessonId}`);
      if (response.ok) {
        const data = await response.json();
        setNotes(data.notes || []);
        // Load most recent note into editor
        if (data.notes?.length > 0) {
          setCurrentNote(data.notes[0].content);
        }
      }
    } catch (error) {
      console.error("Error fetching notes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-save with debounce
  const saveNote = useCallback(async (content: string) => {
    if (!content.trim()) return;

    setSavedStatus("saving");
    setIsSaving(true);

    try {
      const existingNote = notes.find(n => n.title.includes(lessonTitle));

      if (existingNote) {
        // Update existing note
        const response = await fetch(`/api/notes/${existingNote.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content,
            updated_at: new Date().toISOString(),
          }),
        });

        if (response.ok) {
          setSavedStatus("saved");
        }
      } else {
        // Create new note
        const response = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `Notes: ${lessonTitle}`,
            content,
            type: "lesson",
            courseId,
            tags: ["lesson-notes", lessonId],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setNotes([data.note, ...notes]);
          setSavedStatus("saved");
        }
      }
    } catch (error) {
      console.error("Error saving note:", error);
      setSavedStatus("idle");
    } finally {
      setIsSaving(false);
      // Reset saved status after 2 seconds
      setTimeout(() => setSavedStatus("idle"), 2000);
    }
  }, [notes, lessonTitle, courseId, lessonId]);

  // Debounced save
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentNote.trim() && savedStatus !== "saving") {
        saveNote(currentNote);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [currentNote]);

  return (
    <>
      {/* Toggle Button - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`fixed right-4 top-1/2 -translate-y-1/2 z-40 flex items-center gap-2 px-3 py-2 rounded-l-lg shadow-lg transition-all ${
          isExpanded
            ? "bg-primary text-white translate-x-80"
            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
        }`}
      >
        <span className="material-symbols-outlined text-xl">
          {isExpanded ? "chevron_right" : "sticky_note_2"}
        </span>
        {!isExpanded && <span className="text-sm font-medium">Notes</span>}
      </button>

      {/* Notes Panel */}
      <div
        className={`fixed right-0 top-0 h-full w-80 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 shadow-xl z-30 transition-transform duration-300 ${
          isExpanded ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary dark:text-msu-gold">
                sticky_note_2
              </span>
              <h3 className="font-bold text-slate-900 dark:text-white">Lesson Notes</h3>
            </div>
            <div className="flex items-center gap-2">
              {savedStatus === "saving" && (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                  Saving...
                </span>
              )}
              {savedStatus === "saved" && (
                <span className="text-xs text-msu-green flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  Saved
                </span>
              )}
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <span className="material-symbols-outlined text-slate-500">close</span>
              </button>
            </div>
          </div>

          {/* Lesson Context */}
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400">Taking notes for:</p>
            <p className="text-sm font-medium text-slate-900 dark:text-white line-clamp-2">
              {lessonTitle}
            </p>
          </div>

          {/* Notes Editor */}
          <div className="flex-1 p-4 overflow-hidden flex flex-col">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <span className="material-symbols-outlined text-4xl text-slate-300 animate-pulse">
                  hourglass_empty
                </span>
              </div>
            ) : (
              <>
                <textarea
                  value={currentNote}
                  onChange={(e) => setCurrentNote(e.target.value)}
                  placeholder="Start typing your notes here... They will be auto-saved."
                  className="flex-1 w-full resize-none rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    {currentNote.length} characters
                  </span>
                  <button
                    onClick={() => saveNote(currentNote)}
                    disabled={isSaving || !currentNote.trim()}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-[#5d0016] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">save</span>
                    Save Now
                  </button>
                </div>
              </>
            )}
          </div>

          {/* View All Notes Link */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={() => router.push("/notes")}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">folder_open</span>
              View All Notes
            </button>
          </div>
        </div>
      </div>

      {/* Overlay when panel is open */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/20 z-20 lg:hidden"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </>
  );
}
