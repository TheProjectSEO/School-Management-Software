'use client'

import { useState } from 'react'
import { authFetch } from "@/lib/utils/authFetch";

interface LessonAttachment {
  id: string
  title: string
  description?: string | null
  file_url: string
  file_type?: string | null
  file_size_bytes?: number | null
  order_index: number
  download_count?: number
}

interface LessonAttachmentsProps {
  attachments: LessonAttachment[]
  isPlayful: boolean
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return 'Unknown size'
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(1)} MB`
}

function ImagePreview({
  attachment,
  isPlayful
}: {
  attachment: LessonAttachment
  isPlayful: boolean
}) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

  const handleClick = () => {
    setIsLightboxOpen(true)
    // Track download
    authFetch(`/api/student/attachments/${attachment.id}/download`, {
      method: 'POST'
    }).catch(err => console.error('Failed to track download:', err))
  }

  return (
    <>
      <div
        className={`group cursor-pointer ${
          isPlayful
            ? 'rounded-xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-4 hover:shadow-lg transition-shadow'
            : 'rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 hover:shadow-md transition-shadow'
        }`}
        onClick={handleClick}
      >
        <div className="flex items-start gap-4">
          <img
            src={attachment.file_url}
            alt={attachment.title}
            className="w-32 h-32 object-cover rounded-lg shadow-sm"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`px-2 py-1 text-xs font-semibold rounded ${
                  isPlayful
                    ? 'bg-pink-200 text-pink-800'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                }`}
              >
                🖼️ Image
              </span>
            </div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-1">
              {attachment.title}
            </h4>
            {attachment.description && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                {attachment.description}
              </p>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-500">
              {formatFileSize(attachment.file_size_bytes)} • Click to enlarge
            </p>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setIsLightboxOpen(false)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-slate-300 text-4xl"
            onClick={() => setIsLightboxOpen(false)}
          >
            ×
          </button>
          <img
            src={attachment.file_url}
            alt={attachment.title}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}

function PDFPreview({
  attachment,
  isPlayful
}: {
  attachment: LessonAttachment
  isPlayful: boolean
}) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  const handleDownload = () => {
    // Track download
    authFetch(`/api/student/attachments/${attachment.id}/download`, {
      method: 'POST'
    }).catch(err => console.error('Failed to track download:', err))
    window.open(attachment.file_url, '_blank')
  }

  return (
    <>
      <div
        className={`${
          isPlayful
            ? 'rounded-xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50 p-4'
            : 'rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4'
        }`}
      >
        <div className="flex items-start gap-4 mb-4">
          <div
            className={`w-16 h-16 flex items-center justify-center rounded-lg ${
              isPlayful
                ? 'bg-orange-200 text-orange-800'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}
          >
            <span className="material-symbols-outlined text-4xl">picture_as_pdf</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`px-2 py-1 text-xs font-semibold rounded ${
                  isPlayful
                    ? 'bg-orange-200 text-orange-800'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}
              >
                📄 PDF
              </span>
            </div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-1">
              {attachment.title}
            </h4>
            {attachment.description && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                {attachment.description}
              </p>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-500">
              {formatFileSize(attachment.file_size_bytes)}
            </p>
          </div>
        </div>

        {/* PDF Embed Preview */}
        <div className="relative">
          <iframe
            src={attachment.file_url}
            className="w-full h-96 rounded-lg border border-slate-200 dark:border-slate-700"
            title={attachment.title}
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setIsFullscreen(true)}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                isPlayful
                  ? 'bg-orange-500 text-white hover:bg-orange-600'
                  : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
              }`}
            >
              <span className="material-symbols-outlined inline-block mr-2 align-middle">
                fullscreen
              </span>
              View Fullscreen
            </button>
            <button
              onClick={handleDownload}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                isPlayful
                  ? 'bg-purple-500 text-white hover:bg-purple-600'
                  : 'bg-slate-600 text-white hover:bg-slate-700 dark:bg-slate-500 dark:hover:bg-slate-600'
              }`}
            >
              <span className="material-symbols-outlined inline-block mr-2 align-middle">
                download
              </span>
              Download
            </button>
          </div>
        </div>
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="bg-slate-800 p-4 flex items-center justify-between">
            <h3 className="text-white font-semibold">{attachment.title}</h3>
            <button
              className="text-white hover:text-slate-300 text-2xl"
              onClick={() => setIsFullscreen(false)}
            >
              ×
            </button>
          </div>
          <iframe
            src={attachment.file_url}
            className="flex-1 w-full"
            title={attachment.title}
          />
        </div>
      )}
    </>
  )
}

function DownloadLink({
  attachment,
  isPlayful
}: {
  attachment: LessonAttachment
  isPlayful: boolean
}) {
  const handleDownload = () => {
    // Track download
    authFetch(`/api/student/attachments/${attachment.id}/download`, {
      method: 'POST'
    }).catch(err => console.error('Failed to track download:', err))
    window.open(attachment.file_url, '_blank')
  }

  const getFileIcon = () => {
    if (attachment.file_type?.includes('video')) return 'movie'
    if (attachment.file_type?.includes('presentation') || attachment.file_type?.includes('powerpoint')) return 'slideshow'
    if (attachment.file_type?.includes('word') || attachment.file_type?.includes('document')) return 'description'
    if (attachment.file_type?.includes('spreadsheet') || attachment.file_type?.includes('excel')) return 'table_chart'
    return 'attach_file'
  }

  const getFileTypeLabel = () => {
    if (attachment.file_type?.includes('video')) return '🎥 Video'
    if (attachment.file_type?.includes('presentation') || attachment.file_type?.includes('powerpoint')) return '📊 Presentation'
    if (attachment.file_type?.includes('word') || attachment.file_type?.includes('document')) return '📝 Document'
    if (attachment.file_type?.includes('spreadsheet') || attachment.file_type?.includes('excel')) return '📈 Spreadsheet'
    return '📎 File'
  }

  return (
    <div
      className={`${
        isPlayful
          ? 'rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 p-4'
          : 'rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4'
      }`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`w-16 h-16 flex items-center justify-center rounded-lg ${
            isPlayful
              ? 'bg-blue-200 text-blue-800'
              : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
          }`}
        >
          <span className="material-symbols-outlined text-4xl">{getFileIcon()}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`px-2 py-1 text-xs font-semibold rounded ${
                isPlayful
                  ? 'bg-blue-200 text-blue-800'
                  : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
              }`}
            >
              {getFileTypeLabel()}
            </span>
          </div>
          <h4 className="font-semibold text-slate-900 dark:text-white mb-1">
            {attachment.title}
          </h4>
          {attachment.description && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              {attachment.description}
            </p>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-500">
            {formatFileSize(attachment.file_size_bytes)}
          </p>
        </div>
        <button
          onClick={handleDownload}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            isPlayful
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
          }`}
        >
          <span className="material-symbols-outlined">download</span>
        </button>
      </div>
    </div>
  )
}

export default function LessonAttachments({
  attachments,
  isPlayful
}: LessonAttachmentsProps) {
  if (!attachments || attachments.length === 0) return null

  return (
    <div
      className={`p-6 ${
        isPlayful
          ? 'rounded-2xl border-2 border-pink-200 bg-white'
          : 'bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700'
      }`}
    >
      <h3
        className={`text-lg font-bold mb-4 ${
          isPlayful
            ? 'text-purple-800'
            : 'text-slate-900 dark:text-white'
        }`}
      >
        {isPlayful ? '📎 Lesson Materials' : 'Lesson Materials'}
      </h3>

      <div className="space-y-4">
        {attachments.map((att) => {
          if (att.file_type?.includes('image')) {
            return (
              <ImagePreview
                key={att.id}
                attachment={att}
                isPlayful={isPlayful}
              />
            )
          }
          if (att.file_type?.includes('pdf')) {
            return (
              <PDFPreview
                key={att.id}
                attachment={att}
                isPlayful={isPlayful}
              />
            )
          }
          return (
            <DownloadLink
              key={att.id}
              attachment={att}
              isPlayful={isPlayful}
            />
          )
        })}
      </div>
    </div>
  )
}
