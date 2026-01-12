"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Note } from "@/lib/dal";

interface Course {
  id: string;
  name: string;
}

interface NotesClientProps {
  notes: Note[];
  courses: Course[];
}

type ViewMode = "grid" | "list";
type FilterType = "all" | "note" | "highlight" | "bookmark";

interface NoteFormData {
  title: string;
  content: string;
  type: "note" | "highlight" | "bookmark";
  courseId: string;
  tags: string;
  isFavorite: boolean;
}

export default function NotesClient({ notes: initialNotes, courses }: NotesClientProps) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [selectedCourse, setSelectedCourse] = useState<string>("all");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<NoteFormData>({
    title: "",
    content: "",
    type: "note",
    courseId: "",
    tags: "",
    isFavorite: false,
  });

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Open modal for creating new note
  const openCreateModal = () => {
    setEditingNote(null);
    setFormData({
      title: "",
      content: "",
      type: "note",
      courseId: "",
      tags: "",
      isFavorite: false,
    });
    setIsModalOpen(true);
  };

  // Open modal for editing existing note
  const openEditModal = (note: Note) => {
    setEditingNote(note);
    setFormData({
      title: note.title,
      content: note.content || "",
      type: note.type,
      courseId: note.course_id || "",
      tags: note.tags?.join(", ") || "",
      isFavorite: note.is_favorite,
    });
    setIsModalOpen(true);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setIsSubmitting(true);

    try {
      const payload = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        type: formData.type,
        courseId: formData.courseId || null,
        tags: formData.tags.split(",").map((t) => t.trim()).filter(Boolean),
        isFavorite: formData.isFavorite,
      };

      const url = editingNote ? `/api/notes/${editingNote.id}` : "/api/notes";
      const method = editingNote ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to save note");
      }

      const data = await response.json();

      if (editingNote) {
        setNotes(notes.map((n) => (n.id === editingNote.id ? data.note : n)));
      } else {
        setNotes([data.note, ...notes]);
      }

      setIsModalOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Error saving note:", error);
      alert("Failed to save note. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle note deletion
  const handleDelete = async (noteId: string) => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete note");
      }

      setNotes(notes.filter((n) => n.id !== noteId));
      setDeleteConfirm(null);
      router.refresh();
    } catch (error) {
      console.error("Error deleting note:", error);
      alert("Failed to delete note. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle favorite
  const toggleFavorite = async (note: Note) => {
    try {
      const response = await fetch(`/api/notes/${note.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: !note.is_favorite }),
      });

      if (response.ok) {
        setNotes(notes.map((n) =>
          n.id === note.id ? { ...n, is_favorite: !n.is_favorite } : n
        ));
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };

  // Filter and search notes
  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      // Search filter
      const matchesSearch =
        searchQuery === "" ||
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      // Type filter
      const matchesType = filterType === "all" || note.type === filterType;

      // Course filter
      const matchesCourse = selectedCourse === "all" || note.course_id === selectedCourse;

      return matchesSearch && matchesType && matchesCourse;
    });
  }, [notes, searchQuery, filterType, selectedCourse]);

  // Get course name by ID
  const getCourseName = (courseId?: string) => {
    if (!courseId) return "General";
    return courses.find((c) => c.id === courseId)?.name || "Unknown Course";
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  // Get icon for note type
  const getNoteIcon = (type: Note["type"]) => {
    switch (type) {
      case "note":
        return "description";
      case "highlight":
        return "highlight";
      case "bookmark":
        return "bookmark";
      default:
        return "description";
    }
  };

  // Get color for note type
  const getNoteColor = (type: Note["type"]) => {
    switch (type) {
      case "note":
        return "bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400";
      case "highlight":
        return "bg-yellow-50 dark:bg-yellow-900/10 text-yellow-600 dark:text-yellow-400";
      case "bookmark":
        return "bg-purple-50 dark:bg-purple-900/10 text-purple-600 dark:text-purple-400";
      default:
        return "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400";
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
        <div>
          <h1 className="text-slate-900 dark:text-white text-3xl md:text-4xl font-bold leading-tight tracking-tight">
            My Notes
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-base mt-2">
            Organize your study materials, highlights, and bookmarks.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg font-bold text-sm transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>New Note</span>
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`size-10 rounded-lg flex items-center justify-center transition-colors ${
              viewMode === "grid"
                ? "bg-primary text-white"
                : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary"
            }`}
            aria-label="Grid view"
          >
            <span className="material-symbols-outlined text-[22px]">grid_view</span>
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`size-10 rounded-lg flex items-center justify-center transition-colors ${
              viewMode === "list"
                ? "bg-primary text-white"
                : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary"
            }`}
            aria-label="List view"
          >
            <span className="material-symbols-outlined text-[22px]">view_list</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-white dark:bg-slate-900 p-2 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 mb-8">
        <div className="relative w-full md:w-96 group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-slate-400">search</span>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2.5 border-none rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary/20 text-sm font-medium"
            placeholder="Search notes, highlights, bookmarks..."
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
          <button
            onClick={() => setFilterType("all")}
            className={`flex shrink-0 items-center justify-center gap-x-2 rounded-lg px-4 py-2 transition-colors shadow-sm ${
              filterType === "all"
                ? "bg-primary text-white"
                : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            }`}
          >
            <span className="text-sm font-medium">All</span>
          </button>
          <button
            onClick={() => setFilterType("note")}
            className={`flex shrink-0 items-center justify-center gap-x-2 rounded-lg px-4 py-2 transition-colors ${
              filterType === "note"
                ? "bg-primary text-white"
                : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">description</span>
            <span className="text-sm font-medium">Notes</span>
          </button>
          <button
            onClick={() => setFilterType("highlight")}
            className={`flex shrink-0 items-center justify-center gap-x-2 rounded-lg px-4 py-2 transition-colors ${
              filterType === "highlight"
                ? "bg-primary text-white"
                : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">highlight</span>
            <span className="text-sm font-medium">Highlights</span>
          </button>
          <button
            onClick={() => setFilterType("bookmark")}
            className={`flex shrink-0 items-center justify-center gap-x-2 rounded-lg px-4 py-2 transition-colors ${
              filterType === "bookmark"
                ? "bg-primary text-white"
                : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">bookmark</span>
            <span className="text-sm font-medium">Bookmarks</span>
          </button>
        </div>
      </div>

      {/* Course Filter */}
      {courses.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Filter by Subject
          </label>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="w-full md:w-64 px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 text-sm font-medium"
          >
            <option value="all">All Subjects</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Notes Display */}
      {filteredNotes.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4">
            {searchQuery ? "search_off" : "note"}
          </span>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            {searchQuery ? "No Notes Found" : "No Notes Yet"}
          </h3>
          <p className="text-slate-500 dark:text-slate-400">
            {searchQuery
              ? "Try adjusting your search or filters"
              : "Start taking notes while studying your subjects."}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        // Grid View
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className="group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300 flex flex-col"
            >
              {/* Note Header */}
              <div className="p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div
                      className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${getNoteColor(
                        note.type
                      )}`}
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {getNoteIcon(note.type)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                        {note.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {getCourseName(note.course_id)}
                      </p>
                    </div>
                  </div>
                  {note.is_favorite && (
                    <span className="material-symbols-outlined text-msu-gold text-[20px] shrink-0">
                      star
                    </span>
                  )}
                </div>

                {/* Note Content Preview */}
                {note.content && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                    {note.content}
                  </p>
                )}

                {/* Tags */}
                {note.tags && note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {note.tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 uppercase tracking-wide"
                      >
                        {tag}
                      </span>
                    ))}
                    {note.tags.length > 3 && (
                      <span className="px-2 py-1 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        +{note.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Note Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                    <span>{formatDate(note.updated_at)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleFavorite(note)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        note.is_favorite
                          ? "text-msu-gold hover:text-msu-gold/80"
                          : "text-slate-400 hover:text-msu-gold"
                      }`}
                      title={note.is_favorite ? "Remove from favorites" : "Add to favorites"}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {note.is_favorite ? "star" : "star_outline"}
                      </span>
                    </button>
                    <button
                      onClick={() => openEditModal(note)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-primary transition-colors"
                      title="Edit note"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(note.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                      title="Delete note"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // List View
        <div className="flex flex-col gap-3">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className="group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:border-primary/30 hover:shadow-md transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                {/* Note Icon */}
                <div
                  className={`size-12 rounded-lg flex items-center justify-center shrink-0 ${getNoteColor(
                    note.type
                  )}`}
                >
                  <span className="material-symbols-outlined text-[24px]">
                    {getNoteIcon(note.type)}
                  </span>
                </div>

                {/* Note Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                        {note.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                        {getCourseName(note.course_id)} • {formatDate(note.updated_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => toggleFavorite(note)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          note.is_favorite
                            ? "text-msu-gold hover:text-msu-gold/80"
                            : "text-slate-400 hover:text-msu-gold"
                        }`}
                        title={note.is_favorite ? "Remove from favorites" : "Add to favorites"}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {note.is_favorite ? "star" : "star_outline"}
                        </span>
                      </button>
                      <button
                        onClick={() => openEditModal(note)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-primary transition-colors"
                        title="Edit note"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(note.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                        title="Delete note"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>

                  {/* Content Preview */}
                  {note.content && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mb-3">
                      {note.content}
                    </p>
                  )}

                  {/* Tags */}
                  {note.tags && note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {note.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 uppercase tracking-wide"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats Footer */}
      {filteredNotes.length > 0 && (
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
              <div className="text-2xl font-bold text-primary mb-1">
                {notes.filter((n) => n.type === "note").length}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Notes</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600 mb-1">
                {notes.filter((n) => n.type === "highlight").length}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Highlights
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
              <div className="text-2xl font-bold text-purple-600 mb-1">
                {notes.filter((n) => n.type === "bookmark").length}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Bookmarks
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
              <div className="text-2xl font-bold text-msu-gold mb-1">
                {notes.filter((n) => n.is_favorite).length}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Favorites
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !isSubmitting && setIsModalOpen(false)}
          />

          {/* Modal */}
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {editingNote ? "Edit Note" : "Create New Note"}
              </h2>
              <button
                onClick={() => !isSubmitting && setIsModalOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                disabled={isSubmitting}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="Enter note title..."
                  required
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Content
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  placeholder="Write your note..."
                  rows={5}
                />
              </div>

              {/* Type & Course Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value as NoteFormData["type"] })
                    }
                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="note">Note</option>
                    <option value="highlight">Highlight</option>
                    <option value="bookmark">Bookmark</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Subject
                  </label>
                  <select
                    value={formData.courseId}
                    onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">General</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Tags
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="Enter tags separated by commas..."
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Separate multiple tags with commas (e.g., important, exam, review)
                </p>
              </div>

              {/* Favorite Toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isFavorite}
                  onChange={(e) => setFormData({ ...formData, isFavorite: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Mark as favorite
                </span>
              </label>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.title.trim()}
                  className="flex-1 px-4 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[18px]">
                        progress_activity
                      </span>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingNote ? "Save Changes" : "Create Note"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !isDeleting && setDeleteConfirm(null)}
          />

          {/* Dialog */}
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-center size-12 rounded-full bg-red-100 dark:bg-red-900/20 mx-auto mb-4">
              <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-[28px]">
                delete
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center mb-2">
              Delete Note?
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">
              This action cannot be undone. Are you sure you want to delete this note?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[18px]">
                      progress_activity
                    </span>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
