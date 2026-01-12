# Quick Start Guide - MSU Teacher App

## What's Been Built (Phase 1)

✅ **Complete Foundation**
- Next.js 14 with App Router
- TypeScript with strict mode
- Tailwind CSS with MSU brand colors
- Responsive layout with sidebar navigation
- Supabase integration setup

✅ **Pages Created**
1. **Landing Page** (`/`) - Welcome page with feature overview
2. **Teacher Registration** (`/teacher-register`) - Full registration flow
3. **Login Page** (`/login`) - Login with role detection ready
4. **Teacher Dashboard** (`/teacher`) - Interactive dashboard with:
   - Today's sessions (live and upcoming)
   - Grading inbox summary
   - Pending releases
   - Draft content list
   - Attendance alerts

✅ **Placeholder Pages** (Coming Soon UI)
- My Classes (`/teacher/classes`)
- My Subjects (`/teacher/subjects`)
- Assessments (`/teacher/assessments`)
- Grading Inbox (`/teacher/submissions`)
- Gradebook (`/teacher/gradebook`)
- Attendance (`/teacher/attendance`)
- Calendar (`/teacher/calendar`)
- Messages (`/teacher/messages`)
- Students (`/teacher/students`)
- Settings (`/teacher/settings`)

✅ **Components Built**
- `BrandLogo` - Single source of truth for logo
- `TeacherShell` - Main layout wrapper
- `TeacherSidebar` - Navigation with 11 menu items
- `Button` - 4 variants (primary, secondary, outline, ghost)
- `Input` - With optional icon support
- `Card` - Consistent card styling
- `PlaceholderPage` - Reusable "coming soon" template

## Running the App

1. **Install dependencies** (already done):
```bash
npm install
```

2. **Add logo** (required):
   - Place your MSU logo at: `public/brand/logo.png`
   - Recommended size: 150x40px or similar aspect ratio

3. **Set up environment** (optional for now):
```bash
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials
```

4. **Start development server**:
```bash
npm run dev
```

5. **Open in browser**:
   - Visit: http://localhost:3001
   - Landing page will load
   - Click "Register as Teacher" to see registration form
   - Click "Sign In" to see login page
   - Navigate to `/teacher` to see dashboard (no auth required yet)

## What to Build Next (Phase 2)

### 1. Database Setup
Create Supabase migrations in order:
- `001_teacher_profiles.sql` - Teacher identity tables
- `002_teacher_content.sql` - Transcripts, notes, assets
- `003_teacher_live_sessions.sql` - Live sessions & attendance
- `004_teacher_assessments.sql` - Question banks, rules
- `005_teacher_rubrics.sql` - Rubric templates
- `006_teacher_communication.sql` - Announcements, discussions
- `007_teacher_rls_policies.sql` - Row Level Security

### 2. Data Access Layer
Create functions in `lib/dal/teacher/`:
- `getCurrentTeacher()`
- `getTeacherAssignments(teacherId)`
- `getTeacherSubjects(teacherId)`
- `createModule(courseId, data)`
- `publishModule(moduleId)`
- etc.

### 3. API Routes
Build in `app/api/teacher/`:
- Profile management
- Module CRUD
- Assessment builder
- Grading endpoints
- Attendance tracking
- Live sessions
- Messaging

### 4. Authentication
- Connect registration form to Supabase Auth
- Implement login with role detection
- Add middleware for protected routes
- Fetch real teacher profile data

## File Structure

```
teacher-app/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx                 ✅ Built
│   │   └── teacher-register/page.tsx      ✅ Built
│   ├── teacher/
│   │   ├── layout.tsx                     ✅ Built
│   │   ├── page.tsx                       ✅ Built (Dashboard)
│   │   ├── classes/page.tsx               ✅ Placeholder
│   │   ├── subjects/page.tsx              ✅ Placeholder
│   │   ├── assessments/page.tsx           ✅ Placeholder
│   │   ├── submissions/page.tsx           ✅ Placeholder
│   │   ├── gradebook/page.tsx             ✅ Placeholder
│   │   ├── attendance/page.tsx            ✅ Placeholder
│   │   ├── calendar/page.tsx              ✅ Placeholder
│   │   ├── messages/page.tsx              ✅ Placeholder
│   │   ├── students/page.tsx              ✅ Placeholder
│   │   └── settings/page.tsx              ✅ Placeholder
│   ├── layout.tsx                         ✅ Built
│   ├── page.tsx                           ✅ Built (Landing)
│   └── globals.css                        ✅ Built
├── components/
│   ├── brand/
│   │   └── BrandLogo.tsx                  ✅ Built
│   ├── layout/
│   │   ├── TeacherShell.tsx               ✅ Built
│   │   └── TeacherSidebar.tsx             ✅ Built
│   └── ui/
│       ├── Button.tsx                     ✅ Built
│       ├── Input.tsx                      ✅ Built
│       ├── Card.tsx                       ✅ Built
│       └── PlaceholderPage.tsx            ✅ Built
├── lib/
│   ├── supabase/
│   │   ├── client.ts                      ✅ Built
│   │   └── server.ts                      ✅ Built
│   └── utils.ts                           ✅ Built
├── package.json                           ✅ Built
├── tsconfig.json                          ✅ Built
├── tailwind.config.ts                     ✅ Built
└── next.config.mjs                        ✅ Built
```

## Design System

### Colors
- Primary (MSU Maroon): `#7B1113` → `bg-primary`, `text-primary`
- Primary Hover: `#961517` → `bg-primary-hover`
- MSU Gold: `#FDB913` → `bg-msu-gold`, `text-msu-gold`
- MSU Green: `#006400` → `bg-msu-green`

### Icons
- Library: Material Symbols Outlined
- Usage: `<span className="material-symbols-outlined">dashboard</span>`
- All icons: FILL:1, wght:400, GRAD:0, opsz:24

### Components
```tsx
// Primary Button
<Button variant="primary" size="lg">Click Me</Button>

// Input with Icon
<Input icon="email" placeholder="Enter email" />

// Card Container
<Card>Content here</Card>
```

## Next Steps Checklist

- [ ] Add MSU logo to `public/brand/logo.png`
- [ ] Set up Supabase project and add credentials to `.env.local`
- [ ] Run database migrations for teacher tables
- [ ] Implement authentication (register, login, role detection)
- [ ] Build data access layer functions
- [ ] Connect dashboard to real data
- [ ] Implement first complete feature (e.g., My Classes)

## Support

Refer to `CLAUDE.md` for complete specifications and implementation details.

---

**Built with:** Next.js 14, TypeScript, Tailwind CSS, Supabase
**Port:** 3001 (Student app runs on 3000)
