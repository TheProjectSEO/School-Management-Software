# 🌐 klase.ph Deployment Plan - Vercel with Custom Subdomains

**Goal:** Deploy all 3 apps to klase.ph domain with subdomain routing

---

## 🎯 Domain Architecture

```
klase.ph                    → Landing page (login portal)
├─ student.klase.ph         → Student App
├─ teachers.klase.ph        → Teacher App
└─ admin.klase.ph           → Admin App
```

**All hosted on Vercel with custom domain configuration.**

---

## 📦 Deployment Strategy

### Option A: Monorepo with Vercel Projects (Recommended)

**Structure:**
```
klase-platform/
├─ apps/
│  ├─ landing/          → klase.ph (new - login portal)
│  ├─ student/          → student.klase.ph (current student-app)
│  ├─ teachers/         → teachers.klase.ph (current teacher-app)
│  └─ admin/            → admin.klase.ph (current admin-app)
├─ packages/
│  ├─ ui/               → Shared components
│  └─ database/         → Shared Supabase types
└─ vercel.json          → Monorepo configuration
```

**Vercel Setup:**
- 4 separate Vercel projects
- Each has custom domain
- Shared environment variables
- Single git repo

### Option B: Separate Repos (Simpler for Now)

**Structure:**
```
klase-ph-landing        → klase.ph
student-app             → student.klase.ph
teacher-app             → teachers.klase.ph
admin-app               → admin.klase.ph
```

**Vercel Setup:**
- 4 separate git repos
- 4 separate Vercel projects
- Each deployed independently

**Recommendation:** Start with Option B (simpler), migrate to A later

---

## 🏗️ Step-by-Step Deployment

### Phase 1: Create Landing Page (klase.ph)

**New Project:** `klase-landing`

**Features:**
```typescript
// pages/index.tsx - Landing Page

export default function KlaseLandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Klase" className="h-10" />
            <span className="text-2xl font-bold text-primary">klase.ph</span>
          </div>
          <div className="flex gap-4">
            <a href="#features" className="text-gray-700 hover:text-primary">Features</a>
            <a href="#pricing" className="text-gray-700 hover:text-primary">Pricing</a>
            <a href="#contact" className="text-gray-700 hover:text-primary">Contact</a>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center text-white mb-16">
          <h1 className="text-6xl font-bold mb-6">
            Complete School Management Platform
          </h1>
          <p className="text-2xl mb-8 text-white/90">
            Handle admissions, deliver online education, and manage your school - all in one platform
          </p>
        </div>

        {/* Login Portals */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Student Portal */}
          <a
            href="https://student.klase.ph"
            className="bg-white rounded-2xl p-8 text-center hover:shadow-2xl transition-all transform hover:-translate-y-2"
          >
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-5xl text-blue-600">
                school
              </span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Student Portal</h2>
            <p className="text-gray-600 mb-6">
              Access courses, join live classes, and track your progress
            </p>
            <div className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold">
              Student Login →
            </div>
          </a>

          {/* Teacher Portal */}
          <a
            href="https://teachers.klase.ph"
            className="bg-white rounded-2xl p-8 text-center hover:shadow-2xl transition-all transform hover:-translate-y-2"
          >
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-5xl text-purple-600">
                co_present
              </span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Teacher Portal</h2>
            <p className="text-gray-600 mb-6">
              Create content, manage classes, and conduct live sessions
            </p>
            <div className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold">
              Teacher Login →
            </div>
          </a>

          {/* Admin Portal */}
          <a
            href="https://admin.klase.ph"
            className="bg-white rounded-2xl p-8 text-center hover:shadow-2xl transition-all transform hover:-translate-y-2"
          >
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-5xl text-red-600">
                admin_panel_settings
              </span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Portal</h2>
            <p className="text-gray-600 mb-6">
              Manage admissions, enrollments, and school operations
            </p>
            <div className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold">
              Admin Login →
            </div>
          </a>
        </div>

        {/* Public Apply Button */}
        <div className="text-center mt-16">
          <p className="text-white text-xl mb-4">Not enrolled yet?</p>
          <a
            href="https://student.klase.ph/apply"
            className="inline-block px-8 py-4 bg-white text-blue-600 rounded-lg font-bold text-lg hover:shadow-2xl transition-all"
          >
            Apply for Admission →
          </a>
        </div>
      </main>
    </div>
  );
}
```

---

### Phase 2: Vercel Deployment

#### Project 1: Landing Page

```bash
cd klase-landing
npm create next-app@latest . --typescript --tailwind --app
# Copy landing page code above
vercel  # Deploy
```

**Vercel Project Settings:**
- Project Name: `klase-landing`
- Framework: Next.js
- Root Directory: `.`
- Build Command: `npm run build`
- Output Directory: `.next`

**Custom Domain:**
- Go to Vercel project settings
- Domains → Add Domain
- Enter: `klase.ph`
- Add DNS records in your domain registrar:
  ```
  Type: A
  Name: @
  Value: 76.76.21.21 (Vercel IP)

  Type: CNAME
  Name: www
  Value: cname.vercel-dns.com
  ```

---

#### Project 2: Student App

```bash
cd student-app
git init
git add .
git commit -m "Initial commit"
vercel  # Link to new project
```

**Vercel Project Settings:**
- Project Name: `klase-student`
- Framework: Next.js
- Build Command: `npm run build`
- Install Command: `npm install`

**Environment Variables (in Vercel Dashboard):**
```
NEXT_PUBLIC_SUPABASE_URL=https://qyjzqzqqjimittltttph.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
NEXT_PUBLIC_APP_URL=https://student.klase.ph
DAILY_API_KEY=5a400788...
DAILY_DOMAIN=klase.daily.co
RESEND_API_KEY=re_US5UsX6v...
OPENAI_API_KEY=sk-...
```

**Custom Domain:**
- Add: `student.klase.ph`
- DNS Record:
  ```
  Type: CNAME
  Name: student
  Value: cname.vercel-dns.com
  ```

---

#### Project 3: Teacher App

```bash
cd teacher-app
git init
git add .
git commit -m "Initial commit"
vercel
```

**Vercel Project Settings:**
- Project Name: `klase-teachers`
- Framework: Next.js

**Environment Variables:**
```
NEXT_PUBLIC_SUPABASE_URL=https://qyjzqzqqjimittltttph.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
NEXT_PUBLIC_APP_URL=https://teachers.klase.ph
```

**Custom Domain:**
- Add: `teachers.klase.ph`
- DNS Record:
  ```
  Type: CNAME
  Name: teachers
  Value: cname.vercel-dns.com
  ```

---

#### Project 4: Admin App

```bash
cd admin-app
git init
git add .
git commit -m "Initial commit"
vercel
```

**Vercel Project Settings:**
- Project Name: `klase-admin`
- Framework: Next.js

**Environment Variables:**
```
NEXT_PUBLIC_SUPABASE_URL=https://qyjzqzqqjimittltttph.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
NEXT_PUBLIC_APP_URL=https://admin.klase.ph
RESEND_API_KEY=re_US5UsX6v...
```

**Custom Domain:**
- Add: `admin.klase.ph`
- DNS Record:
  ```
  Type: CNAME
  Name: admin
  Value: cname.vercel-dns.com
  ```

---

## 🔄 Cross-App URL Updates

After deployment, update these URLs in code:

### Student-App
```typescript
// lib/config/urls.ts
export const ADMIN_URL = 'https://admin.klase.ph';
export const TEACHER_URL = 'https://teachers.klase.ph';
export const STUDENT_URL = 'https://student.klase.ph';
export const LANDING_URL = 'https://klase.ph';
```

### API Endpoints
```typescript
// Student app calls teacher API for live sessions
// Current: http://localhost:3000/api/teacher/live-sessions
// Production: https://student.klase.ph/api/teacher/live-sessions
// (Same app, so no change needed!)
```

---

## 📋 DNS Configuration Summary

**In your domain registrar (e.g., Namecheap, GoDaddy):**

| Type | Name | Value | Purpose |
|------|------|-------|---------|
| A | @ | 76.76.21.21 | klase.ph → landing |
| CNAME | www | cname.vercel-dns.com | www.klase.ph → landing |
| CNAME | student | cname.vercel-dns.com | student.klase.ph |
| CNAME | teachers | cname.vercel-dns.com | teachers.klase.ph |
| CNAME | admin | cname.vercel-dns.com | admin.klase.ph |

**Propagation Time:** 5 minutes to 24 hours (usually ~30 min)

---

## 🚀 Deployment Checklist

### Pre-Deployment

- [ ] Test all 3 apps locally
- [ ] Verify /apply works without login
- [ ] Test live sessions end-to-end
- [ ] Test admin approvals
- [ ] Commit all code to git

### Vercel Setup

- [ ] Install Vercel CLI: `npm i -g vercel`
- [ ] Login: `vercel login`
- [ ] Deploy student-app: `cd student-app && vercel`
- [ ] Deploy teacher-app: `cd teacher-app && vercel`
- [ ] Deploy admin-app: `cd admin-app && vercel`
- [ ] Create landing page project
- [ ] Deploy landing: `cd klase-landing && vercel`

### Domain Configuration

- [ ] Add `klase.ph` to landing project
- [ ] Add `student.klase.ph` to student project
- [ ] Add `teachers.klase.ph` to teacher project
- [ ] Add `admin.klase.ph` to admin project
- [ ] Configure DNS records in domain registrar
- [ ] Wait for DNS propagation
- [ ] Verify all domains work

### Environment Variables

- [ ] Add all env vars to each Vercel project
- [ ] Update NEXT_PUBLIC_APP_URL for each domain
- [ ] Test database connectivity
- [ ] Test Daily.co integration
- [ ] Test Resend emails

### Final Testing

- [ ] Test klase.ph landing page
- [ ] Test student login at student.klase.ph
- [ ] Test teacher login at teachers.klase.ph
- [ ] Test admin login at admin.klase.ph
- [ ] Test /apply at student.klase.ph/apply
- [ ] Test live sessions across domains
- [ ] Test messaging
- [ ] Test admissions workflow

---

## 🎨 Landing Page Branding

**klase.ph should have:**

### Similar to MSU but Generic

**Logo:** "klase.ph" with graduation cap icon
**Tagline:** "Complete School Management Platform"
**Colors:** Professional blue/purple (not MSU maroon)

### 3 Clear Login Cards

**Layout:**
```
         KLASE.PH
    School Management Platform

┌──────────┐  ┌──────────┐  ┌──────────┐
│ STUDENT  │  │ TEACHER  │  │  ADMIN   │
│   🎓     │  │   👨‍🏫    │  │   👔     │
│          │  │          │  │          │
│  Login → │  │  Login → │  │  Login → │
└──────────┘  └──────────┘  └──────────┘

        [Apply for Admission]
```

---

## 🔧 Required Code Changes

### 1. Update Environment URLs

**Production .env (for each app):**

**student-app:**
```env
NEXT_PUBLIC_APP_URL=https://student.klase.ph
NEXT_PUBLIC_TEACHER_URL=https://teachers.klase.ph
NEXT_PUBLIC_ADMIN_URL=https://admin.klase.ph
NEXT_PUBLIC_LANDING_URL=https://klase.ph
```

**teacher-app:**
```env
NEXT_PUBLIC_APP_URL=https://teachers.klase.ph
NEXT_PUBLIC_STUDENT_URL=https://student.klase.ph
NEXT_PUBLIC_ADMIN_URL=https://admin.klase.ph
```

**admin-app:**
```env
NEXT_PUBLIC_APP_URL=https://admin.klase.ph
NEXT_PUBLIC_STUDENT_URL=https://student.klase.ph
NEXT_PUBLIC_TEACHER_URL=https://teachers.klase.ph
```

### 2. Update Hard-coded Localhost URLs

**Search and replace in all apps:**
```bash
# Find all localhost references
grep -r "localhost:300" . --include="*.ts" --include="*.tsx"

# Replace with environment variables
# Example:
// Before:
fetch('http://localhost:3000/api/...')

// After:
fetch(`${process.env.NEXT_PUBLIC_STUDENT_URL}/api/...`)
```

### 3. Update CORS if Needed

If apps call each other's APIs:
```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://teachers.klase.ph, https://admin.klase.ph' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
        ],
      },
    ];
  },
};
```

---

## 💰 Vercel Pricing

**Hobby Plan (FREE):**
- ✅ Unlimited projects
- ✅ Custom domains
- ✅ SSL certificates (automatic)
- ✅ 100GB bandwidth/month
- ✅ Serverless functions

**Pro Plan ($20/month per user):**
- Everything in Hobby
- 1TB bandwidth
- Better performance
- Analytics
- Team collaboration

**For Testing:** Use Hobby plan (free)
**For Production:** Pro plan recommended

---

## 🎯 Deployment Timeline

**Week 1: Local Testing & Preparation**
- Day 1-2: Test all features locally
- Day 3: Create landing page
- Day 4: Test cross-app navigation
- Day 5: Commit all to git repos

**Week 2: Vercel Deployment**
- Day 1: Deploy all 4 projects to Vercel
- Day 2: Configure custom domains
- Day 3: Wait for DNS propagation
- Day 4: Test all domains
- Day 5: Fix any issues

**Week 3: Production Hardening**
- Test with real users
- Monitor errors
- Optimize performance
- Set up analytics

---

## 🧪 Testing After Deployment

### Test Checklist

**Landing Page (klase.ph):**
- [ ] Page loads
- [ ] 3 portal cards display
- [ ] Links to subdomains work
- [ ] Apply button works

**Student Portal (student.klase.ph):**
- [ ] Login works
- [ ] Dashboard loads
- [ ] Can view courses
- [ ] Can join live sessions
- [ ] /apply works without login

**Teacher Portal (teachers.klase.ph):**
- [ ] Login works
- [ ] See assigned courses
- [ ] Can create modules
- [ ] Can schedule live sessions
- [ ] Can start Daily.co sessions

**Admin Portal (admin.klase.ph):**
- [ ] Login works
- [ ] See applications
- [ ] Can approve applications
- [ ] Auto-enrollment works
- [ ] Email notifications sent

---

## 🔑 Production Environment Variables

**CRITICAL: Add these to EACH Vercel project:**

```env
# Supabase (Same for all)
NEXT_PUBLIC_SUPABASE_URL=https://qyjzqzqqjimittltttph.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# App-specific URLs
NEXT_PUBLIC_APP_URL=[app-specific-domain]

# Services (Student & Admin apps only)
RESEND_API_KEY=re_US5UsX6v_2Do26VZZbVhiMvVroXd5sZnp
DAILY_API_KEY=5a400788fc8e091243f5080ea09254580083c3783d53f1fb899a4210700b7dae
DAILY_DOMAIN=klase.daily.co
OPENAI_API_KEY=sk-...

# Optional: Twilio (when you get credentials)
# TWILIO_ACCOUNT_SID=...
# TWILIO_AUTH_TOKEN=...
# TWILIO_PHONE_NUMBER=...
```

---

## 🚀 Quick Deploy Commands

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy each app
cd student-app && vercel --prod
cd ../teacher-app && vercel --prod
cd ../admin-app && vercel --prod
cd ../klase-landing && vercel --prod

# Configure domains in Vercel dashboard
# Add DNS records in domain registrar
# Wait 30 minutes
# Test!
```

---

## 📊 Final Architecture

```
                    klase.ph
                   (Landing Page)
                        |
        ┌───────────────┼───────────────┐
        |               |               |
  student.klase.ph  teachers.klase.ph  admin.klase.ph
  (Student App)     (Teacher App)      (Admin App)
        |               |               |
        └───────────────┴───────────────┘
                        |
                 Supabase Database
              (qyjzqzqqjimittltttph)
                        |
        ┌───────────────┴───────────┐
        |                           |
   Daily.co API              Resend Email
  (klase.daily.co)          (Notifications)
```

**All connected to single Supabase database.**
**All using shared authentication.**
**All part of klase.ph ecosystem.**

---

## ✅ IMMEDIATE ACTIONS

1. **Test locally NOW:**
   - /apply without login
   - Teacher live sessions
   - Student joining sessions

2. **Create landing page** (1-2 hours)

3. **Deploy to Vercel** (2-3 hours)

4. **Configure DNS** (30 min + propagation wait)

5. **Go live!** 🚀

---

**Let me know when you've tested live sessions locally, then I'll help with Vercel deployment!**
