# Next.js Admin Portal - Automated Testing & Fix Protocol

## Setup

- **Start URL:** http://localhost:3000
- **Test Credentials:**
  - Username: `admin@msu.edu.ph`
  - Password: `Admin123!@#`
  - Role: Administrator (super_admin)

---

## Phase 1: Feature Audit

Test each feature systematically using Playwright MCP and document findings.

### Authentication & Navigation

1. **Sign In Flow**
   - Test login with provided credentials
   - Verify admin profile validation (must have active admin_profile record)
   - Check redirect to dashboard
   - Verify session persistence
   - Test error handling for non-admin users

2. **Admin Layout & Sidebar**
   - Verify AdminSidebar renders correctly
   - Check all navigation groups display properly
   - Test active state indicators
   - Verify 64px left margin for main content
   - Check responsive behavior on mobile/tablet

3. **Navigation Structure**
   - Test all sidebar menu items work
   - Verify routing to all pages
   - Check nested navigation (if any)
   - Test logout functionality from sidebar

### Core Features Testing

For each feature below, check:
- ✅ Loads without errors (no console errors)
- ✅ Data displays correctly from Supabase
- ✅ User interactions work (buttons, forms, dropdowns, modals)
- ✅ Responsive design (mobile/desktop/tablet)
- ✅ Loading states appear appropriately (skeletons, spinners)
- ✅ Error handling works (form validation, API errors)
- ✅ Permissions enforced correctly
- ✅ Toast notifications display on actions

**If feature is working:** Mark as ✅ PASS in audit report
**If feature has issues:** Document the issue and proceed to Phase 2 for automated fix

---

## Feature Areas to Test

### 4. Dashboard (Home Page)

**URL:** `/`

**Components to Verify:**
- **Summary Statistics Cards (4 cards)**
  - Total Students count (with change %)
  - Total Teachers count (with change %)
  - Active Courses count (with change %)
  - Active Enrollments count (with change %)
  - Icons display correctly (Users, GraduationCap, BookOpen, ClipboardCheck)
  - Color coding: green for positive, red for negative

- **Charts Section (3 charts)**
  - **Enrollment Trends Chart**
    - Area chart renders
    - Monthly data displays correctly
    - X-axis (months) and Y-axis (count) labeled
    - Tooltip shows on hover
    - Data fetched from enrollments table

  - **Grade Distribution Chart**
    - Bar chart renders
    - Shows A, B, C, D, F distribution
    - Colors: green (A), blue (B), yellow (C), orange (D), red (F)
    - Y-axis shows count

  - **Attendance Overview Chart**
    - Pie chart renders
    - Shows Present, Late, Absent, Excused slices
    - Percentages display correctly
    - Legend shows correctly
    - Colors: green, yellow, red, blue

- **Recent Activity Feed**
  - Last 10 audit log entries display
  - Action icons show correctly (Create, Update, Delete, etc.)
  - Admin names link to profiles (if implemented)
  - Timestamps display in relative format
  - "View All" link navigates to audit logs

- **Quick Action Buttons (4 buttons)**
  - Import Students → navigates to `/users/import`
  - Add Teacher → opens modal or navigates to form
  - Bulk Enroll → navigates to `/enrollments/bulk`
  - Announcements → navigates to announcements page

**Data Loading:**
- Verify ISR with 5-minute revalidation works
- Check loading skeletons display during initial load
- Verify no hydration errors in console
- Check Supabase queries execute successfully

**Checklist:**
- [ ] All 4 stat cards render with correct data
- [ ] Change percentages calculate correctly
- [ ] All 3 charts render without errors
- [ ] Chart data is accurate
- [ ] Activity feed shows recent actions
- [ ] Quick action buttons navigate correctly
- [ ] Page revalidates every 5 minutes
- [ ] No console errors
- [ ] Responsive layout works

---

### 5. Students Management

**URL:** `/users/students`

**Components to Verify:**
- **Header Section**
  - Page title "Students Management"
  - Total students count displays
  - "Add Student" button present and functional
  - "Import Students" button navigates to `/users/import`

- **Filter Bar**
  - Search input (searches by name/email)
  - Status filter dropdown (All, Active, Inactive, Suspended)
  - Grade Level filter (All, 7, 8, 9, 10, 11, 12)
  - Section filter (if sections exist)
  - "Clear Filters" button works

- **Data Table**
  - Columns: Checkbox, Full Name, Email, LRN, Grade Level, Section, Status, Actions
  - Pagination displays (20 per page default)
  - Page navigation works (Previous, Next, page numbers)
  - Sorting works on columns (if implemented)
  - Selection checkboxes work
  - "Select All" checkbox works

- **Student Rows**
  - Full Name displays and is clickable (links to student detail)
  - Email displays correctly
  - LRN displays (Learner Reference Number)
  - Grade Level shows (7-12)
  - Section displays (or "Not Assigned")
  - Status badge renders with correct color:
    - Active: green
    - Inactive: gray
    - Suspended: red

- **Actions Dropdown (per row)**
  - "View Details" → navigates to `/users/students/[id]`
  - "Edit" → navigates to `/users/students/[id]/edit`
  - "Deactivate" → opens confirmation modal
  - "Suspend" → opens confirmation modal with reason field

- **Bulk Actions Bar** (shows when students selected)
  - Selected count displays: "X students selected"
  - "Bulk Deactivate" button
  - "Clear Selection" button
  - Confirmation modal for bulk deactivate

- **Export Button**
  - Dropdown shows CSV, Excel, PDF options
  - Export respects current filters
  - Download triggers correctly
  - File contains correct data

- **Add Student Modal** (if exists)
  - Form fields: Full Name, Email, LRN, Grade Level, Section
  - Validation works (required fields, email format)
  - Submit creates student via API
  - Success toast shows
  - Table refreshes with new student

**API Integration:**
- `GET /api/admin/users/students` - returns paginated list
- `POST /api/admin/users/students` - creates student
- `PUT /api/admin/users/students/[id]` - updates student
- `POST /api/admin/users/students/bulk-status` - bulk deactivate
- `GET /api/admin/users/students/export` - export data

**Checklist:**
- [ ] Page loads with student data
- [ ] Search filters results correctly
- [ ] Status filter works
- [ ] Grade level filter works
- [ ] Pagination works correctly
- [ ] Selection checkboxes work
- [ ] Student names link to detail pages
- [ ] Status badges display correct colors
- [ ] Actions dropdown works for each row
- [ ] Bulk deactivate works
- [ ] Export works for all formats
- [ ] Add student modal works (if exists)
- [ ] Form validation works
- [ ] API calls succeed
- [ ] No console errors

---

### 6. Teachers Management

**URL:** `/users/teachers`

**Components to Verify:**
- **Header Section**
  - Page title "Teachers Management"
  - Total teachers count displays
  - "Add Teacher" button present and functional

- **Filter Bar**
  - Search input (searches by name/email)
  - Status filter dropdown (All, Active, Inactive)
  - Department filter (All, Mathematics, Science, English, Filipino, Social Studies, MAPEH, TLE, Values Education)
  - "Clear Filters" button works

- **Data Table**
  - Columns: Checkbox, Full Name, Email, Employee ID, Department, Status, Actions
  - Pagination displays (20 per page default)
  - Page navigation works
  - Sorting works on columns (if implemented)
  - Selection checkboxes work
  - "Select All" checkbox works

- **Teacher Rows**
  - Full Name displays and is clickable (links to teacher detail)
  - Email displays correctly
  - Employee ID displays
  - Department displays
  - Status badge renders with correct color:
    - Active: green
    - Inactive: gray

- **Actions Dropdown (per row)**
  - "View Profile" → navigates to `/users/teachers/[id]`
  - "Edit" → navigates to `/users/teachers/[id]/edit`
  - "Deactivate" → opens confirmation modal
  - "Delete" → opens confirmation modal (if allowed)

- **Bulk Actions Bar** (shows when teachers selected)
  - Selected count displays: "X teachers selected"
  - "Bulk Deactivate" button
  - "Clear Selection" button
  - Confirmation modal for bulk deactivate

- **Export Button**
  - Dropdown shows CSV, Excel, PDF options
  - Export respects current filters
  - Download triggers correctly

- **Add Teacher Modal**
  - Opens on "Add Teacher" button click
  - Form fields:
    - Full Name (required)
    - Email (required, validated)
    - Employee ID (required)
    - Department (dropdown, required)
    - Phone Number (optional)
  - Loading spinner shows on submit
  - Validation messages display
  - Success toast on creation
  - Error toast on failure
  - Modal closes on success
  - Table refreshes with new teacher

**API Integration:**
- `GET /api/admin/users/teachers` - returns paginated list
- `POST /api/admin/users/teachers` - creates teacher
- `PUT /api/admin/users/teachers/[id]` - updates teacher
- `POST /api/admin/users/teachers/bulk-status` - bulk deactivate
- `GET /api/admin/users/teachers/export` - export data

**Checklist:**
- [ ] Page loads with teacher data
- [ ] Search filters results correctly
- [ ] Status filter works
- [ ] Department filter works
- [ ] Pagination works correctly
- [ ] Selection checkboxes work
- [ ] Teacher names link to detail pages
- [ ] Status badges display correct colors
- [ ] Actions dropdown works for each row
- [ ] Bulk deactivate works
- [ ] Export works for all formats
- [ ] Add teacher modal opens
- [ ] Form validation works
- [ ] Teacher creation succeeds
- [ ] API calls succeed
- [ ] No console errors

---

### 7. Bulk Import Users

**URL:** `/users/import`

**Components to Verify:**
- **Import Type Selection**
  - Two cards displayed side-by-side
  - **Students Import Card**
    - Icon displays (Users)
    - Title: "Import Students"
    - Description text
    - "Select" button works
  - **Teachers Import Card**
    - Icon displays (GraduationCap)
    - Title: "Import Teachers"
    - Description text
    - "Select" button works

- **Student Import Flow**
  - **Step 1: Download Template**
    - Template download button works
    - CSV file downloads with correct headers
    - Headers: Full Name, Email, Grade Level, LRN (optional), Section (optional), Phone (optional), Birth Date (optional), Gender (optional), Address (optional), Guardian Name (optional), Guardian Phone (optional), Guardian Email (optional)

  - **Step 2: Upload File**
    - File input accepts CSV only
    - File size validation (max 5MB or configured limit)
    - File preview shows before upload
    - "Upload" button enabled after file selected

  - **Step 3: Field Mapping**
    - CSV headers display
    - Dropdown for each field to map to database columns
    - Required fields highlighted
    - Validation: all required fields must be mapped
    - "Next" button disabled until required fields mapped

  - **Step 4: Validation**
    - Shows validation results
    - Lists invalid rows with error messages
    - Option to download error report
    - Option to proceed with valid rows only
    - "Import" button enabled if any valid rows

  - **Step 5: Processing**
    - Progress bar shows import progress
    - Current row number displays
    - Percentage complete displays
    - Cancel button works (if implemented)

  - **Step 6: Completion**
    - Success count displays
    - Failed count displays
    - List of failed rows with reasons
    - Option to download detailed report
    - "Import More" button returns to start
    - "View Students" button navigates to students list

- **Teacher Import Flow**
  - **Step 1: Download Template**
    - Template download button works
    - CSV file downloads with correct headers
    - Headers: Full Name, Email, Employee ID, Department (optional), Specialization (optional), Phone (optional), Hire Date (optional)

  - **Steps 2-6:** Same as student import flow but for teachers

- **BulkImportWizard Component**
  - Step indicator displays current step
  - Navigation buttons work (Back, Next, Cancel)
  - State persists across steps
  - Errors display appropriately
  - Loading states show during API calls

**API Integration:**
- `POST /api/admin/users/students/bulk-import` - imports students
- `POST /api/admin/users/teachers/bulk-import` - imports teachers

**Checklist:**
- [ ] Import type selection cards display
- [ ] Template download works for students
- [ ] Template download works for teachers
- [ ] File upload accepts CSV only
- [ ] File size validation works
- [ ] Field mapping interface works
- [ ] Required field validation works
- [ ] Row validation displays errors
- [ ] Progress bar updates during import
- [ ] Success/failure counts accurate
- [ ] Error report downloadable
- [ ] Navigation between steps works
- [ ] API calls succeed
- [ ] No console errors

---

### 8. Enrollments Management

**URL:** `/enrollments`

**Components to Verify:**
- **Summary Cards (4 cards)**
  - **Total Enrollments**
    - Count displays
    - Icon: ClipboardCheck
    - Color: Blue
  - **Pending Approvals**
    - Count displays
    - Icon: Clock
    - Color: Yellow/Orange
    - Shows number needing approval
  - **Active Enrollments**
    - Count displays
    - Icon: CheckCircle
    - Color: Green
  - **Dropped Enrollments**
    - Count displays
    - Icon: XCircle
    - Color: Red

- **Filter Bar**
  - Search input (searches by student/course name)
  - Status filter dropdown (All, Active, Pending, Completed, Dropped)
  - "Clear Filters" button works

- **Data Table**
  - Columns: Student Name, Course, Section, Status, Enrolled Date, Actions
  - Pagination displays
  - Page navigation works
  - Sorting works (if implemented)

- **Enrollment Rows**
  - Student Name displays and is clickable (links to `/users/students/[id]`)
  - Course name displays with course code
  - Section displays
  - Status badge renders with correct color:
    - Active: green
    - Pending: yellow
    - Completed: blue
    - Dropped: red
  - Enrolled Date displays in formatted date

- **Actions Dropdown (per row)**
  - **For Pending Enrollments:**
    - "Approve" → opens confirmation modal
  - **For Active Enrollments:**
    - "Transfer Section" → opens section selector modal
    - "Drop Enrollment" → opens reason modal
  - **For All Enrollments:**
    - "View Details" → shows enrollment detail modal

- **Approve Enrollment Modal**
  - Shows student name, course, section
  - Confirmation text
  - "Approve" button (green)
  - "Cancel" button
  - Loading state on submit
  - Success toast on approval
  - Table refreshes after approval

- **Transfer Section Modal**
  - Shows current section
  - Section dropdown (filtered to same course)
  - Shows available capacity for each section
  - Reason textarea (optional)
  - "Transfer" button (blue)
  - "Cancel" button
  - Validation: cannot transfer to same section
  - Success toast on transfer
  - Table refreshes after transfer

- **Drop Enrollment Modal**
  - Shows student name, course
  - Reason textarea (required)
  - "Drop Enrollment" button (red)
  - "Cancel" button
  - Validation: reason required
  - Confirmation checkbox: "I confirm dropping this enrollment"
  - Success toast on drop
  - Table refreshes after drop

- **Export Button**
  - CSV, Excel, PDF options
  - Export respects filters

**API Integration:**
- `GET /api/admin/enrollments` - returns paginated list
- `POST /api/admin/enrollments/[id]/approve` - approves enrollment
- `POST /api/admin/enrollments/[id]/transfer` - transfers section
- `POST /api/admin/enrollments/[id]/drop` - drops enrollment
- `GET /api/admin/enrollments/export` - export data

**Checklist:**
- [ ] All 4 summary cards display correctly
- [ ] Summary counts accurate
- [ ] Search filters results
- [ ] Status filter works
- [ ] Pagination works
- [ ] Student names link to profiles
- [ ] Status badges display correct colors
- [ ] Approve modal works
- [ ] Transfer section modal works
- [ ] Section dropdown populates correctly
- [ ] Drop enrollment modal works
- [ ] Reason validation works
- [ ] Export works for all formats
- [ ] Table refreshes after actions
- [ ] API calls succeed
- [ ] No console errors

---

### 9. Bulk Enrollment Wizard

**URL:** `/enrollments/bulk`

**Components to Verify:**
- **Step Indicator**
  - 5 steps displayed
  - Current step highlighted
  - Completed steps show checkmark
  - Future steps grayed out

- **Step 1: Select Course & Section**
  - Course dropdown populates from courses table
  - Displays course code and name
  - On course selection, sections load
  - Section cards display:
    - Section name
    - Current enrollment count / Capacity
    - Progress bar (green if space, red if full)
    - "Select" button (disabled if full)
  - Can only proceed if section selected
  - "Next" button enabled after selection

- **Step 2: Select Students**
  - Active students list displays
  - Search by student name works
  - Grade level filter works
  - Each student row shows:
    - Checkbox
    - Full Name
    - Grade Level
    - Current Section (if enrolled elsewhere)
  - "Select All" checkbox works
  - "Deselect All" button works
  - Selected count displays: "X students selected"
  - Validation: must select at least 1 student
  - "Back" button returns to Step 1
  - "Next" button enabled if students selected

- **Step 3: Review**
  - **Summary Panel:**
    - Selected course and section
    - Number of students to enroll
    - Section capacity check
    - Warning if exceeding capacity
  - **Students List:**
    - Table of selected students
    - Remove button per student
    - Can remove individuals before confirming
  - "Back" button returns to Step 2
  - "Confirm & Enroll" button enabled

- **Step 4: Processing**
  - Progress bar shows enrollment progress
  - Current student being processed displays
  - Percentage complete displays
  - Cannot navigate away during processing
  - Loading spinner visible

- **Step 5: Completion**
  - **Success Summary:**
    - Total students processed
    - Successfully enrolled count (green)
    - Failed count (red)
  - **Failed Enrollments Table** (if any):
    - Student name
    - Reason for failure (e.g., "Already enrolled", "Section full", "Validation error")
  - **Action Buttons:**
    - "Download Report" → CSV of results
    - "Enroll More Students" → returns to Step 1
    - "View Enrollments" → navigates to `/enrollments`

**API Integration:**
- `GET /api/admin/courses` - loads courses
- `GET /api/admin/courses/[id]/sections` - loads sections for course
- `GET /api/admin/users/students?status=active` - loads active students
- `POST /api/admin/enrollments/bulk` - processes bulk enrollment

**Checklist:**
- [ ] Step indicator displays correctly
- [ ] Course dropdown populates
- [ ] Sections load for selected course
- [ ] Section capacity displays correctly
- [ ] Full sections disabled
- [ ] Students list loads
- [ ] Student search works
- [ ] Grade filter works
- [ ] Selection checkboxes work
- [ ] Selected count accurate
- [ ] Review summary correct
- [ ] Can remove students in review
- [ ] Processing shows progress
- [ ] Completion shows results
- [ ] Failed enrollments listed with reasons
- [ ] Download report works
- [ ] Navigation buttons work
- [ ] API calls succeed
- [ ] No console errors

---

### 10. Attendance Reports

**URL:** `/reports/attendance`

**Components to Verify:**
- **Summary Statistics Cards (4 cards)**
  - **Average Attendance Rate**
    - Percentage displays (e.g., 87.5%)
    - Icon: BarChart3
    - Color: Blue
  - **Total Present**
    - Count displays
    - Icon: CheckCircle
    - Color: Green
  - **Total Absent**
    - Count displays
    - Icon: XCircle
    - Color: Red
  - **Total Late**
    - Count displays
    - Icon: Clock
    - Color: Yellow/Orange

- **Filter Bar**
  - **Date Range Selector:**
    - From Date input (date picker)
    - To Date input (date picker)
    - "Apply" button
  - **Quick Date Ranges:**
    - "Today" button
    - "This Week" button
    - "This Month" button
    - "This Quarter" button
    - Active range highlighted
  - **Grade Level Filter:**
    - Dropdown (All, 7, 8, 9, 10, 11, 12)
  - **Group By Selector:**
    - Dropdown (Section, Grade Level, Course, Date)
  - "Clear Filters" button

- **Charts Section (2 charts)**
  - **Attendance Trend Chart (ChartCard)**
    - Title: "Attendance Trend"
    - Area chart displays
    - X-axis: Dates
    - Y-axis: Attendance Rate (%)
    - Tooltip shows date and rate on hover
    - Data spans selected date range
    - Line color: blue/green gradient

  - **Attendance by Section Chart (ChartCard)**
    - Title: "Attendance by Section"
    - Horizontal bar chart displays
    - X-axis: Attendance Rate (%)
    - Y-axis: Section names
    - Bars color-coded by rate:
      - Green: ≥90%
      - Yellow: 75-89%
      - Orange: 60-74%
      - Red: <60%
    - Shows top 10 sections (or all if fewer)

- **Attendance Records Table**
  - Columns: Date, Section, Course, Total Students, Present, Absent, Late, Attendance Rate
  - **Date Column:**
    - Formatted date (e.g., "Jan 15, 2025")
  - **Section Column:**
    - Section name
  - **Course Column:**
    - Course code and name
  - **Total Students:**
    - Count of enrolled students
  - **Present Column:**
    - Count with green badge
    - Icon: CheckCircle
  - **Absent Column:**
    - Count with red badge
    - Icon: XCircle
  - **Late Column:**
    - Count with yellow badge
    - Icon: Clock
  - **Attendance Rate Column:**
    - Percentage with color coding:
      - Green badge: ≥90%
      - Yellow badge: 75-89%
      - Orange badge: 60-74%
      - Red badge: <60%
  - Pagination works
  - Sorting works (if implemented)

- **Export Button**
  - CSV, Excel, PDF options
  - Export respects date range and filters
  - Downloaded file contains:
    - Summary statistics
    - Detailed records
    - Chart data (if applicable)

**API Integration:**
- `GET /api/admin/reports/attendance` - returns attendance data
  - Query params: from, to, gradeLevel, groupBy
- `GET /api/admin/reports/attendance/export` - export data

**Checklist:**
- [ ] All 4 summary cards display correctly
- [ ] Statistics calculate accurately
- [ ] Date range selector works
- [ ] Quick date range buttons work
- [ ] Grade level filter works
- [ ] Group by selector works
- [ ] Attendance trend chart renders
- [ ] Chart data accurate for date range
- [ ] Attendance by section chart renders
- [ ] Bars color-coded correctly
- [ ] Records table displays data
- [ ] Color coding for attendance rates correct
- [ ] Pagination works
- [ ] Export works for all formats
- [ ] Filters apply to charts and table
- [ ] API calls succeed
- [ ] No console errors

---

### 11. Grades Reports

**URL:** `/reports/grades`

**Components to Verify:**
- Grade distribution statistics
- Performance analytics by:
  - Class/Section
  - Subject/Course
  - Individual student
- Grade breakdown by grading period
- Filtering options:
  - Academic year
  - Grading period (Q1, Q2, Q3, Q4)
  - Grade level
  - Section
  - Course
- Charts:
  - Grade distribution bar chart (A-F)
  - Performance trend line chart
  - Top performers list
  - At-risk students list
- Export capabilities

**Checklist:**
- [ ] Page loads without errors
- [ ] Grade statistics display
- [ ] Filters work correctly
- [ ] Charts render
- [ ] Data accuracy verified
- [ ] Export works
- [ ] No console errors

---

### 12. Progress Reports

**URL:** `/reports/progress`

**Components to Verify:**
- Student progress tracking metrics
- Growth indicators
- Trend analysis over time
- Comparison tools:
  - Student vs class average
  - Current vs previous grading period
  - Year-over-year growth
- Filtering options
- Visual analytics (charts/graphs)
- Export functionality

**Checklist:**
- [ ] Page loads without errors
- [ ] Progress metrics display
- [ ] Filters work correctly
- [ ] Charts render
- [ ] Comparisons calculate correctly
- [ ] Export works
- [ ] No console errors

---

### 13. School Settings

**URL:** `/settings/school`

**Components to Verify:**
- **School Profile Header**
  - School logo displays (or placeholder)
  - School name displays
  - School code displays
  - School type displays
  - Founded year displays
  - "Upload Logo" button works

- **Dynamic Stats Cards (4 cards)**
  - Total Students count
  - Total Teachers count
  - Active Courses count
  - Sections count
  - Icons display
  - Data fetches from Supabase

- **Three-Tab Interface**
  - Tab navigation works
  - Active tab highlighted
  - Content switches on tab click

  - **General Tab:**
    - **Form Fields:**
      - School Name (input, required)
      - School Code (input, required, read-only or auto-generated)
      - School Type (dropdown: State University, Private University, Public High School, Private High School, etc.)
      - Founded Year (number input or year picker)
      - Principal/Head Name (input)
      - Address (textarea)
      - City/Municipality (input)
      - Province (input or dropdown)
      - Postal Code (input)
    - **Field Validation:**
      - Required fields marked with asterisk
      - Validation messages display
      - Email format validation (if applicable)
    - Icon indicators next to labels (MapPin, Building2, etc.)

  - **Contact Tab:**
    - **Form Fields:**
      - Phone Number (input with icon)
      - Email Address (input with icon, email validation)
      - Website URL (input with icon, URL validation)
    - Icons: Phone, Mail, Globe
    - Info text: "You can add additional contact methods in Communication Settings"

  - **Branding Tab:**
    - **Logo Upload Section:**
      - Current logo displays (or placeholder)
      - "Upload New Logo" button
      - File input (accepts PNG, JPG, SVG)
      - File size limit display (e.g., "Max 2MB")
      - Recommended size text: "512x512 pixels"
      - Preview shows after file selection
      - "Save Logo" button
    - **Brand Colors Section (Read-Only):**
      - Primary Color display: #7B1113 (MSU Maroon)
        - Color swatch shows actual color
      - Accent Color display: #FDB913 (MSU Gold)
        - Color swatch shows actual color
      - Note: "To customize brand colors, please contact support"

- **Form State Management**
  - "Unsaved changes" indicator appears when form edited
  - "Save Changes" button enabled when dirty
  - "Cancel" button resets form
  - Loading state on save (spinner on button)
  - Success toast after save
  - Error toast on failure

- **Logo Upload Flow**
  - File selection opens file dialog
  - Image preview shows immediately
  - Upload progress shows (if large file)
  - Logo updates in header after save
  - Old logo removed from storage (cleanup)

**API Integration:**
- `GET /api/admin/settings/school` - loads settings
- `PUT /api/admin/settings/school` - updates settings
- `POST /api/admin/settings/school/logo` - uploads logo

**Checklist:**
- [ ] Page loads with school data
- [ ] Logo displays or placeholder shows
- [ ] Stats cards display correct counts
- [ ] All three tabs switch correctly
- [ ] General tab form populates
- [ ] Contact tab form populates
- [ ] Branding tab shows logo section
- [ ] Brand colors display with swatches
- [ ] Form validation works
- [ ] Required field validation works
- [ ] Email/URL format validation works
- [ ] "Unsaved changes" indicator works
- [ ] Save button saves data
- [ ] Success toast shows on save
- [ ] Cancel button resets form
- [ ] Logo upload works
- [ ] Logo preview shows
- [ ] Uploaded logo persists
- [ ] API calls succeed
- [ ] No console errors

---

### 14. Academic Settings

**URL:** `/settings/academic`

**Components to Verify:**
- **Four-Tab Interface**
  - Years, Grading, Attendance, Schedule tabs
  - Tab navigation works
  - Active tab highlighted

  - **Years Tab (Academic Years Management):**
    - **Academic Years List:**
      - Table displays: Year Label, Start Date, End Date, Status
      - "Current" badge on active year (green)
      - Edit icon per row
      - Delete icon per row (disabled for current year)
    - **Add Academic Year Button:**
      - Opens modal
      - Form fields:
        - Year Label (e.g., "2024-2025")
        - Start Date (date picker)
        - End Date (date picker)
        - "Set as Current Year" checkbox
      - Validation:
        - End date must be after start date
        - Year label format validation
      - Save creates new year
      - Success toast
    - **Edit Year Modal:**
      - Pre-populates with year data
      - Can change dates
      - Can change current status
      - Save updates year

  - **Grading Tab (Grading Periods Configuration):**
    - **Grading Periods List:**
      - 4 quarters displayed (Q1, Q2, Q3, Q4)
      - Each shows: Name, Short Name, Start Date, End Date, Weight %
      - Edit icon per quarter
      - Delete icon per quarter
    - **Edit Grading Period Modal:**
      - Form fields:
        - Period Name (e.g., "First Quarter")
        - Short Name (e.g., "Q1")
        - Start Date
        - End Date
        - Weight Percentage (number input, 0-100)
      - Validation:
        - All weights must sum to 100%
        - Dates must not overlap
        - End after start
      - Save updates period
    - **Weight Validation:**
      - Shows total weight at bottom
      - Warning if not 100%
      - Prevents save if invalid
    - **Grading Scale Section:**
      - Table: Letter Grade, Score Range, Description, Color
      - Rows: A (90-100), B (80-89), C (75-79), D (70-74), F (0-69)
      - Color swatches display
      - Edit button per grade
      - Can customize descriptions
      - Score ranges adjustable

  - **Attendance Tab (Attendance Requirements):**
    - **Form Fields:**
      - Passing Grade (number input, default 75)
      - Required Attendance Percentage (number input with %, default 80%)
      - Max Absences Allowed (number input, default 20)
      - Late Threshold Minutes (number input, default 15)
    - **Field Descriptions:**
      - Helper text below each field
      - Icons next to labels
    - **Save Button:**
      - Saves attendance settings
      - Success toast

  - **Schedule Tab (Class Schedule Settings):**
    - **Form Fields:**
      - Class Start Time (time picker, default 07:30)
      - Class End Time (time picker, default 17:00)
    - **Validation:**
      - End time must be after start time
    - **Save Button:**
      - Saves schedule settings
      - Success toast

- **Global Save/Cancel**
  - "Save All Changes" button at bottom
  - "Cancel" button resets all tabs
  - "Unsaved changes" indicator per tab

**API Integration:**
- `GET /api/admin/settings/academic` - loads all academic settings
- `PUT /api/admin/settings/academic` - updates settings
- `GET /api/admin/settings/academic-years` - loads academic years
- `POST /api/admin/settings/academic-years` - creates year
- `GET /api/admin/settings/grading-periods` - loads periods
- `PUT /api/admin/settings/grading-periods/[id]` - updates period

**Checklist:**
- [ ] All 4 tabs display
- [ ] Tab switching works
- [ ] Years tab loads academic years
- [ ] Add year modal works
- [ ] Edit year modal works
- [ ] Delete year works (not for current)
- [ ] Current year badge shows
- [ ] Grading tab loads periods
- [ ] Edit period modal works
- [ ] Weight percentage validation works
- [ ] Total weight displays
- [ ] Grading scale displays
- [ ] Attendance tab loads settings
- [ ] Attendance form works
- [ ] Schedule tab loads settings
- [ ] Time picker works
- [ ] Save buttons work per tab
- [ ] Success toasts show
- [ ] API calls succeed
- [ ] No console errors

---

### 15. Audit Logs

**URL:** `/audit-logs`

**Components to Verify:**
- **Summary Statistics Cards (4 cards)**
  - **Total Logs:**
    - Count displays
    - Icon: FileText
    - Color: Blue
  - **Today's Activity:**
    - Count displays
    - Icon: Clock
    - Color: Green
  - **Active Users:**
    - Count of unique users today
    - Icon: Users
    - Color: Purple
  - **Most Common Action:**
    - Action type name (e.g., "Update")
    - Icon: TrendingUp
    - Color: Orange

- **Activity Breakdown Badges**
  - Horizontal row of action type badges
  - Each badge shows:
    - Action icon
    - Action type name
    - Count
  - Types: Create, Update, Delete, Login, Logout, Export, Import, View
  - Color coding:
    - Create: green
    - Update: blue
    - Delete: red
    - Login: purple
    - Logout: gray
    - Export: orange
    - Import: cyan
    - View: yellow

- **Filter Bar**
  - **Search Input:**
    - Placeholder: "Search by action, entity, or user..."
    - Searches across action, entity_type, entity_name, user_name
  - **Action Type Filter:**
    - Dropdown: All, Create, Update, Delete, Login, Logout, Export, Import, View
  - **Entity Type Filter:**
    - Dropdown: All, Student, Teacher, Enrollment, Course, Setting, etc.
  - **Date Range Selector:**
    - From Date (date picker)
    - To Date (date picker)
    - Quick ranges: Today, This Week, This Month, All Time
  - "Clear Filters" button

- **Audit Logs Table**
  - Columns: Action (with icon), Entity Type, User, IP Address, Timestamp, Actions
  - **Action Column:**
    - Icon matching action type
    - Action description (e.g., "Created student")
    - Entity name (if applicable)
    - Color-coded badge
  - **Entity Type Column:**
    - Entity type name
    - Badge color coding
  - **User Column:**
    - User name
    - User email (smaller text)
    - User role badge (super_admin, school_admin, etc.)
  - **IP Address Column:**
    - IP address display
  - **Timestamp Column:**
    - Relative time (e.g., "2 hours ago")
    - Full timestamp on hover
  - **Actions Column:**
    - "View Details" button
    - Opens detailed log modal
  - Pagination works
  - Sorting works (by timestamp default, descending)

- **Detailed Log Modal**
  - Opens on "View Details" click
  - **Modal Content:**
    - **Header:**
      - Action type with icon
      - Action description
      - Close button (X)
    - **Entity Information:**
      - Entity Type
      - Entity ID
      - Entity Name
    - **User Information:**
      - User Name
      - User Email
      - User Role (badge)
    - **Request Information:**
      - IP Address
      - User Agent (browser/device info)
      - Timestamp (full format)
    - **Metadata Section:**
      - JSON display of additional metadata
      - Expandable/collapsible
      - Syntax highlighted (if possible)
      - Shows before/after values for updates
      - Shows validation errors for failed actions
  - "Close" button at bottom

- **Export Button**
  - CSV, Excel, PDF options
  - Export respects all filters
  - Downloaded file includes:
    - All visible columns
    - Metadata summary (not full JSON)

**API Integration:**
- `GET /api/admin/audit-logs` - returns paginated logs
  - Query params: search, actionType, entityType, from, to, page, limit
- `GET /api/admin/audit-logs/[id]` - returns detailed log
- `GET /api/admin/audit-logs/export` - export logs

**Checklist:**
- [ ] All 4 summary cards display
- [ ] Statistics calculate correctly
- [ ] Activity breakdown badges display
- [ ] Badge counts accurate
- [ ] Search filters results
- [ ] Action type filter works
- [ ] Entity type filter works
- [ ] Date range selector works
- [ ] Quick date ranges work
- [ ] Logs table displays data
- [ ] Action icons show correctly
- [ ] Color coding correct
- [ ] User role badges display
- [ ] IP addresses display
- [ ] Timestamps show relative time
- [ ] View details button works
- [ ] Detailed modal displays
- [ ] Metadata shows in modal
- [ ] JSON formatting correct
- [ ] Export works for all formats
- [ ] Pagination works
- [ ] Sorting works
- [ ] API calls succeed
- [ ] No console errors

---

### 16. Logout Functionality

**Verify:**
- Logout button in sidebar works
- Confirmation modal shows (optional)
- Session clears on logout
- Redirects to `/login`
- Cannot access protected routes after logout
- Forward navigation blocked (back button doesn't restore session)

**Checklist:**
- [ ] Logout button works
- [ ] Session terminates
- [ ] Redirect to login works
- [ ] Protected routes inaccessible
- [ ] No session data in browser storage

---

## Phase 2: Issue Documentation & Fix Execution

For every issue found in Phase 1, immediately proceed to fix using specialized agents.

### Fix Protocol

**For each issue identified:**

1. **Document the issue** in real-time
2. **Spawn appropriate fix agent** with loaded custom skills
3. **Agent implements the fix**
4. **Verify fix with Playwright**
5. **Mark as resolved** or escalate if manual review needed

---

### Agent Assignment Strategy

Create specialized agents for different issue categories:

#### **Authentication Agent**
- **Handles:** Login, logout, session management, admin profile validation, protected routes
- **Skills:** Next.js middleware, Supabase Auth, session storage, role-based access
- **Priority:** Critical

#### **Dashboard Agent**
- **Handles:** Dashboard metrics, charts (Recharts), data aggregation, ISR
- **Skills:** Server components, data fetching, chart configuration, statistics calculations
- **Priority:** Critical to High

#### **User Management Agent**
- **Handles:** Students/Teachers CRUD, bulk operations, status management
- **Skills:** TanStack Table, filtering, pagination, modal forms, Supabase queries
- **Priority:** Critical to High

#### **Bulk Import Agent**
- **Handles:** CSV parsing, field mapping, validation, bulk insert operations
- **Skills:** File upload, CSV processing, batch operations, error handling
- **Priority:** High

#### **Academic Management Agent**
- **Handles:** Enrollments, bulk enrollment, section management, approval flows
- **Skills:** Multi-step wizards, data validation, relational queries, transaction handling
- **Priority:** High

#### **Reports Agent**
- **Handles:** Attendance/Grades/Progress reports, analytics, data visualization
- **Skills:** Complex queries, aggregation, chart configuration, export functionality
- **Priority:** High to Medium

#### **Settings Agent**
- **Handles:** School settings, academic settings, form persistence, logo upload
- **Skills:** Form state management, file upload, settings CRUD, validation schemas
- **Priority:** Medium to High

#### **Audit Agent**
- **Handles:** Audit logs display, filtering, detailed views, compliance
- **Skills:** Log querying, metadata handling, date range filtering, JSON display
- **Priority:** Medium

#### **UI/Component Agent**
- **Handles:** Broken components, styling issues, responsive design, modals
- **Skills:** React components, Tailwind CSS, responsive patterns, accessibility
- **Priority:** High to Medium

#### **API/Data Agent**
- **Handles:** API routes, Supabase queries, data fetching, error handling
- **Skills:** Next.js API routes, Supabase client/server, error boundaries, loading states
- **Priority:** Critical to High

#### **Routing Agent**
- **Handles:** Navigation, redirects, active states, breadcrumbs, deep linking
- **Skills:** Next.js App Router, Link components, dynamic routes, navigation guards
- **Priority:** High

#### **Performance Agent** (Background)
- **Monitors:** Console errors, network failures, bundle size, ISR effectiveness
- **Skills:** Next.js optimization, bundle analysis, performance profiling
- **Priority:** Medium to Low

---

### Fix Workflow

```
For each feature tested:
  IF feature is working:
    ✅ Mark as PASS in audit report
    Continue to next feature

  ELSE IF issue found:
    1. Document issue details:
       - Feature name
       - Page URL
       - Issue description
       - Error messages/console logs
       - Screenshot (if applicable)
       - Expected behavior
       - Actual behavior
       - Severity assessment

    2. Determine severity:
       - CRITICAL: Blocks core functionality (login, data loss, system crash)
       - HIGH: Major feature broken (cannot manage users, enrollments fail)
       - MEDIUM: UX degradation (slow performance, confusing UI)
       - LOW: Minor polish needed (styling inconsistency, tooltip missing)

    3. Spawn appropriate agent:
       - Select agent based on feature area
       - Load custom skills for this project
       - Provide issue context with file paths
       - Include relevant Supabase schema info

    4. Agent implements fix:
       - Read relevant files (components, API routes, utils)
       - Analyze root cause (API error, component bug, data issue)
       - Implement solution following project patterns
       - Write clean, maintainable code
       - Add proper error handling
       - Ensure accessibility compliance

    5. Verify fix:
       - Re-run Playwright test for this feature
       - Check console for new errors
       - Verify fix doesn't break other features
       - Test edge cases (empty states, max data, validation)
       - Verify responsive design still works

    6. Document resolution:
       - What was changed (files modified)
       - Why this approach was chosen
       - Any trade-offs or limitations
       - Testing performed

    7. Update status:
       ✅ Mark as FIXED in audit report
       OR
       ⚠️ Mark as NEEDS MANUAL REVIEW if:
          - Requires architectural decision
          - Needs database migration
          - Involves security-sensitive code
          - Requires product owner input
          - Fix has significant performance implications
```

---

### Custom Skills to Load Per Agent

Each agent should load:
- **Project Coding Standards:**
  - Next.js 14+ App Router conventions
  - TypeScript strict mode
  - Supabase client patterns
  - Error handling standards

- **Component Architecture:**
  - Server vs Client components
  - Data fetching patterns
  - Form handling (controlled components)
  - Modal patterns
  - Table patterns (TanStack)

- **API Integration:**
  - Supabase query patterns
  - API route structure
  - Error response formats
  - Authentication middleware

- **Design System:**
  - Tailwind CSS classes
  - Color palette (MSU Maroon #7B1113, MSU Gold #FDB913)
  - Icon system (Material Symbols Outlined)
  - Component spacing/sizing
  - Typography scale

- **Accessibility:**
  - ARIA labels
  - Keyboard navigation
  - Screen reader support
  - Focus management
  - Color contrast

- **Performance:**
  - ISR configuration
  - Image optimization
  - Bundle size awareness
  - Lazy loading patterns

---

## Phase 3: Final Deliverables

Generate these markdown files in the project root:

### 1. `ADMIN_AUDIT_REPORT.md`

```markdown
# Admin Portal - Comprehensive Audit Report
**Date:** [Current Date]
**Tester:** Claude Code with Playwright MCP
**Environment:** Local Development (localhost:3000)

---

## Executive Summary

- **Total Feature Areas Tested:** 16
- ✅ **Passing:** X
- ❌ **Issues Found:** Y
- 🔧 **Fixed:** Z
- ⚠️ **Needs Manual Review:** N

### Critical Issues
[Count and brief list]

### High Priority Issues
[Count and brief list]

### Medium Priority Issues
[Count and brief list]

### Low Priority Issues
[Count and brief list]

---

## Test Environment Details

- **Application:** Admin Portal for School Management System
- **Framework:** Next.js 14+ (App Router)
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **UI Components:** TanStack Table, Recharts, Custom Components
- **Test Credentials:** admin@msu.edu.ph / Admin123!@#
- **Testing Tool:** Playwright MCP
- **Browser:** Chromium (headless)

---

## Detailed Test Results

### ✅ Passing Features

#### [Feature Name]
- **URL:** `/path/to/feature`
- **Components Tested:**
  - Component 1
  - Component 2
- **API Endpoints Tested:**
  - GET /api/endpoint
  - POST /api/endpoint
- **User Flows Verified:**
  - Flow 1
  - Flow 2
- **Notes:** [Any relevant observations]

[Repeat for all passing features]

---

### 🔧 Fixed Issues

#### 🔴 CRITICAL: [Issue Title]

- **Feature:** [Feature name]
- **URL:** `/path/to/feature`
- **Severity:** Critical
- **Impact:** [Blocks core functionality / Prevents data access / System crash]
- **User Impact:** [Describe how this affects admin users]

**Issue Description:**
[Detailed description of the problem]

**Error Messages:**
```
[Console errors, API errors, or user-facing error messages]
```

**Root Cause:**
[Analysis of why this issue occurred]

**Fix Applied:**
[Detailed description of the solution implemented]

**Files Modified:**
- `path/to/component.tsx` - [Specific changes]
- `path/to/api/route.ts` - [Specific changes]
- `path/to/utils/helper.ts` - [Specific changes]

**Code Changes:**
```typescript
// Before:
[Problematic code snippet]

// After:
[Fixed code snippet]
```

**Testing Performed:**
- [x] Feature functionality verified
- [x] Console errors cleared
- [x] API calls successful
- [x] Edge cases tested
- [x] Responsive design checked
- [x] No regression issues

**Verification Status:** ✅ Tested and confirmed working

**Screenshots:**
- Before: [Description or path]
- After: [Description or path]

---

[Repeat for all fixed issues, organized by severity]

---

### ⚠️ Needs Manual Review

#### 🔴 CRITICAL: [Issue Title]

- **Feature:** [Feature name]
- **URL:** `/path/to/feature`
- **Severity:** Critical
- **Impact:** [Description]

**Issue Description:**
[Detailed description]

**Why Manual Review Needed:**
[Complex architectural decision / Requires database migration / Security implications / Product owner decision needed / etc.]

**Attempted Automated Fix:**
[What the agent tried, if applicable]

**Blocking Factors:**
- [Factor 1]
- [Factor 2]

**Recommendation:**
[Suggested approach with pros/cons]

**Alternative Approaches:**
1. **Approach A:** [Description, pros, cons]
2. **Approach B:** [Description, pros, cons]

**Estimated Effort:** [Hours/Days]

**Dependencies:**
- [Dependency 1]
- [Dependency 2]

---

[Repeat for all issues needing manual review, organized by severity]

---

## Console Errors Log

### Critical Errors (Red)
```
[Timestamp] [Source] Error message
[Stack trace if applicable]
```

### Warnings (Yellow)
```
[Timestamp] [Source] Warning message
```

### Info Messages (Blue)
```
[Timestamp] [Source] Info message
```

---

## Network Failures

### Failed API Calls

#### POST /api/admin/users/students
- **Status:** 500 Internal Server Error
- **Request:**
  ```json
  [Request payload]
  ```
- **Response:**
  ```json
  [Error response]
  ```
- **Root Cause:** [Analysis]
- **Resolution:** [How fixed or needs manual review]

[Repeat for all network failures]

---

## Performance Observations

### Page Load Times
| Page | Load Time | Status |
|------|-----------|--------|
| Dashboard | 1.2s | ✅ Good |
| Students List | 800ms | ✅ Good |
| Bulk Import | 3.5s | ⚠️ Slow |

### Bundle Analysis
- **Total Bundle Size:** X MB
- **Largest Chunks:** [List]
- **Optimization Opportunities:** [List]

### Database Query Performance
- **Slow Queries Detected:** [Count]
- **Recommendations:** [List]

### ISR Effectiveness
- **Pages Using ISR:** [List]
- **Revalidation Times:** [List]
- **Cache Hit Rate:** X%

---

## Accessibility Audit

### WCAG 2.1 AA Compliance
- **Keyboard Navigation:** ✅ Pass / ⚠️ Issues Found
- **Screen Reader Support:** ✅ Pass / ⚠️ Issues Found
- **Color Contrast:** ✅ Pass / ⚠️ Issues Found
- **ARIA Labels:** ✅ Pass / ⚠️ Issues Found
- **Focus Management:** ✅ Pass / ⚠️ Issues Found

### Issues Found
[List accessibility issues with severity and recommendations]

---

## Security Observations

### Authentication & Authorization
- **Session Management:** ✅ Secure / ⚠️ Issues
- **Role-Based Access:** ✅ Working / ⚠️ Issues
- **API Endpoint Protection:** ✅ Protected / ⚠️ Issues
- **CSRF Protection:** ✅ Implemented / ⚠️ Missing

### Data Handling
- **Input Validation:** ✅ Present / ⚠️ Missing
- **XSS Prevention:** ✅ Protected / ⚠️ Vulnerable
- **SQL Injection Prevention:** ✅ Protected (using Supabase)
- **Sensitive Data Exposure:** ✅ No issues / ⚠️ Found issues

### Issues Found
[List security issues with severity and recommendations]

---

## Recommendations

### Immediate Action Items (Critical)
1. [Recommendation with rationale]
2. [Recommendation with rationale]

### High Priority Improvements
1. [Recommendation with rationale]
2. [Recommendation with rationale]

### Medium Priority Enhancements
1. [Recommendation with rationale]
2. [Recommendation with rationale]

### Long-term Optimizations
1. [Recommendation with rationale]
2. [Recommendation with rationale]

---

## Testing Statistics

- **Total Test Cases:** [Count]
- **Automated Tests:** [Count]
- **Manual Review Items:** [Count]
- **Total Time Spent:** [Hours]
- **Code Coverage:** [Percentage] (if measurable)

---

## Appendices

### A. Test Credentials Used
- Admin: admin@msu.edu.ph
- [Other test accounts if applicable]

### B. Browser/Environment Info
- Browser: Chromium 120.x
- OS: [macOS/Windows/Linux]
- Screen Sizes Tested: Desktop (1920x1080), Tablet (768x1024), Mobile (375x667)

### C. API Endpoints Reference
[Comprehensive list of all tested API endpoints]

### D. Component Inventory
[List of all major components tested]

---

## Sign-off

**Tested By:** Claude Code with Playwright MCP
**Date:** [Date]
**Status:** [Ready for Production / Requires Fixes / Requires Manual Review]

```

---

### 2. `ADMIN_FIXES_IMPLEMENTED.md`

```markdown
# Admin Portal - Fixes Implementation Log

**Date:** [Current Date]
**Total Fixes Applied:** X
**Success Rate:** Y%

---

## Critical Fixes (Blocking admin functionality)

### ✅ [Fix #1: Issue Title]

**Feature:** [Feature name]
**Severity:** Critical
**Impact:** [User impact description]

**Problem:**
[Concise description of the issue]

**Solution:**
[Concise description of the fix]

**Changes Made:**

1. **Modified `app/(admin)/users/students/page.tsx`:**
   - Fixed data fetching to handle empty states
   - Added error boundary for Supabase connection failures
   - Implemented loading skeleton

   ```typescript
   // Specific code change
   const { data, error } = await supabase
     .from('students')
     .select('*')
     .order('created_at', { ascending: false });

   if (error) {
     console.error('Error fetching students:', error);
     return <ErrorState message="Failed to load students" />;
   }
   ```

2. **Updated `app/api/admin/users/students/route.ts`:**
   - Added proper error handling for Supabase queries
   - Implemented validation middleware
   - Added logging for debugging

   ```typescript
   // Error handling improvement
   try {
     const { data, error } = await supabase
       .from('students')
       .select('*');

     if (error) throw error;
     return NextResponse.json(data);
   } catch (error) {
     console.error('API Error:', error);
     return NextResponse.json(
       { error: 'Failed to fetch students' },
       { status: 500 }
     );
   }
   ```

**Testing Performed:**
- [x] ✅ Feature loads successfully
- [x] ✅ Error handling works
- [x] ✅ Loading states display
- [x] ✅ Data fetches correctly
- [x] ✅ Console errors cleared
- [x] ✅ No regression in other features

**Verification:**
- Manual testing: ✅ Passed
- Playwright test: ✅ Passed
- Console errors: ✅ None

**Before/After:**
- **Before:** Students page showed blank screen with console error
- **After:** Students page loads with proper data and error handling

**Related Files:**
- `app/(admin)/users/students/page.tsx`
- `app/api/admin/users/students/route.ts`
- `components/ui/DataTable.tsx` (minor update)

**Agent:** User Management Agent
**Time to Fix:** 15 minutes
**Commit:** `fix: resolve students page data fetching issue` (if committed)

---

[Repeat for all critical fixes]

---

## High Priority Fixes (Major functionality)

[Same structure as above]

---

## Medium Priority Fixes (UX improvements)

[Same structure as above]

---

## Low Priority Fixes (Minor polish)

[Same structure as above]

---

## Fixes Summary by Category

### By Feature Area
| Feature Area | Critical | High | Medium | Low | Total |
|--------------|----------|------|--------|-----|-------|
| Authentication | 1 | 0 | 0 | 0 | 1 |
| Dashboard | 0 | 2 | 1 | 0 | 3 |
| User Management | 2 | 3 | 2 | 1 | 8 |
| Enrollments | 1 | 2 | 0 | 0 | 3 |
| Reports | 0 | 1 | 2 | 1 | 4 |
| Settings | 0 | 1 | 1 | 0 | 2 |
| Audit Logs | 0 | 0 | 1 | 1 | 2 |
| **Total** | **4** | **9** | **7** | **3** | **23** |

### By Agent Type
| Agent | Fixes Applied | Success Rate |
|-------|---------------|--------------|
| Authentication Agent | 1 | 100% |
| Dashboard Agent | 3 | 100% |
| User Management Agent | 8 | 100% |
| Academic Management Agent | 3 | 100% |
| Reports Agent | 4 | 100% |
| Settings Agent | 2 | 100% |
| Audit Agent | 2 | 100% |
| **Total** | **23** | **100%** |

### By Issue Type
| Issue Type | Count | Percentage |
|------------|-------|------------|
| API/Data Fetching | 8 | 35% |
| Component Rendering | 6 | 26% |
| Form Validation | 4 | 17% |
| UI/Styling | 3 | 13% |
| Error Handling | 2 | 9% |

---

## Files Modified Summary

### Most Modified Files
1. `app/(admin)/users/students/page.tsx` - 4 fixes
2. `app/api/admin/users/students/route.ts` - 3 fixes
3. `components/ui/DataTable.tsx` - 3 fixes
4. `app/(admin)/enrollments/page.tsx` - 2 fixes
5. `app/(admin)/reports/attendance/page.tsx` - 2 fixes

### Total Files Modified: X

---

## Code Quality Improvements

### Error Handling
- Added try-catch blocks to all API routes
- Implemented error boundaries for critical components
- Added user-friendly error messages

### Loading States
- Added loading skeletons to all data-heavy pages
- Implemented progressive loading for charts
- Added spinner for form submissions

### Validation
- Added client-side validation for all forms
- Implemented server-side validation in API routes
- Added proper error messages for validation failures

### Accessibility
- Added ARIA labels where missing
- Fixed keyboard navigation issues
- Improved focus management in modals

---

## Testing Coverage

### Pages Tested: 16/16 (100%)
### Components Tested: 45/45 (100%)
### API Routes Tested: 28/28 (100%)

---

## Performance Improvements

- Optimized Supabase queries (reduced from 15 to 5 per page load)
- Implemented pagination for large datasets
- Added ISR to dashboard (5-minute revalidation)
- Lazy loaded charts (reduced initial bundle by 150KB)

---

## Next Steps

### Recommended Follow-up
1. **Performance Monitoring:**
   - Set up Vercel Analytics
   - Monitor API response times
   - Track user engagement metrics

2. **Testing:**
   - Add unit tests for critical components
   - Add integration tests for API routes
   - Add E2E tests for critical user flows

3. **Documentation:**
   - Update API documentation
   - Create component documentation
   - Document deployment process

---

**Report Generated:** [Timestamp]
**Prepared By:** Claude Code Automated Testing & Fixing Protocol
```

---

### 3. `ADMIN_REMAINING_ISSUES.md`

```markdown
# Admin Portal - Remaining Issues Requiring Manual Review

**Date:** [Current Date]
**Total Issues:** X
**Estimated Total Effort:** Y hours/days

---

## 🔴 Critical Issues (X)

### Issue #1: [Issue Title]

**Feature:** [Feature name]
**URL:** `/path/to/feature`
**Priority:** Critical
**Estimated Effort:** X hours

**Issue Description:**
[Detailed description of the problem]

**Why Manual Review Needed:**
[Specific reason: architectural decision / database migration / security concern / product requirement]

**Impact Analysis:**
- **User Impact:** [How this affects admin users]
- **Business Impact:** [How this affects operations]
- **Security Impact:** [If applicable]
- **Data Integrity Impact:** [If applicable]

**Attempted Automated Fix:**
[What the agent tried and why it couldn't complete]

**Blocking Factors:**
- [Factor 1: e.g., "Requires decision on data migration strategy"]
- [Factor 2: e.g., "Needs approval for schema change"]
- [Factor 3: e.g., "Conflicts with existing business logic"]

**Recommendations:**

**Option A: [Approach Name]**
- **Description:** [Detailed explanation]
- **Pros:**
  - [Pro 1]
  - [Pro 2]
- **Cons:**
  - [Con 1]
  - [Con 2]
- **Effort:** X hours
- **Risk Level:** Low/Medium/High

**Option B: [Approach Name]**
- **Description:** [Detailed explanation]
- **Pros:**
  - [Pro 1]
  - [Pro 2]
- **Cons:**
  - [Con 1]
  - [Con 2]
- **Effort:** Y hours
- **Risk Level:** Low/Medium/High

**Recommended Option:** [A/B] because [rationale]

**Prerequisites:**
- [ ] [Prerequisite 1]
- [ ] [Prerequisite 2]

**Implementation Steps:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Files to Modify:**
- `path/to/file1.tsx` - [Expected changes]
- `path/to/file2.ts` - [Expected changes]
- `path/to/schema.sql` - [Expected changes]

**Testing Plan:**
- [ ] Unit tests for [component/function]
- [ ] Integration tests for [API route]
- [ ] E2E tests for [user flow]
- [ ] Manual testing of [specific scenarios]

**Dependencies:**
- [Dependency 1: e.g., "Requires Supabase migration"]
- [Dependency 2: e.g., "Depends on Issue #X being resolved first"]

**Notes:**
[Any additional context or considerations]

---

[Repeat for all critical issues]

---

## 🟠 High Priority Issues (X)

[Same structure as critical issues]

---

## 🟡 Medium Priority Issues (X)

[Same structure as critical issues]

---

## 🟢 Low Priority Issues (X)

[Same structure as critical issues]

---

## Summary by Category

### By Feature Area
| Feature Area | Critical | High | Medium | Low | Total |
|--------------|----------|------|--------|-----|-------|
| Dashboard | 1 | 0 | 1 | 0 | 2 |
| User Management | 0 | 2 | 0 | 1 | 3 |
| Enrollments | 1 | 1 | 0 | 0 | 2 |
| Reports | 0 | 0 | 2 | 0 | 2 |
| Settings | 0 | 1 | 0 | 0 | 1 |
| **Total** | **2** | **4** | **3** | **1** | **10** |

### By Reason for Manual Review
| Reason | Count | Percentage |
|--------|-------|------------|
| Architectural Decision Needed | 4 | 40% |
| Database Migration Required | 3 | 30% |
| Product Owner Input Required | 2 | 20% |
| Security Review Needed | 1 | 10% |

### By Estimated Effort
| Effort Range | Count |
|--------------|-------|
| < 2 hours | 3 |
| 2-4 hours | 4 |
| 4-8 hours | 2 |
| > 8 hours | 1 |

---

## Architecture & Design Recommendations

### Database Schema
1. **Recommendation:** [Description]
   - **Rationale:** [Why this is needed]
   - **Impact:** [What this will improve]
   - **Effort:** [Estimated hours/days]

2. **Recommendation:** [Description]
   - **Rationale:** [Why this is needed]
   - **Impact:** [What this will improve]
   - **Effort:** [Estimated hours/days]

### Component Architecture
1. **Recommendation:** [Description]
   - **Rationale:** [Why this is needed]
   - **Impact:** [What this will improve]
   - **Effort:** [Estimated hours/days]

### API Design
1. **Recommendation:** [Description]
   - **Rationale:** [Why this is needed]
   - **Impact:** [What this will improve]
   - **Effort:** [Estimated hours/days]

### Performance Optimization
1. **Recommendation:** [Description]
   - **Rationale:** [Why this is needed]
   - **Impact:** [What this will improve]
   - **Effort:** [Estimated hours/days]

---

## Refactoring Opportunities

### Code Duplication
- **Location:** [Files where duplication occurs]
- **Suggested Fix:** [Create shared component/utility]
- **Benefit:** [Reduced maintenance, improved consistency]
- **Effort:** [Hours]

### Component Complexity
- **Component:** [Component name]
- **Current Lines:** [Count]
- **Suggested Fix:** [Break into smaller components]
- **Benefit:** [Better testability, reusability]
- **Effort:** [Hours]

### Type Safety
- **Location:** [Files with type issues]
- **Suggested Fix:** [Add proper TypeScript types]
- **Benefit:** [Better IDE support, fewer runtime errors]
- **Effort:** [Hours]

---

## Future Enhancements

### Short-term (1-2 weeks)
- [ ] [Enhancement 1]
- [ ] [Enhancement 2]
- [ ] [Enhancement 3]

### Medium-term (1-2 months)
- [ ] [Enhancement 1]
- [ ] [Enhancement 2]
- [ ] [Enhancement 3]

### Long-term (3+ months)
- [ ] [Enhancement 1]
- [ ] [Enhancement 2]
- [ ] [Enhancement 3]

---

## Risk Assessment

### High Risk Items
1. **[Issue Title]**
   - **Risk:** [Description of risk]
   - **Mitigation:** [How to reduce risk]
   - **Probability:** Low/Medium/High
   - **Impact:** Low/Medium/High

### Medium Risk Items
[Same structure]

---

## Dependencies & Blockers

### External Dependencies
- [ ] [Dependency 1: e.g., "Waiting for Supabase feature release"]
- [ ] [Dependency 2: e.g., "Needs approval from stakeholder"]

### Internal Dependencies
- [ ] [Dependency 1: e.g., "Blocked by Issue #X"]
- [ ] [Dependency 2: e.g., "Requires completion of database migration"]

---

## Action Plan

### Immediate (This Week)
1. [ ] **[Task]** - Assigned to: [Name] - Deadline: [Date]
2. [ ] **[Task]** - Assigned to: [Name] - Deadline: [Date]

### Short-term (This Sprint)
1. [ ] **[Task]** - Assigned to: [Name] - Deadline: [Date]
2. [ ] **[Task]** - Assigned to: [Name] - Deadline: [Date]

### Medium-term (This Month)
1. [ ] **[Task]** - Assigned to: [Name] - Deadline: [Date]
2. [ ] **[Task]** - Assigned to: [Name] - Deadline: [Date]

---

## Sign-off

**Requires Review By:**
- [ ] Lead Developer
- [ ] Product Owner
- [ ] Security Team (for security-related issues)
- [ ] DevOps (for deployment-related issues)

**Prepared By:** Claude Code Automated Testing & Fixing Protocol
**Date:** [Date]
```

---

## Execution Instructions for Claude Code

### Prerequisites

1. **Ensure Development Server is Running:**
   ```bash
   cd /Users/adityaaman/Desktop/All Development/School management Software/admin-app
   npm run dev
   ```
   - Verify server runs on `http://localhost:3000`
   - Check console for any startup errors

2. **Verify Supabase Connection:**
   - Ensure `.env.local` has correct Supabase credentials
   - Test database connection
   - Verify admin user exists (admin@msu.edu.ph)

3. **Install Playwright (if needed):**
   ```bash
   npm install -D @playwright/test
   npx playwright install chromium
   ```

---

### Execution Workflow

#### Step 1: Initialize Testing Session
- Navigate to project directory
- Start development server if not running
- Initialize Playwright MCP
- Open browser to `http://localhost:3000`

#### Step 2: Authenticate
- Navigate to `/login`
- Enter credentials: `admin@msu.edu.ph` / `Admin123!@#`
- Verify successful login and redirect to dashboard
- Confirm admin session established

#### Step 3: Systematic Feature Testing (Phase 1)
- Follow the feature testing checklist (items 4-16)
- For each feature:
  1. Navigate to feature URL
  2. Verify all components render
  3. Test all interactions (clicks, form submissions, filters)
  4. Check for console errors
  5. Verify API calls succeed
  6. Test responsive design
  7. Document results (PASS ✅ or FAIL ❌)

#### Step 4: Issue Documentation & Fixing (Phase 2)
- **For each issue found:**
  1. **Document Immediately:**
     - Screenshot the issue
     - Copy console errors
     - Note expected vs actual behavior
     - Assign severity level

  2. **Spawn Appropriate Agent:**
     - Select agent based on issue category
     - Provide complete context
     - Load relevant file paths

  3. **Agent Implements Fix:**
     - Agent reads relevant files
     - Analyzes root cause
     - Implements solution
     - Tests fix locally

  4. **Verify Fix:**
     - Re-test feature with Playwright
     - Check console is clean
     - Verify no regressions
     - Mark as ✅ FIXED or ⚠️ NEEDS REVIEW

#### Step 5: Generate Deliverables (Phase 3)
- Create `ADMIN_AUDIT_REPORT.md` with:
  - Executive summary
  - All test results
  - Fixed issues documentation
  - Remaining issues
  - Performance observations
  - Recommendations

- Create `ADMIN_FIXES_IMPLEMENTED.md` with:
  - All fixes organized by severity
  - Code changes for each fix
  - Testing performed
  - Files modified

- Create `ADMIN_REMAINING_ISSUES.md` with:
  - Issues needing manual review
  - Multiple solution options
  - Implementation steps
  - Effort estimates
  - Dependencies

#### Step 6: Final Summary
- Provide concise summary to user:
  - Total features tested
  - Issues found and fixed
  - Issues requiring manual review
  - Key recommendations
  - Next steps

---

### Success Criteria

- ✅ All 16 feature areas systematically tested
- ✅ Issues categorized by severity (Critical/High/Medium/Low)
- ✅ Automated fixes implemented for all fixable issues
- ✅ Complex issues documented with solution options
- ✅ All changes verified with Playwright
- ✅ No new errors introduced by fixes
- ✅ Three deliverable markdown files generated
- ✅ Clean, professional documentation

---

### Quality Standards

#### For Fixes:
- **Code Quality:**
  - Follow existing project patterns
  - Use TypeScript strict mode
  - Add proper error handling
  - Include loading states
  - Ensure accessibility

- **Testing:**
  - Verify fix works as expected
  - Test edge cases
  - Check for regressions
  - Validate responsive design

- **Documentation:**
  - Clear description of issue
  - Clear description of fix
  - Code examples (before/after)
  - Testing evidence

#### For Issues Needing Manual Review:
- **Documentation:**
  - Comprehensive issue description
  - Multiple solution options
  - Pros/cons for each option
  - Clear recommendation
  - Implementation steps
  - Effort estimates

---

### Conservative Approach

**When to Mark for Manual Review:**
- Requires architectural change
- Needs database schema modification
- Involves security-sensitive code
- Requires product owner decision
- Fix has significant performance implications
- Affects critical business logic
- Solution is unclear or risky

**When to Implement Automated Fix:**
- Clear, localized issue
- Solution follows established patterns
- Low risk of side effects
- Can be thoroughly tested
- Doesn't require external approvals

---

## Notes

- **Priority Order:** Test features in the order listed (4-16)
- **Time Management:** Spend appropriate time per feature based on complexity
- **Documentation:** Document as you go, don't wait until the end
- **Communication:** Provide progress updates after each major section
- **Flexibility:** Adapt approach if unexpected issues arise
- **Completeness:** Ensure every feature is tested, even if time-consuming

---

**This comprehensive protocol ensures:**
✅ Systematic and thorough testing of all admin features
✅ Immediate fixing of issues when possible
✅ Clear documentation of complex issues for manual review
✅ Professional deliverables ready for stakeholder review
✅ Nothing slips through the cracks
✅ High-quality fixes that follow project standards

---

**Protocol Version:** 1.0
**Last Updated:** [Date]
**Maintained By:** Development Team
