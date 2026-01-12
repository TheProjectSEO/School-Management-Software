# Teacher-to-Student Data Flow Analysis

**Date:** December 29, 2025
**Scope:** MSU School Management Software (teacher-app & student-app)

---

## Executive Summary

This document analyzes the data flow between the teacher and student applications, identifies gaps, and documents the newly implemented announcement system.

---

## 1. Current Architecture Overview

### Teacher App
- **Stack:** Next.js 14, Tailwind CSS, Supabase
- **Routes:** 18 pages (14 fully implemented, 4 placeholder)
- **Components:** 28 reusable components
- **Primary Functions:** Content creation, grading, assessment management, live sessions

### Student App
- **Stack:** Next.js 14, Tailwind CSS, Supabase
- **Routes:** 12+ pages (all implemented)
- **Components:** 35+ reusable components
- **Primary Functions:** Learning, assessments, progress tracking, notifications

---

## 2. Data Flow Gaps Identified

### 2.1 Content Creation (Teacher → Student)

| Feature | Teacher App Status | Student App Status | Gap |
|---------|-------------------|-------------------|-----|
| Module Creation | UI exists, no save handlers | Read-only works | **Missing: Write API routes** |
| Lesson Creation | UI placeholder only | Read-only works | **Missing: Full CRUD** |
| Assessment Creation | UI 40% complete | Read/Submit works | **Missing: Question builder** |
| Question Bank | Empty state only | N/A | **Not implemented** |
| Rubrics | Empty state only | N/A | **Not implemented** |
| File Uploads | UI exists, not functional | Download works | **Missing: Upload handlers** |

### 2.2 Communication (Teacher ↔ Student)

| Feature | Before | After (Fixed) |
|---------|--------|---------------|
| Announcements | **NOT IMPLEMENTED** | ✅ Fully implemented |
| Direct Messages | Exists in schema | UI partial |
| Live Sessions | Implemented | N/A for students |

### 2.3 Grading (Teacher → Student)

| Feature | Teacher App | Student App | Status |
|---------|------------|-------------|--------|
| Score Entry | DAL exists | Can view | Works |
| Feedback | UI exists | Can view | Works |
| Grade Release | DAL exists | Gets notification | Works |

---

## 3. Announcement System Implementation

### 3.1 Database Schema Created

```sql
-- New table: teacher_announcements
CREATE TABLE teacher_announcements (
  id UUID PRIMARY KEY,
  school_id UUID REFERENCES schools(id),
  teacher_id UUID REFERENCES teachers(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  target_type announcement_target_type, -- 'section'|'grade'|'course'|'school'
  target_section_ids UUID[],
  target_grade_levels TEXT[],
  target_course_ids UUID[],
  priority announcement_priority, -- 'low'|'normal'|'high'|'urgent'
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  attachments JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- New table: announcement_reads (tracking)
CREATE TABLE announcement_reads (
  id UUID PRIMARY KEY,
  announcement_id UUID REFERENCES teacher_announcements(id),
  student_id UUID REFERENCES students(id),
  read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(announcement_id, student_id)
);

-- Modified: student_notifications
ALTER TABLE student_notifications
ADD COLUMN announcement_id UUID REFERENCES teacher_announcements(id);
```

### 3.2 Teacher App Implementation

**Files Created:**
| File | Purpose |
|------|---------|
| `/lib/dal/announcements.ts` | Full CRUD + targeting queries |
| `/app/api/announcements/route.ts` | GET list, POST create |
| `/app/api/announcements/[id]/route.ts` | GET, PATCH, DELETE single |
| `/app/api/announcements/[id]/publish/route.ts` | Publish & notify students |
| `/app/api/announcements/targets/route.ts` | Get available targets |
| `/components/teacher/CreateAnnouncementModal.tsx` | Creation UI |
| `/components/teacher/AnnouncementsTab.tsx` | List & manage UI |

**Features:**
- Target by section, grade level, course, or school-wide
- Priority levels: low, normal, high, urgent
- Expiration dates
- Preview recipient count before publishing
- Draft mode (save without publishing)

### 3.3 Student App Implementation

**Files Created:**
| File | Purpose |
|------|---------|
| `/lib/dal/announcements.ts` | Fetch targeted announcements |
| `/app/api/announcements/route.ts` | GET announcements for student |
| `/app/api/announcements/[id]/route.ts` | GET detail, POST mark as read |
| `/app/api/announcements/urgent/route.ts` | Dashboard urgent alerts |
| `/app/(student)/announcements/page.tsx` | Announcements page |
| `/app/(student)/announcements/AnnouncementsClient.tsx` | Client component |

**Features:**
- View all announcements targeted to student
- Filter by priority and read status
- Expandable content view
- Mark as read tracking
- Urgent announcements highlighted

### 3.4 Data Flow

```
Teacher creates announcement
       ↓
Selects target (section/grade/course/school)
       ↓
Publishes announcement
       ↓
Database function creates notifications
for all targeted students
       ↓
Students see in:
  - Notifications page (brief)
  - Announcements page (full content)
       ↓
Read status tracked in announcement_reads
```

---

## 4. Schema Integrity Issues Found

### 4.1 Missing Foreign Key Constraints

| Table | Column | Should Reference | Status |
|-------|--------|------------------|--------|
| `students` | `section_id` | `sections(id)` | ⚠️ Column exists, no FK |
| `students` | `grade_level` | N/A (free text) | ⚠️ Not normalized |

### 4.2 Grade Level Inconsistency

Current grade level values found in database:
- "Grade 7", "Grade 9", "10" (sections table)
- "3rd Year", "2nd Year" (students table)
- No standardization

**Recommendation:** Create `grade_levels` reference table with standardized codes.

---

## 5. Remaining Implementation Gaps

### Priority 1: Critical for Content Management
| Feature | Effort | Impact |
|---------|--------|--------|
| Assessment CRUD API | Medium | High |
| Module CRUD API | Medium | High |
| Question Builder | High | High |

### Priority 2: Enhanced Functionality
| Feature | Effort | Impact |
|---------|--------|--------|
| File Upload System | Medium | Medium |
| Rich Text Editor | Medium | Medium |
| Question Bank CRUD | High | Medium |

### Priority 3: Polish
| Feature | Effort | Impact |
|---------|--------|--------|
| Rubric Editor | High | Low |
| Drag-drop Ordering | Low | Low |
| Auto-save Drafts | Low | Low |

---

## 6. API Route Inventory

### Teacher App API Routes
| Route | Methods | Status |
|-------|---------|--------|
| `/api/announcements` | GET, POST | ✅ New |
| `/api/announcements/[id]` | GET, PATCH, DELETE | ✅ New |
| `/api/announcements/[id]/publish` | POST | ✅ New |
| `/api/announcements/targets` | GET, POST | ✅ New |
| `/api/teacher/sessions` | POST, PATCH | ✅ Exists |

### Student App API Routes
| Route | Methods | Status |
|-------|---------|--------|
| `/api/announcements` | GET | ✅ New |
| `/api/announcements/[id]` | GET, POST | ✅ New |
| `/api/announcements/urgent` | GET | ✅ New |
| `/api/assessments/[id]/start` | POST | ✅ Exists |
| `/api/assessments/[id]/questions` | GET | ✅ Exists |
| `/api/assessments/[id]/submit` | POST | ✅ Exists |
| `/api/progress/update` | POST | ✅ Exists |
| `/api/notifications/mark-read` | POST | ✅ Exists |

---

## 7. Database Functions Created

### `get_announcement_target_count()`
Calculates how many students will receive an announcement based on targeting parameters.

### `publish_announcement()`
Atomically publishes an announcement and creates notifications for all targeted students.

---

## 8. RLS Policies Created

### For `teacher_announcements`:
- Teachers can SELECT their own school's announcements
- Teachers can INSERT for their school
- Teachers can UPDATE/DELETE their own announcements

### For `announcement_reads`:
- Students can SELECT their own read records
- Students can INSERT their own read records

---

## 9. Type Definitions Added

### Teacher App (`/lib/dal/types.ts`)
```typescript
type AnnouncementTargetType = 'section' | 'grade' | 'course' | 'school'
type AnnouncementPriority = 'low' | 'normal' | 'high' | 'urgent'

interface Announcement { ... }
interface CreateAnnouncementInput { ... }
interface UpdateAnnouncementInput { ... }
```

### Student App (`/lib/dal/types.ts`)
```typescript
interface Announcement {
  // Full announcement data with teacher info
  is_read?: boolean // Computed from announcement_reads
}

interface AnnouncementRead {
  announcement_id: string
  student_id: string
  read_at: string
}
```

---

## 10. Navigation Updates

### Student App Sidebar
Added new navigation item:
```typescript
{ href: "/announcements", icon: "campaign", label: "Announcements" }
```

---

## 11. Recommendations

### Short-term (Next Sprint)
1. Add the database migration for announcements (review with DBA)
2. Test announcement publishing with real sections/grades
3. Add announcement count badge to sidebar

### Medium-term
1. Implement assessment CRUD in teacher app
2. Add file upload support for attachments
3. Create question builder component

### Long-term
1. Standardize grade levels across the system
2. Add the missing FK constraint on students.section_id
3. Implement full content management system

---

## Appendix: File Locations

### Teacher App
```
/lib/dal/announcements.ts
/app/api/announcements/route.ts
/app/api/announcements/[id]/route.ts
/app/api/announcements/[id]/publish/route.ts
/app/api/announcements/targets/route.ts
/components/teacher/CreateAnnouncementModal.tsx
/components/teacher/AnnouncementsTab.tsx
```

### Student App
```
/lib/dal/announcements.ts
/lib/dal/types.ts (updated)
/app/api/announcements/route.ts
/app/api/announcements/[id]/route.ts
/app/api/announcements/urgent/route.ts
/app/(student)/announcements/page.tsx
/app/(student)/announcements/AnnouncementsClient.tsx
/components/layout/Sidebar.tsx (updated)
```
