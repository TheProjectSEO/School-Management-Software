/**
 * Shared hooks index
 * Re-export all hooks for easy importing
 */

// Auth hooks (already exist in apps/web/hooks)
export { useAuth } from './useAuth'
export { usePermissions } from './usePermissions'
export { useRole } from './useRole'

// Real-time communication hooks
export { useRealtimeMessages } from './useRealtimeMessages'
export type { DirectMessage, MessageStatus, RealtimeMessage } from './useRealtimeMessages'

export { usePresence } from './usePresence'
export type { PresenceState } from './usePresence'

export { useRealtimeAnnouncements } from './useRealtimeAnnouncements'
export type { Announcement } from './useRealtimeAnnouncements'

export { useRealtimeNotifications } from './useRealtimeNotifications'

// Live session hooks
export { useLiveReactions } from './useLiveReactions'
export type { ReactionType } from './useLiveReactions'

export { useLiveSessionQA } from './useLiveSessionQA'
export type { SessionQuestion } from './useLiveSessionQA'

export { useLiveSessionPresence } from './useLiveSessionPresence'

// Lesson hooks
export { useLessonReactions } from './useLessonReactions'
export type { LessonReactionType } from './useLessonReactions'

// Admin hooks
export { useAdminRealtimeMessages } from './useAdminRealtimeMessages'

// Typing indicator hooks
export { useTypingIndicator } from './useTypingIndicator'
export type { TypingState } from './useTypingIndicator'
