# MSU Platform - BUSINESS MODEL GAP ANALYSIS
**CRITICAL FOR SCHOOL SALES**

## 🎯 Business Model Requirements

**Target Market:** K-12 Schools, Colleges, Universities with enrollment overflow

**Value Proposition:**
> Schools with more applicants than capacity can use this platform to:
> - Accept online applications from students
> - Review and approve applications
> - Communicate with applicants
> - Enroll approved students
> - Deliver online education with live virtual classrooms

**Revenue Model:** Per-student or per-pack licensing

---

## 🔴 CRITICAL GAPS IDENTIFIED

### GAP #1: Student Self-Application System ❌ MISSING

**Required:**
- Public application form accessible via QR code
- Students can apply WITHOUT having an account first
- Form collects: Name, Email, Phone, Grade Level, Documents (Birth Cert, Report Card, etc.)
- Document upload (PDF, images)
- Application submission creates "pending" application

**What Exists:**
- ✅ Simple registration page (`app/(auth)/register/page.tsx`)
- ✅ Only collects: Name, Email, Student ID, Password
- ❌ NO document upload
- ❌ NO comprehensive application form
- ❌ NO QR code generation/scanning
- ❌ NO "applications" table in database
- ❌ Creates account immediately (not pending)

**Status:** 🔴 **BLOCKING - MUST BUILD**

---

### GAP #2: QR Code Enrollment ❌ MISSING

**Required:**
- Admin generates unique QR code for school enrollment
- QR code links to application form with school pre-filled
- Students scan QR → Fill form → Submit application
- QR code tracking (how many scans, applications from this QR)

**What Exists:**
- ❌ NO QR code generation
- ❌ NO QR code tracking
- ❌ NO public enrollment landing page

**Status:** 🔴 **BLOCKING - CORE FEATURE**

---

### GAP #3: Application Review Dashboard ❌ MISSING

**Required:**
- Admin sees list of "Pending Applications"
- View application details (all form fields)
- View uploaded documents (PDFs) in-app
- Approve → Creates student account + enrolls
- Reject → Sends rejection email
- Request Changes → Email student with what's needed
- Application status tracking

**What Exists:**
- ✅ Enrollments page shows "pending" status
- ❌ But "pending" enrollments assume student already exists
- ❌ NO applications table
- ❌ NO pending applications view
- ❌ NO document viewer
- ❌ NO approve/reject workflow for NEW applicants

**Status:** 🔴 **BLOCKING - ADMIN WORKFLOW INCOMPLETE**

---

### GAP #4: Document Management ❌ MISSING

**Required:**
- Students upload: Birth Certificate, Report Cards, Photos, etc.
- Admin views PDFs directly in browser
- Admin can download all documents as ZIP
- Document status (verified/unverified)
- Admin can request specific documents

**What Exists:**
- ✅ Storage buckets exist (`assignment-submissions`, `lesson-attachments`)
- ❌ NO application-documents bucket
- ❌ NO PDF viewer component
- ❌ NO document verification workflow

**Status:** 🔴 **BLOCKING - REQUIRED FOR ADMISSIONS**

---

### GAP #5: Communication with Applicants ⚠️ PARTIAL

**Required:**
- Admin emails applicant: "Please submit your birth certificate"
- Admin SMS applicant: "Your application is approved"
- Applicant receives notification
- Applicant can respond/resubmit
- Email templates for common messages

**What Exists:**
- ✅ `sms_queue` table (13 columns)
- ✅ `admin_send_message()` RPC function
- ✅ Messaging system between users
- ⚠️ **BUT** messaging requires both users to have accounts
- ❌ NO email to external applicants (who don't have accounts yet)
- ❌ NO SMS to external applicants
- ❌ NO notification templates

**Status:** 🟡 **PARTIAL - CAN MESSAGE ENROLLED USERS, NOT APPLICANTS**

---

### GAP #6: Application Status Workflow ❌ MISSING

**Required:**
```
Student Applies (via QR/form)
    ↓
Application: "Submitted" → Admin Reviews
    ↓
Admin Actions:
    ├─→ Approve → Create account → Enroll → Status: "Enrolled"
    ├─→ Reject → Status: "Rejected" → Send reason
    └─→ Request Info → Status: "Pending Info" → Email/SMS student

Student Resubmits → Status: "Re-submitted" → Back to Admin
```

**What Exists:**
- ✅ Enrollments have status field
- ✅ Status options: active, completed, dropped, pending
- ❌ NO application status workflow
- ❌ NO state machine for application lifecycle
- ❌ NO "request changes" feature
- ❌ Pending enrollments assume student exists

**Status:** 🔴 **BLOCKING - WORKFLOW DOESN'T MATCH BUSINESS MODEL**

---

### GAP #7: Bulk Operations for Admissions ⚠️ PARTIAL

**Required:**
- Bulk approve 50 applications at once
- Bulk assign to sections
- Bulk send emails ("You're accepted!")
- CSV export of applications
- CSV import of pre-approved students

**What Exists:**
- ✅ Bulk enrollment page exists (`../admin-app/(admin)/enrollments/bulk/`)
- ✅ CSV export functionality
- ❌ NO bulk approve for applications
- ❌ NO bulk communication templates

**Status:** 🟡 **PARTIAL - HAS BULK ENROLL, MISSING BULK ADMISSIONS**

---

## ✅ WHAT WORKS (Existing Features)

| Feature | Status | Notes |
|---------|--------|-------|
| Student Registration | ✅ EXISTS | Simple form, creates account immediately |
| Admin Views Enrollments | ✅ WORKS | Full UI with filters, search |
| Admin Creates Enrollment | ✅ WORKS | Manual enrollment of existing students |
| Admin Assigns Teachers | ✅ WORKS | Can update `courses.teacher_id` |
| Teachers Create Modules | ✅ WORKS | Full CRUD API |
| Teachers Add Lessons | ✅ WORKS | Full CRUD API |
| Teachers Upload Videos | ✅ WORKS | YouTube URLs or uploads |
| Students Study | ✅ WORKS | 92 lessons accessible |
| Live Sessions | ✅ WORKS | Full Daily.co integration |
| Adaptive Themes | ✅ WORKS | Playful (K-4) vs Professional (5-12) |
| Real-time Reactions | ✅ WORKS | 6 emoji types |
| Real-time Q&A | ✅ WORKS | With upvoting |
| Recording | ✅ WORKS | Auto-download to Supabase |
| Messaging (Enrolled) | ✅ WORKS | Admin↔Teacher↔Student |
| SMS Queue | ✅ EXISTS | Infrastructure ready |

---

## 🔴 WHAT'S MISSING (Critical for Business Model)

### Priority 1: Core Admissions Workflow ❌

1. **Student Application Form**
   - Comprehensive form (not just name/email/password)
   - Fields: Personal info, guardian info, previous school, documents
   - Multi-step form for better UX
   - Mobile-responsive for QR code access

2. **Application Documents Upload**
   - Birth certificate
   - Report cards (Form 137/138)
   - Good moral certificate
   - ID photo
   - Other requirements

3. **Applications Database Table**
```sql
CREATE TABLE student_applications (
  id UUID PRIMARY KEY,
  school_id UUID REFERENCES schools(id),

  -- Student Info
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  middle_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  birth_date DATE,
  gender TEXT,

  -- Guardian Info
  guardian_name TEXT,
  guardian_phone TEXT,
  guardian_email TEXT,

  -- Academic Info
  previous_school TEXT,
  grade_level TEXT NOT NULL,
  preferred_track TEXT, -- For SHS: STEM/ABM/HUMSS

  -- Documents (storage paths)
  birth_certificate_url TEXT,
  report_card_url TEXT,
  good_moral_url TEXT,
  photo_url TEXT,
  other_documents JSONB,

  -- Application Status
  status TEXT CHECK (status IN (
    'draft',           -- Student started but not submitted
    'submitted',       -- Submitted, awaiting review
    'under_review',    -- Admin is reviewing
    'pending_info',    -- Waiting for student to provide more info
    'approved',        -- Accepted
    'rejected'         -- Not accepted
  )) DEFAULT 'draft',

  -- Admin Actions
  reviewed_by UUID REFERENCES school_profiles(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  admin_notes TEXT,
  requested_documents TEXT[], -- What admin is asking for

  -- Tracking
  qr_code_id UUID,  -- Which QR code led to this application
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,

  -- Once approved, link to created student
  student_id UUID REFERENCES students(id)
);
```

4. **QR Code System**
```sql
CREATE TABLE enrollment_qr_codes (
  id UUID PRIMARY KEY,
  school_id UUID REFERENCES schools(id),

  code TEXT UNIQUE NOT NULL,  -- The QR code value
  name TEXT NOT NULL,  -- "2024 General Admission"
  description TEXT,

  -- Settings
  target_grade_levels TEXT[],  -- Which grades can apply
  available_tracks TEXT[],  -- STEM/ABM/HUMSS options
  max_applications INTEGER,  -- Limit applications from this QR

  -- Status
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,

  -- Stats
  scan_count INTEGER DEFAULT 0,
  application_count INTEGER DEFAULT 0,

  created_by UUID REFERENCES school_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

5. **Admin Application Review Page**
   - Route: `admin-app/(admin)/applications/page.tsx`
   - Shows pending applications
   - Document viewer
   - Approve/Reject buttons
   - Email/SMS student

6. **Public Application Landing Page**
   - Route: `/apply` or `/enroll`
   - Accessible without login
   - Multi-step form
   - File upload
   - QR code parameter: `/apply?qr=ABC123`

---

### Priority 2: Communication Infrastructure ⚠️

7. **Email to Non-Users**
   - Currently can only message users with accounts
   - Need: Email service for applicants
   - Sendgrid/Resend/AWS SES integration
   - Email templates

8. **SMS to Non-Users**
   - `sms_queue` exists but needs integration
   - Twilio/Vonage integration
   - SMS templates
   - Send to applicant phone numbers

---

### Priority 3: Document Verification ❌

9. **PDF Viewer Component**
   - Display uploaded documents in admin UI
   - Zoom, download, print
   - Mark as verified/rejected

10. **Document Checklist**
    - Admin configures required documents per grade level
    - System tracks which documents received
    - Visual checklist for admin

---

## 📊 Current vs Required Architecture

### CURRENT (What You Have)

```
Student Registers → Creates Account → Enrolled Immediately
                                           ↓
                                    Access to Courses
```

**Problem:** No approval process, no application review, no documents

### REQUIRED (For Business Model)

```
Student Scans QR Code → Fills Application Form → Uploads Documents
                                   ↓
                        Application Status: "Submitted"
                                   ↓
                        Admin Reviews Application
                                   ↓
                    ┌───────────────┼───────────────┐
                    ↓               ↓               ↓
                Approve         Request Info    Reject
                    ↓               ↓               ↓
            Create Account    Email Student    Email Student
                    ↓           (SMS too)        (reason)
            Assign Section      ↓
                    ↓           Student         End
            Enroll in         Resubmits
            Courses              ↓
                    ↓           Back to
            Student Can       Admin Review
            Access
```

---

## 🔧 What Needs to Be Built

### Phase 1: Application System (Critical)

1. **Database Tables** (2-3 hours)
   - `student_applications` table
   - `enrollment_qr_codes` table
   - `application_documents` table
   - `application_status_log` table (audit trail)

2. **Public Application Form** (8-10 hours)
   - Multi-step form component
   - Document upload with preview
   - Form validation
   - Save as draft
   - Submit application
   - Route: `/apply?qr=CODE`

3. **Admin Applications Dashboard** (10-12 hours)
   - List pending applications
   - Filter by status, grade, date
   - View application details modal
   - PDF document viewer
   - Approve/Reject/Request Info buttons
   - Bulk operations

4. **QR Code Generator** (4-6 hours)
   - Admin can create QR codes
   - Configure: Grade levels, tracks, expiry
   - Generate printable QR with school info
   - Track scans and conversions

### Phase 2: Communication (Important)

5. **Email Service Integration** (6-8 hours)
   - Integrate Resend/Sendgrid
   - Email templates for:
     - Application received
     - Documents requested
     - Application approved
     - Application rejected
   - Send to applicant email (no account needed)

6. **SMS Service Integration** (4-6 hours)
   - Integrate Twilio
   - SMS templates
   - Send to applicant phone
   - Use existing `sms_queue` table

### Phase 3: Workflow Automation (Nice to Have)

7. **Auto-Enrollment on Approval** (3-4 hours)
   - Admin clicks "Approve"
   - System creates auth account
   - Creates school_profile
   - Creates student record
   - Enrolls in section courses automatically
   - Sends welcome email with credentials

8. **Application Status Notifications** (3-4 hours)
   - Auto-email when status changes
   - SMS for urgent updates
   - Student portal to check application status

---

## 📋 Implementation Checklist

### Must-Have (For School Sales)

- [ ] **student_applications table** - Store application data
- [ ] **enrollment_qr_codes table** - QR code management
- [ ] **application_documents storage bucket** - Document uploads
- [ ] **Public application form** - Multi-step, mobile-friendly
- [ ] **QR code generator** - Admin creates enrollment QR codes
- [ ] **Admin applications dashboard** - Review/approve workflow
- [ ] **PDF document viewer** - View applicant documents
- [ ] **Approve button** - Creates student account + enrolls
- [ ] **Reject button** - Sends rejection email
- [ ] **Request Info button** - Emails student for more docs
- [ ] **Email service** - Send to applicants without accounts
- [ ] **SMS service** - Text applicants
- [ ] **Email templates** - Professional communications

### Nice-to-Have (Enhanced)

- [ ] Application analytics dashboard
- [ ] Automated document verification (AI)
- [ ] Payment integration (application fees)
- [ ] Interview scheduling
- [ ] Waitlist management
- [ ] Sibling discount tracking

---

## 🎯 Business Model Flow - COMPLETE

```mermaid
graph TD
    A[Admin Creates QR Code] --> B[Prints Posters with QR]
    B --> C[Student Scans QR Code]
    C --> D[Public Application Form Loads]
    D --> E[Student Fills Form]
    E --> F[Upload Documents]
    F --> G[Submit Application]
    G --> H[Status: Submitted]

    H --> I[Admin Reviews Application]
    I --> J{Decision}

    J -->|Approve| K[Create Account]
    K --> L[Assign to Section]
    L --> M[Auto-Enroll in Courses]
    M --> N[Send Welcome Email]
    N --> O[Student Can Login]

    J -->|Request Info| P[Email: Need Birth Cert]
    P --> Q[Student Uploads]
    Q --> I

    J -->|Reject| R[Email: Sorry]
    R --> S[Application Closed]
```

---

## 💰 Revenue Model Implications

### Current State: ❌ NOT SELLABLE

**Why?**
- Schools manually create accounts
- No application process
- No document review
- No admission workflow

**Can't pitch:** "Handle your overflow enrollment" - NO automation

### With Gaps Filled: ✅ SELLABLE

**Pitch:**
> "Handle 1,000+ applications with our automated system:
> - QR codes for easy application
> - All documents digital
> - Review and approve in minutes
> - Auto-enroll approved students
> - Full online learning platform"

**Pricing Model Becomes Viable:**
- $5-10 per student per year
- Or $500-1000 per month (unlimited students)
- Or tiered: 0-100 students ($200), 101-500 ($800), 500+ ($2000)

---

## 🚨 CRITICAL ASSESSMENT

### Can You Sell This Platform Today?

**❌ NO - Missing Core Admissions Features**

**What You CAN Sell:**
- ✅ Online learning platform (for already-enrolled students)
- ✅ Live virtual classrooms
- ✅ Teacher content management
- ✅ Student assessments and grading

**What You CANNOT Sell:**
- ❌ Automated admissions/enrollment
- ❌ Handle overflow applicants
- ❌ Self-service student applications
- ❌ Document management for admissions

### Blocker for School Sales

**Schools will ask:** "How do students apply?"
**Current answer:** "You manually create their accounts" ❌
**Required answer:** "Students scan QR code, fill form, upload docs. You review and approve with one click." ✅

---

## 🛠️ Immediate Action Plan

### Option A: Build Missing Features (40-60 hours)

**Week 1:**
- [ ] Create database tables (applications, QR codes, documents)
- [ ] Build public application form
- [ ] Build QR code generator
- [ ] Create document upload system

**Week 2:**
- [ ] Build admin applications dashboard
- [ ] Build PDF viewer
- [ ] Build approve/reject workflow
- [ ] Integrate email service

**Week 3:**
- [ ] Build SMS integration
- [ ] Create email templates
- [ ] Build application status portal for students
- [ ] Testing and refinement

**Result:** Full admissions platform ready for school sales

### Option B: Pivot Value Proposition (0 hours)

**Change pitch from:**
"Handle overflow enrollment and admissions"

**To:**
"Online learning platform for your existing students"

**Target:**
- Schools that already manage admissions separately
- Want online learning management only
- Don't need application workflow

**Revenue impact:** Smaller market, but immediate

---

## 📊 Feature Comparison

| Feature | Current System | Required for Business Model | Gap |
|---------|----------------|------------------------------|-----|
| Student Application Form | Simple register | Multi-step with documents | 🔴 LARGE |
| QR Code Enrollment | ❌ None | QR generation + tracking | 🔴 MISSING |
| Document Upload | Assignments only | Birth cert, report cards | 🔴 MISSING |
| Admin Reviews Applications | ❌ None | Full review dashboard | 🔴 MISSING |
| Approve/Reject Workflow | ❌ None | One-click approve → auto-enroll | 🔴 MISSING |
| Email Applicants | Only enrolled users | Anyone via email | 🔴 MISSING |
| SMS Applicants | Infrastructure only | Active integration | 🔴 MISSING |
| Document Verification | ❌ None | PDF viewer + verify | 🔴 MISSING |
| Bulk Admissions | Manual enroll only | Bulk approve applications | 🔴 MISSING |
| Student Checks Status | ❌ None | Self-service portal | 🔴 MISSING |

---

## 🎓 Schools' End-to-End Journey (Ideal)

### Step 1: School Setup (Admin)
1. Admin logs into admin-app ✅
2. Creates enrollment QR code ❌ MISSING
3. Prints posters/shares QR on social media ❌ MISSING

### Step 2: Student Applies
1. Student scans QR code ❌ MISSING
2. Fills application form ❌ MISSING (only basic register exists)
3. Uploads documents ❌ MISSING
4. Submits application ❌ MISSING
5. Receives confirmation email ⚠️ PARTIAL

### Step 3: Admin Reviews
1. Admin sees pending applications ❌ MISSING
2. Views student info and documents ❌ MISSING
3. Decision:
   - Approve → Auto-creates account ❌ MISSING
   - Request docs → Emails student ❌ MISSING
   - Reject → Sends rejection ❌ MISSING

### Step 4: Student Gets Enrolled
1. Approved student receives email with credentials ❌ MISSING
2. Student logs in ✅ WORKS
3. Sees assigned courses ✅ WORKS
4. Can study lessons ✅ WORKS
5. Can attend live classes ✅ WORKS

---

## ✅ Existing Features Are Excellent

### Post-Enrollment Experience: 🟢 EXCELLENT

Once a student is enrolled (manually or via future auto-enroll), they get:

- ✅ Access to all course content
- ✅ 92 lessons with videos
- ✅ Assessments and quizzes
- ✅ Live virtual classrooms (Daily.co)
- ✅ Real-time reactions in class
- ✅ Ask questions with upvoting
- ✅ Adaptive themes (playful for kids, professional for teens)
- ✅ Lesson reactions (feedback)
- ✅ Messaging with teachers
- ✅ View grades
- ✅ Download materials

**This part is production-ready and sellable!**

### Teacher Experience: 🟢 EXCELLENT

- ✅ Full content management (modules/lessons)
- ✅ Assessment creation
- ✅ Grading interface
- ✅ Attendance tracking
- ✅ Live session scheduling
- ✅ Student communication
- ✅ Analytics and reports

**This part works perfectly!**

### Admin Experience: 🟡 GOOD (Missing Admissions)

- ✅ Enrollment management (for existing students)
- ✅ User management
- ✅ Bulk enrollment
- ✅ Reporting
- ✅ Messaging
- ❌ **Missing:** Application review workflow
- ❌ **Missing:** QR code system
- ❌ **Missing:** Document management

---

## 🎯 GAP SUMMARY

### Critical Gaps for Business Model

| Gap | Impact | Est. Build Time |
|-----|--------|-----------------|
| Student Application Form | 🔴 BLOCKING | 10-12 hours |
| QR Code System | 🔴 BLOCKING | 6-8 hours |
| Applications Database | 🔴 BLOCKING | 3-4 hours |
| Admin Review Dashboard | 🔴 BLOCKING | 12-15 hours |
| Document Upload/Viewer | 🔴 BLOCKING | 8-10 hours |
| Email to Applicants | 🔴 BLOCKING | 6-8 hours |
| SMS to Applicants | 🟡 IMPORTANT | 4-6 hours |
| Auto-Enroll on Approve | 🟡 IMPORTANT | 4-6 hours |

**Total Estimate:** 53-69 hours (1.5-2 weeks of development)

---

## 🎤 Sales Pitch - Before vs After

### BEFORE (Current State)

**Sales Pitch:** ❌ Weak
> "We have an online learning platform where you can manually add students and they can study online with live classes."

**School Response:**
> "How do students apply? Do you handle our 500+ application overflow?"

**Your Answer:**
> "You'd need to manually create accounts for them."

**Result:** ❌ Not solving their problem

### AFTER (With Missing Features)

**Sales Pitch:** ✅ Strong
> "Handle 1,000+ student applications automatically:
> - Share one QR code on social media
> - Students apply online with documents
> - Review and approve with one click
> - Approved students auto-enrolled with credentials sent
> - Full online learning with live classrooms
> - Adaptive UI for all grade levels"

**School Response:**
> "Perfect! We get 800 applicants for 200 spots. This will save us weeks of manual work."

**Result:** ✅ Sold!

---

## 💡 RECOMMENDATION

### Path 1: Build Admissions Features First (Recommended)

**Pros:**
- Solves the actual business problem
- Differentiates from competitors
- Justifies higher pricing
- Schools will actually buy

**Cons:**
- 1.5-2 weeks of development
- Need email/SMS integration (costs money)

**Priority Order:**
1. Applications table + API (1 day)
2. QR code system (1 day)
3. Public application form (2-3 days)
4. Admin review dashboard (2-3 days)
5. Email integration (1 day)
6. Document viewer (1 day)
7. SMS integration (1 day)
8. Testing (2 days)

### Path 2: Launch Without Admissions

**Pros:**
- Can launch immediately
- Works for schools with own admissions process

**Cons:**
- Smaller market
- Less compelling pitch
- Lower pricing power

**Target:**
- Schools that already have students enrolled
- Want to add online learning
- Don't need application management

---

## 🏆 FINAL VERDICT

### What Works TODAY: 🟢 EXCELLENT LEARNING PLATFORM

**You have:**
- World-class online learning system
- Professional live classrooms
- Complete teacher tools
- Great student experience

**Can sell to:** Schools with existing enrollment processes

### What's Missing for CORE BUSINESS MODEL: 🔴 CRITICAL GAPS

**You need:**
- Student application system
- QR code enrollment
- Document management
- Approval workflow

**Required to sell to:** Schools with enrollment overflow (your target market!)

---

## 📌 IMMEDIATE NEXT STEPS

### Option A: Build for Business Model (2 weeks)

1. Today: Design application database schema
2. Day 2-3: Build public application form
3. Day 4-5: Build QR code system
4. Day 6-7: Build admin review dashboard
5. Day 8-9: Integrate email/SMS
6. Day 10-14: Testing and refinement

**Result:** Full admissions + learning platform

### Option B: Launch Learning Platform Only (Today)

1. Update pitch deck
2. Remove "admissions management" claims
3. Focus on "online learning for enrolled students"
4. Launch to schools with existing students

**Result:** Limited market, but immediate

---

## ✅ Conclusion

**Your Platform Status:**
- Learning Management: 95% ✅
- Live Classrooms: 100% ✅
- Teacher Tools: 100% ✅
- Student Experience: 100% ✅
- **Admissions/Applications: 10% ❌**

**To Match Your Business Model:**
Need to build the student application/admissions workflow described above.

**Estimated Development:** 50-70 hours (1.5-2 weeks)
**Priority:** 🔴 CRITICAL if targeting schools with enrollment overflow
**Current Market:** Can sell to schools who manage admissions separately

---

**Decision Required:** Build admissions features or pivot business model?
