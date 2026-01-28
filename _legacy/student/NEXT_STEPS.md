# MSU Live Classroom - Next Steps

## ✅ What Has Been Completed

### Backend Infrastructure (100% Complete)

1. **Database Schema** - 8 migrations ready to deploy
   - Subject areas taxonomy
   - Academic tracks (STEM, ABM, HUMSS)
   - Live sessions with Daily.co integration
   - Session reactions, Q&A, participants tracking
   - Lesson reactions and course discussions
   - Recording storage bucket with RLS policies

2. **MSU Foundation Data**
   - School setup with 9 sections
   - 3 academic tracks
   - Representative course catalog (Grade 10, 11, 12, BSCS, BSIT)
   - Grading periods and letter grade scale

3. **Daily.co Integration**
   - API client service (`lib/services/daily/client.ts`)
   - Recording management service (`lib/services/daily/recordings.ts`)
   - Environment configuration complete with your credentials

4. **API Routes**
   - Teacher routes: Create, start, end sessions
   - Student routes: Join, react, ask questions
   - All with proper authentication and authorization

### Configuration (100% Complete)

- ✅ Daily.co API key configured: `klase.daily.co`
- ✅ Dependencies installed: `@daily-co/daily-js`, `framer-motion`
- ✅ Environment variables set in `.env.local`

## 🚧 What Needs to Be Built

### Critical: Frontend Components (Phase 4)

**Without these, users cannot access the live classroom. These are the highest priority.**

#### 1. LiveSessionRoom Component
**File:** `components/live-sessions/LiveSessionRoom.tsx`

```typescript
// Key requirements:
// - Embed Daily.co using iframe or React SDK
// - Handle join/leave events
// - Track camera/mic state
// - Screen share controls
// - Leave session button
```

**Implementation guide:**
- Use `@daily-co/daily-react` library (you may need to install it)
- Or use iframe embed with `<DailyIframe callUrl={roomUrl} token={token} />`
- Reference: https://docs.daily.co/reference/daily-react

#### 2. Interaction Components

**ReactionsBar** (`components/live-sessions/ReactionsBar.tsx`)
```typescript
// Display emoji reactions: 🙋 ✋ 👍 👏 😕 ⚡ 🐌
// Show live counts from API
// POST to /api/live-sessions/[id]/react when clicked
```

**QAPanel** (`components/live-sessions/QAPanel.tsx`)
```typescript
// List questions with upvote buttons
// "Ask Question" input
// POST to /api/live-sessions/[id]/questions
// Use real-time subscription for live updates
```

**ParticipantsList** (`components/live-sessions/ParticipantsList.tsx`)
```typescript
// Show online participant count
// Avatar list with camera/mic indicators
// Use Supabase Presence API
```

**RecordingIndicator** (`components/live-sessions/RecordingIndicator.tsx`)
```typescript
// Fixed top-right position
// Pulsing red dot + "REC" text
// Only visible when recording_enabled && status === 'live'
```

#### 3. Main Pages

**Join Live Session** (`app/(student)/live-sessions/[id]/page.tsx`)
```
Layout:
┌─────────────────────────────────────────┐
│ [REC]              [Participants: 24]   │
├─────────────────────────────────────────┤
│                                          │
│      Daily.co Video Room (iframe)       │
│                                          │
├─────────────────────────────────────────┤
│ Reactions: 🙋👍👏😕⚡🐌                    │
├──────────────────┬──────────────────────┤
│ Session Info     │   Q&A Panel          │
│ - Title          │   [Ask Question]     │
│ - Time           │   Questions...       │
└──────────────────┴──────────────────────┘
```

**Recording Playback** (`app/(student)/subjects/[subjectId]/recordings/page.tsx`)
```typescript
// List all recorded sessions for a course
// Video player with signed URL from API
// Show session metadata (date, duration, participants)
```

**Lesson Reactions** (`components/student/lesson/LessonReactions.tsx`)
```typescript
// Compact bar: 👍 45 💡 12 😕 3 ❤️ 8 🎉 5
// POST to /api/lessons/[id]/react
// Real-time count updates
```

### Critical: Real-time Hooks (Phase 5)

**Without these, interactive features won't update in real-time.**

#### 1. `hooks/useLiveSessionPresence.ts`
```typescript
// Use Supabase Realtime Presence
// Track who's online in session
// Return participant count and list
```

#### 2. `hooks/useLiveReactions.ts`
```typescript
// Subscribe to session_reactions table
// Aggregate counts by reaction_type
// Filter out expired reactions
```

#### 3. `hooks/useLiveSessionQA.ts`
```typescript
// Subscribe to session_questions table
// Sort by upvotes DESC, created_at ASC
// Handle real-time updates and upvotes
```

#### 4. `hooks/useLessonReactions.ts`
```typescript
// Subscribe to lesson_reactions table
// Aggregate counts and track student's reaction
```

## 🗂️ Data Population (Medium Priority)

The full plan called for:
- **135+ courses** (currently ~40 representative samples)
- **1,200+ modules** (currently 0)
- **4,800+ lessons** with YouTube videos (currently 0)

### Options for Populating:

1. **Manual Entry** - Use admin interface to add courses/modules/lessons
2. **Bulk Import** - Create CSV import tool
3. **Data Generator** - Write script to generate from templates

**Recommendation:** Start with Grade 10-12 courses manually, expand as needed.

## 📋 Immediate Action Plan

### Step 1: Deploy Migrations (10 minutes)

```bash
# Option A: Using Supabase CLI
supabase db push

# Option B: Manual via Supabase Studio
# 1. Go to https://supabase.com/dashboard
# 2. Select your project
# 3. Go to SQL Editor
# 4. Copy/paste each migration file in order
# 5. Run each migration
```

**Migration order:**
1. `20260119000001_foundation_tables.sql`
2. `20260119000002_live_sessions.sql`
3. `20260119000003_student_interactions.sql`
4. `20260119000004_recording_storage.sql`
5. `20260119000010_msu_foundation.sql`
6. `20260119000011_grade10_courses.sql`
7. `20260119000012_grade11_courses.sql`
8. `20260119000013_grade12_bscs_bsit_courses.sql`

### Step 2: Build LiveSessionRoom Component (2-3 hours)

This is the most critical component. Recommended approach:

```bash
# Install Daily React SDK
npm install @daily-co/daily-react

# Create component file
# components/live-sessions/LiveSessionRoom.tsx
```

**Reference implementation:**
```typescript
import DailyIframe from '@daily-co/daily-react';

export function LiveSessionRoom({
  roomUrl,
  token,
  onLeave
}: LiveSessionRoomProps) {
  return (
    <DailyIframe
      url={roomUrl}
      token={token}
      showLeaveButton
      iframeStyle={{ width: '100%', height: '600px' }}
      onLeftMeeting={onLeave}
    />
  );
}
```

### Step 3: Build Interaction Components (3-4 hours)

1. Create `ReactionsBar.tsx` - use the API endpoint
2. Create `QAPanel.tsx` - with real-time subscription
3. Create `ParticipantsList.tsx` - with Presence API
4. Create `RecordingIndicator.tsx` - simple conditional render

### Step 4: Build Main Live Session Page (2-3 hours)

Combine all components into the main page layout.

### Step 5: Build Real-time Hooks (2-3 hours)

Use Supabase Realtime API for all hooks.

### Step 6: Test End-to-End (2 hours)

1. Teacher creates session
2. Teacher starts session
3. Student joins session
4. Test reactions, Q&A
5. End session and verify recording

## 📚 Resources & Documentation

### Daily.co
- [Quick Start Guide](https://docs.daily.co/guides/products/real-time-video-and-audio/get-started)
- [React SDK](https://docs.daily.co/reference/daily-react)
- [Meeting Tokens](https://docs.daily.co/reference/rest-api/meeting-tokens)

### Supabase
- [Realtime Subscriptions](https://supabase.com/docs/guides/realtime/postgres-changes)
- [Presence](https://supabase.com/docs/guides/realtime/presence)
- [Storage](https://supabase.com/docs/guides/storage)

### API Reference

Your API is now live at these endpoints:

**Teacher:**
- `POST /api/teacher/live-sessions` - Create session
- `GET /api/teacher/live-sessions` - List sessions
- `POST /api/teacher/live-sessions/:id/start` - Start session
- `POST /api/teacher/live-sessions/:id/end` - End session

**Student:**
- `POST /api/live-sessions/:id/join` - Join session
- `POST /api/live-sessions/:id/react` - Send reaction
- `GET /api/live-sessions/:id/react` - Get reactions
- `POST /api/live-sessions/:id/questions` - Ask question
- `GET /api/live-sessions/:id/questions` - List questions

## 🎯 Success Criteria

When complete, you should be able to:

1. ✅ Teacher creates a scheduled live session
2. ✅ Teacher starts session (Daily.co room created)
3. ✅ Student joins session (video room loads)
4. ✅ Student sends reactions (visible to all)
5. ✅ Student asks questions (appear in Q&A panel)
6. ✅ Teacher ends session
7. ✅ Recording processed and available for playback
8. ✅ Students can view past recordings

## ⚠️ Important Notes

### Daily.co Free Tier
- **10 concurrent rooms** max
- **100 participant-minutes** per month
- Sufficient for testing
- Upgrade to paid tier for production

### Supabase Storage
- 2GB per recording file limit
- Free tier includes 1GB storage
- Consider archiving old recordings to YouTube (unlisted)

### Performance
- Real-time subscriptions scale well up to ~100 concurrent users per channel
- For larger deployments, consider using Supabase Broadcast instead of Postgres Changes

## 🆘 Troubleshooting

### "Room not found" error
- Check `DAILY_API_KEY` is correct
- Verify `DAILY_DOMAIN` matches your Daily.co subdomain
- Check room was created successfully in `/api/teacher/live-sessions/[id]/start`

### Recording not saving
- Check Supabase storage bucket `session-recordings` exists
- Verify RLS policies allow teacher to upload
- Check Daily.co recording is enabled for your account

### Real-time not working
- Verify Supabase Realtime is enabled for your project
- Check tables are added to `supabase_realtime` publication
- Ensure client is subscribed to correct channel

---

**Next Update:** After completing Phase 4 (Frontend Components)
**Estimated Time to MVP:** 8-12 hours of development work
