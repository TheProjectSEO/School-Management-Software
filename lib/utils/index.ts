/**
 * Shared utilities index
 * Re-export all utility functions for easy importing
 */

export { cn } from './cn'
export {
  extractYouTubeVideoId,
  getYouTubeEmbedUrl,
  getYouTubeThumbnail
} from './video'
export { fetchWithAuth, apiCall } from './fetchWithAuth'
export {
  playNotificationSound,
  playMessageSound,
  playAlertSound,
  canPlaySound,
  initializeAudio,
  requestNotificationPermission,
  showBrowserNotification,
} from './notificationSound'
