# Deprecation Audit (Proposed)

This list flags routes/features that appear incomplete or placeholder-only.
No removals have been made. Approval is required before deprecating.

## Teacher App
- `/teacher/assessments/[assessmentId]` (`teacher-app/app/teacher/assessments/[assessmentId]/page.tsx`)
  - Placeholder data and TODO comment; not wired to real assessment details.
- `/api/teacher/ai/generate-feedback` (`teacher-app/app/api/teacher/ai/generate-feedback/route.ts`)
  - Placeholder response; not connected to AI service.
- `/api/teacher/ai/cleanup-transcript` (`teacher-app/app/api/teacher/ai/cleanup-transcript/route.ts`)
  - Placeholder response; no implementation.

## Admin App
- No obvious placeholder routes found in UI. Messaging and data pages appear implemented.

## Student App
- No obvious placeholder routes found in UI. Live sessions and recordings are implemented.

## Next Step (Needs Approval)
- Confirm which routes should be deprecated/hidden.
- After approval: remove routes from navigation and add redirects where appropriate.
