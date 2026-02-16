'use client'

interface PDFViewerProps {
  fileUrl: string
  fileTitle: string
  fileType: string
  fileId: string
  isPlayful: boolean
}

export default function PDFViewer({ fileUrl, fileTitle, fileType, fileId, isPlayful }: PDFViewerProps) {
  const isPdf = fileType?.includes('pdf')
  const isPresentation = fileType?.includes('presentation') || fileType?.includes('powerpoint')

  const handleFullscreen = () => {
    const iframe = document.getElementById('pdf-viewer-iframe') as HTMLIFrameElement
    if (iframe) {
      iframe.requestFullscreen?.() || (iframe as any).webkitRequestFullscreen?.()
    }
  }

  const handleDownload = () => {
    // Track download
    fetch(`/api/student/attachments/${fileId}/download`, {
      method: 'POST'
    }).catch(err => console.error('Failed to track download:', err))
    // Open file in new tab for download
    window.open(fileUrl, '_blank')
  }

  return (
    <div className={`w-full rounded-xl overflow-hidden shadow-lg ${isPlayful ? 'bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'}`}>
      {/* Document Viewer Header */}
      <div className={`p-4 border-b flex items-center justify-between ${isPlayful ? 'bg-purple-100 border-purple-200' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'}`}>
        <div className="flex items-center gap-2">
          <span className={`material-symbols-outlined text-2xl ${isPlayful ? 'text-purple-600' : 'text-[#7B1113]'}`}>
            menu_book
          </span>
          <div>
            <h3 className={`font-bold ${isPlayful ? 'text-purple-900' : 'text-slate-900 dark:text-white'}`}>
              {isPlayful ? '📚 Reading Material' : 'Reading Material'}
            </h3>
            <p className={`text-xs ${isPlayful ? 'text-purple-600' : 'text-slate-500 dark:text-slate-400'}`}>
              {fileTitle || (isPdf ? 'PDF Document' : 'Presentation')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleFullscreen}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${isPlayful ? 'bg-purple-500 text-white hover:bg-purple-600' : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'}`}
          >
            <span className="material-symbols-outlined inline-block align-middle">
              fullscreen
            </span>
            <span className="ml-2 hidden sm:inline">Fullscreen</span>
          </button>
          <button
            onClick={handleDownload}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${isPlayful ? 'bg-pink-500 text-white hover:bg-pink-600' : 'bg-[#7B1113] text-white hover:bg-[#5a0c0e]'}`}
          >
            <span className="material-symbols-outlined inline-block align-middle">
              download
            </span>
            <span className="ml-2 hidden sm:inline">Download</span>
          </button>
        </div>
      </div>
      {/* Document Viewer */}
      <div className="relative bg-slate-100 dark:bg-slate-900">
        {isPdf ? (
          <iframe
            id="pdf-viewer-iframe"
            src={fileUrl}
            className="w-full h-[700px]"
            title="Reading Material PDF"
          />
        ) : isPresentation ? (
          <iframe
            id="presentation-viewer-iframe"
            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`}
            className="w-full h-[700px]"
            title="Reading Material Presentation"
          />
        ) : (
          <div className="w-full h-[700px] flex items-center justify-center">
            <div className="text-center p-8">
              <span className="material-symbols-outlined text-6xl text-slate-400 mb-4 block">
                description
              </span>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Preview not available for this file type
              </p>
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-[#7B1113] text-white rounded-lg hover:bg-[#5a0c0e]"
              >
                Download to View
              </button>
            </div>
          </div>
        )}
      </div>
      {/* Document Viewer Footer */}
      <div className={`p-3 border-t text-center ${isPlayful ? 'bg-purple-50 border-purple-200' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'}`}>
        <p className={`text-sm ${isPlayful ? 'text-purple-600' : 'text-slate-600 dark:text-slate-400'}`}>
          {isPlayful ? '💡 Tip: Use fullscreen mode for better reading experience!' : 'Use the fullscreen button for a better reading experience'}
        </p>
      </div>
    </div>
  )
}
