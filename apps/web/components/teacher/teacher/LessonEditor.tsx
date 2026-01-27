'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'

type VideoType = 'youtube' | 'vimeo' | 'upload' | 'embed' | 'external' | null
type ContentType = 'video' | 'reading' | 'quiz' | 'activity'

interface Attachment {
  id?: string
  file_name: string
  file_url: string
  file_type: string
  file_size: number
}

interface LessonData {
  id?: string
  module_id: string
  title: string
  content: string
  content_type: ContentType
  video_url: string
  video_type: VideoType
  thumbnail_url: string
  duration_minutes: number | null
  order: number
  is_published: boolean
  attachments: Attachment[]
}

interface LessonEditorProps {
  lesson?: LessonData | null
  moduleId: string
  onSave?: (lesson: LessonData) => void
  onClose?: () => void
  isModal?: boolean
}

// Video type detection
function detectVideoType(url: string): VideoType {
  if (!url) return null
  const lowerUrl = url.toLowerCase()

  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    return 'youtube'
  }
  if (lowerUrl.includes('vimeo.com')) {
    return 'vimeo'
  }
  if (lowerUrl.match(/\.(mp4|webm|ogg|mov)$/i)) {
    return 'upload'
  }
  if (lowerUrl.includes('embed') || lowerUrl.includes('iframe')) {
    return 'embed'
  }
  return 'external'
}

// Extract YouTube video ID
function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

// Extract Vimeo video ID
function extractVimeoVideoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  return match ? match[1] : null
}

// Generate embed URL
function getEmbedUrl(url: string, videoType: VideoType): string | null {
  if (videoType === 'youtube') {
    const videoId = extractYouTubeVideoId(url)
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null
  }
  if (videoType === 'vimeo') {
    const videoId = extractVimeoVideoId(url)
    return videoId ? `https://player.vimeo.com/video/${videoId}` : null
  }
  if (videoType === 'upload') {
    return url // Direct URL for uploaded videos
  }
  return null
}

// Get YouTube thumbnail
function getYouTubeThumbnail(url: string): string | null {
  const videoId = extractYouTubeVideoId(url)
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null
}

export default function LessonEditor({
  lesson,
  moduleId,
  onSave,
  onClose,
  isModal = false
}: LessonEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const attachmentInputRef = useRef<HTMLInputElement>(null)

  const [isLoading, setIsLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [formData, setFormData] = useState<LessonData>({
    id: lesson?.id,
    module_id: moduleId,
    title: lesson?.title || '',
    content: lesson?.content || '',
    content_type: lesson?.content_type || 'video',
    video_url: lesson?.video_url || '',
    video_type: lesson?.video_type || null,
    thumbnail_url: lesson?.thumbnail_url || '',
    duration_minutes: lesson?.duration_minutes || null,
    order: lesson?.order || 1,
    is_published: lesson?.is_published || false,
    attachments: lesson?.attachments || [],
  })

  // Auto-detect video type when URL changes
  useEffect(() => {
    if (formData.video_url) {
      const detected = detectVideoType(formData.video_url)
      setFormData(prev => ({
        ...prev,
        video_type: detected,
        thumbnail_url: detected === 'youtube' ? (getYouTubeThumbnail(formData.video_url) || prev.thumbnail_url) : prev.thumbnail_url
      }))
    }
  }, [formData.video_url])

  const handleVideoUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value
    setFormData(prev => ({ ...prev, video_url: url }))
  }

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a valid video file (MP4, WebM, OGG, or MOV)')
      return
    }

    // Validate file size (500MB max)
    if (file.size > 500 * 1024 * 1024) {
      setError('Video file must be less than 500MB')
      return
    }

    setIsLoading(true)
    setError(null)
    setUploadProgress(0)

    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('bucket', 'course-content')
      uploadFormData.append('folder', `videos/${moduleId}`)

      const response = await fetch('/api/content/upload', {
        method: 'POST',
        body: uploadFormData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Upload failed')
      }

      const data = await response.json()

      setFormData(prev => ({
        ...prev,
        video_url: data.file.url,
        video_type: 'upload',
      }))

      setSuccess('Video uploaded successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsLoading(false)
      setUploadProgress(0)
    }
  }

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsLoading(true)
    setError(null)

    try {
      const newAttachments: Attachment[] = []

      for (const file of Array.from(files)) {
        // Validate file size (100MB max)
        if (file.size > 100 * 1024 * 1024) {
          setError(`File ${file.name} must be less than 100MB`)
          continue
        }

        const uploadFormData = new FormData()
        uploadFormData.append('file', file)
        uploadFormData.append('bucket', 'lesson-attachments')
        uploadFormData.append('folder', `lessons/${formData.id || 'new'}`)

        const response = await fetch('/api/content/upload', {
          method: 'POST',
          body: uploadFormData,
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Upload failed')
        }

        const data = await response.json()
        newAttachments.push({
          file_name: data.file.fileName,
          file_url: data.file.url,
          file_type: data.file.fileType,
          file_size: data.file.fileSize,
        })
      }

      setFormData(prev => ({
        ...prev,
        attachments: [...prev.attachments, ...newAttachments],
      }))

      setSuccess('Attachments uploaded successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsLoading(false)
      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = ''
      }
    }
  }

  const removeAttachment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }))
  }

  const handleSave = async (publish: boolean = false) => {
    if (!formData.title.trim()) {
      setError('Lesson title is required')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const endpoint = formData.id
        ? `/api/content/lessons/${formData.id}`
        : '/api/content/lessons'

      const method = formData.id ? 'PATCH' : 'POST'

      const payload = {
        ...formData,
        is_published: publish,
      }

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save lesson')
      }

      const data = await response.json()

      setSuccess(publish ? 'Lesson published!' : 'Draft saved!')

      if (onSave) {
        onSave(data.lesson)
      }

      setTimeout(() => {
        setSuccess(null)
        if (onClose) onClose()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsLoading(false)
    }
  }

  const embedUrl = getEmbedUrl(formData.video_url, formData.video_type)

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const containerClass = isModal
    ? 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'
    : ''

  const contentClass = isModal
    ? 'bg-white dark:bg-slate-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto'
    : ''

  return (
    <div className={containerClass}>
      <div className={contentClass}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            {isModal && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            )}
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {formData.id ? 'Edit Lesson' : 'Create New Lesson'}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Add video content, readings, and attachments
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {formData.is_published ? (
              <Badge variant="success">Published</Badge>
            ) : (
              <Badge variant="warning">Draft</Badge>
            )}
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mx-5 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <span className="material-symbols-outlined">error</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="mx-5 mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <span className="material-symbols-outlined">check_circle</span>
              <span>{success}</span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-5 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                Lesson Title <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter lesson title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                Content Type
              </label>
              <select
                value={formData.content_type}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  content_type: e.target.value as ContentType
                }))}
                className="w-full h-12 px-4 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="video">Video</option>
                <option value="reading">Reading</option>
                <option value="quiz">Quiz</option>
                <option value="activity">Activity</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                Duration (minutes)
              </label>
              <Input
                type="number"
                value={formData.duration_minutes || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  duration_minutes: e.target.value ? parseInt(e.target.value) : null
                }))}
                placeholder="15"
                min={1}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                Order
              </label>
              <Input
                type="number"
                value={formData.order}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  order: parseInt(e.target.value) || 1
                }))}
                min={1}
              />
            </div>
          </div>

          {/* Video Section */}
          {formData.content_type === 'video' && (
            <Card className="!p-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">videocam</span>
                Video Content
              </h3>

              {/* Video URL Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                  Video URL (YouTube, Vimeo, or direct link)
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      value={formData.video_url}
                      onChange={handleVideoUrlChange}
                      placeholder="https://www.youtube.com/watch?v=..."
                      icon="link"
                    />
                  </div>
                  {formData.video_type && (
                    <Badge
                      variant={formData.video_type === 'youtube' ? 'danger' :
                               formData.video_type === 'vimeo' ? 'info' : 'default'}
                    >
                      {formData.video_type.toUpperCase()}
                    </Badge>
                  )}
                </div>
              </div>

              {/* OR Divider */}
              <div className="flex items-center gap-4 my-4">
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
                <span className="text-sm text-slate-500">OR</span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
              </div>

              {/* Video Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                  Upload Video File
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">
                    cloud_upload
                  </span>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Click to upload video (MP4, WebM, MOV - max 500MB)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/ogg,video/quicktime"
                    onChange={handleVideoUpload}
                    className="hidden"
                  />
                </div>
                {uploadProgress > 0 && (
                  <div className="mt-2">
                    <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{uploadProgress}% uploaded</p>
                  </div>
                )}
              </div>

              {/* Video Preview */}
              {embedUrl && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                    Video Preview
                  </label>
                  <div className="aspect-video rounded-lg overflow-hidden bg-black">
                    {formData.video_type === 'upload' ? (
                      <video
                        src={embedUrl}
                        controls
                        className="w-full h-full"
                      />
                    ) : (
                      <iframe
                        src={embedUrl}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Thumbnail */}
              {formData.thumbnail_url && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                    Thumbnail
                  </label>
                  <img
                    src={formData.thumbnail_url}
                    alt="Video thumbnail"
                    className="w-48 h-auto rounded-lg"
                  />
                </div>
              )}
            </Card>
          )}

          {/* Content/Description */}
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
              Lesson Content / Description
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Enter lesson content, instructions, or reading material..."
              rows={6}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary resize-y"
            />
          </div>

          {/* Attachments */}
          <Card className="!p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">attach_file</span>
                Attachments
              </h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => attachmentInputRef.current?.click()}
                disabled={isLoading}
              >
                <span className="material-symbols-outlined text-base">add</span>
                Add Files
              </Button>
              <input
                ref={attachmentInputRef}
                type="file"
                multiple
                onChange={handleAttachmentUpload}
                className="hidden"
              />
            </div>

            {formData.attachments.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg">
                <span className="material-symbols-outlined text-3xl text-slate-400 mb-2">
                  folder_open
                </span>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  No attachments yet. Add PDFs, documents, or other resources.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {formData.attachments.map((attachment, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-slate-400">
                        {attachment.file_type.includes('pdf') ? 'picture_as_pdf' :
                         attachment.file_type.includes('image') ? 'image' :
                         attachment.file_type.includes('video') ? 'movie' :
                         'description'}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {attachment.file_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatFileSize(attachment.file_size)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeAttachment(index)}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-red-500"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-5 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <div className="text-sm text-slate-500">
            {formData.id ? 'Last saved: Just now' : 'New lesson'}
          </div>
          <div className="flex items-center gap-3">
            {onClose && (
              <Button variant="ghost" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="material-symbols-outlined animate-spin">refresh</span>
              ) : (
                <span className="material-symbols-outlined text-lg">save</span>
              )}
              Save Draft
            </Button>
            <Button
              onClick={() => handleSave(true)}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="material-symbols-outlined animate-spin">refresh</span>
              ) : (
                <span className="material-symbols-outlined text-lg">publish</span>
              )}
              Publish
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
