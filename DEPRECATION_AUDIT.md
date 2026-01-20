# Deprecation Audit (Updated)

This list flags routes/features that appear incomplete or placeholder-only.
Items marked "Resolved" have been addressed.

## Teacher App
- `/teacher/assessments/[assessmentId]` (`teacher-app/app/teacher/assessments/[assessmentId]/page.tsx`)
  - Resolved: redirects to the real builder route to avoid 404s.
- `/api/teacher/ai/generate-feedback` (removed)
  - Resolved: placeholder route removed; no current consumers.
- `/api/teacher/ai/cleanup-transcript` (removed)
  - Resolved: placeholder route removed; no current consumers.

## Admin App
- No obvious placeholder routes found in UI. Messaging and data pages appear implemented.

## Student App
- No obvious placeholder routes found in UI. Live sessions and recordings are implemented.

## Next Step
- Confirm any additional placeholder routes to remove or wire up.
