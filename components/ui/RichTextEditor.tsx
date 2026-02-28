'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { useCallback, useEffect, useRef } from 'react'
import { authFetch } from "@/lib/utils/authFetch";

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start typing...',
  className = ''
}: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full h-auto'
        }
      }),
      Placeholder.configure({
        placeholder
      })
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-slate dark:prose-invert max-w-none focus:outline-none min-h-[200px] px-4 py-3 prose-li:marker:text-[#7B1113]'
      }
    }
  })

  // Update editor content when value prop changes externally
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value)
    }
  }, [value, editor])

  const handleImageUpload = useCallback(async (file: File) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', 'course-content')

      const response = await authFetch('/api/teacher/content/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const data = await response.json()

      console.log('[RichTextEditor] Upload response:', data)

      if (data.file?.url && editor) {
        console.log('[RichTextEditor] Inserting image:', data.file.url)
        editor.chain().focus().setImage({ src: data.file.url }).run()
      } else {
        console.error('[RichTextEditor] No URL in response:', data)
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Failed to upload image. Please try again.')
    }
  }, [editor])

  const onImageButtonClick = () => {
    fileInputRef.current?.click()
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      handleImageUpload(file)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  if (!editor) {
    return null
  }

  return (
    <div className={`border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-600 p-2 flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 ${
            editor.isActive('bold') ? 'bg-slate-200 dark:bg-slate-700' : ''
          }`}
          title="Bold"
        >
          <span className="material-symbols-outlined text-xl">format_bold</span>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 ${
            editor.isActive('italic') ? 'bg-slate-200 dark:bg-slate-700' : ''
          }`}
          title="Italic"
        >
          <span className="material-symbols-outlined text-xl">format_italic</span>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 ${
            editor.isActive('strike') ? 'bg-slate-200 dark:bg-slate-700' : ''
          }`}
          title="Strikethrough"
        >
          <span className="material-symbols-outlined text-xl">strikethrough_s</span>
        </button>

        <div className="w-px bg-slate-300 dark:bg-slate-600 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 ${
            editor.isActive('heading', { level: 2 }) ? 'bg-slate-200 dark:bg-slate-700' : ''
          }`}
          title="Heading 2"
        >
          <span className="material-symbols-outlined text-xl">format_h2</span>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 ${
            editor.isActive('heading', { level: 3 }) ? 'bg-slate-200 dark:bg-slate-700' : ''
          }`}
          title="Heading 3"
        >
          <span className="material-symbols-outlined text-xl">format_h3</span>
        </button>

        <div className="w-px bg-slate-300 dark:bg-slate-600 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 ${
            editor.isActive('bulletList') ? 'bg-slate-200 dark:bg-slate-700' : ''
          }`}
          title="Bullet List"
        >
          <span className="material-symbols-outlined text-xl">format_list_bulleted</span>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 ${
            editor.isActive('orderedList') ? 'bg-slate-200 dark:bg-slate-700' : ''
          }`}
          title="Numbered List"
        >
          <span className="material-symbols-outlined text-xl">format_list_numbered</span>
        </button>

        <div className="w-px bg-slate-300 dark:bg-slate-600 mx-1" />

        <button
          type="button"
          onClick={onImageButtonClick}
          className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
          title="Insert Image"
        >
          <span className="material-symbols-outlined text-xl">image</span>
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Undo"
        >
          <span className="material-symbols-outlined text-xl">undo</span>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Redo"
        >
          <span className="material-symbols-outlined text-xl">redo</span>
        </button>
      </div>

      {/* Editor Content */}
      <div className="bg-white dark:bg-slate-900">
        <EditorContent editor={editor} />
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onFileChange}
        className="hidden"
      />
    </div>
  )
}
