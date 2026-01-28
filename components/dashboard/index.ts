/**
 * Dashboard Components
 *
 * Re-exports student dashboard components for convenient access.
 */

export {
  DashboardSkeleton,
  DashboardHeaderSkeleton,
  ContinueLearningSkeleton,
  AssessmentCardSkeleton,
  ProgressStatsSkeleton,
  QuickActionsSkeleton,
  NoCoursesContinueCard,
  NoUpcomingAssessmentsCard,
  DataLoadingError,
  NoDataAvailable,
  ProfileDataMissing,
} from "@/components/student/dashboard";

// Teacher dashboard widgets
export { default as StatsWidget } from "./StatsWidget";
export { default as TodaysSessionsWidget } from "./TodaysSessionsWidget";
export { default as GradingInboxWidget } from "./GradingInboxWidget";
export { default as PendingReleasesWidget } from "./PendingReleasesWidget";
export { default as DraftContentWidget } from "./DraftContentWidget";
export { default as AttendanceAlertsWidget } from "./AttendanceAlertsWidget";
export { default as UpcomingDeadlinesWidget } from "./UpcomingDeadlinesWidget";
export { default as RecentActivityWidget } from "./RecentActivityWidget";
