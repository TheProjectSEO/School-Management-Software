# MSU Teacher App - Deployment Guide

**Last Updated:** December 28, 2025
**Version:** 1.0.0

---

## 🚀 Quick Deployment (5 Minutes)

### Prerequisites
- Node.js 18+ installed
- npm or pnpm installed
- Supabase project created
- Git installed

### Steps

1. **Install Dependencies**
```bash
cd /Users/adityaaman/Desktop/All\ Development/School\ management\ Software/teacher-app
npm install
```

2. **Set Environment Variables**
```bash
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials
```

Add:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_PROJECT_ID=your-project-id
```

3. **Add MSU Logo**
```bash
# Place your logo at:
# teacher-app/public/brand/logo.png
# Recommended size: 150x40px
```

4. **Run Development Server**
```bash
npm run dev
```

5. **Visit App**
```
Open http://localhost:3001 in your browser
```

---

## 📋 Complete Deployment (Production)

### Step 1: Environment Setup

#### 1.1 Clone/Navigate to Project
```bash
cd /Users/adityaaman/Desktop/All\ Development/School\ management\ Software/teacher-app
```

#### 1.2 Install Dependencies
```bash
npm install
```

**Verify installation:**
```bash
npm list next react react-dom @supabase/supabase-js
```

#### 1.3 Configure Environment Variables

Create `.env.local`:
```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_PROJECT_ID=your-project-id

# Optional: For development
NEXT_PUBLIC_APP_URL=http://localhost:3001

# Optional: For production
# NEXT_PUBLIC_APP_URL=https://teacher.msu.edu.ph
```

**Get Supabase credentials:**
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy **Project URL** and **anon/public key**

---

### Step 2: Database Setup

#### 2.1 Verify Migrations Applied

All migrations were already applied via Supabase MCP. Verify in Supabase dashboard:

Go to **Database** → **Tables** and confirm these exist:
- `n8n_content_creation.profiles`
- `n8n_content_creation.schools`
- `n8n_content_creation.teacher_profiles`
- `n8n_content_creation.teacher_assignments`
- `n8n_content_creation.courses`
- All 20 teacher tables

#### 2.2 Verify RLS Policies

Go to **Authentication** → **Policies** and confirm policies exist for:
- `teacher_profiles`
- `teacher_assignments`
- `teacher_transcripts`
- `teacher_notes`
- (All 20 teacher tables)

#### 2.3 Create Test Data (Optional)

If you need test data, run this in Supabase SQL Editor:

```sql
-- Already inserted via MCP:
-- Profile: Dr. Maria Santos
-- School: MSU Main Campus
-- Teacher Profile: MSU-T-2024-001
-- Course: CS101

-- Check test data exists:
SELECT COUNT(*) FROM n8n_content_creation.teacher_profiles;
SELECT COUNT(*) FROM n8n_content_creation.teacher_assignments;
```

---

### Step 3: Assets & Branding

#### 3.1 Add MSU Logo

Place your MSU logo at:
```
teacher-app/public/brand/logo.png
```

**Specifications:**
- Format: PNG with transparency
- Recommended size: 150x40px or similar aspect ratio
- Background: Transparent
- Colors: MSU Maroon and/or White

**Temporary Solution:**
If you don't have the logo yet, create a placeholder:
```bash
mkdir -p public/brand
# Add any temporary logo or use text
```

#### 3.2 Verify Fonts Load

Lexend font is loaded from Google Fonts in `app/globals.css`:
```css
@import url('https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&display=swap');
```

Material Symbols icons:
```css
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,1,0');
```

---

### Step 4: Development Testing

#### 4.1 Start Development Server
```bash
npm run dev
```

**Expected output:**
```
▲ Next.js 14.2.0
- Local:        http://localhost:3001
- Environments: .env.local

✓ Ready in 2.3s
```

#### 4.2 Test Authentication Flow

1. **Visit Landing Page:** http://localhost:3001
   - Should show MSU branding
   - "Sign In" and "Register as Teacher" buttons

2. **Test Registration:** http://localhost:3001/teacher-register
   - Fill form with test data
   - Select school from dropdown (should load from Supabase)
   - Submit form
   - Should redirect to `/teacher` dashboard

3. **Test Login:** http://localhost:3001/login
   - Enter test teacher credentials
   - Should detect teacher role
   - Should redirect to `/teacher`

4. **Test Logout:**
   - Click logout in sidebar
   - Should redirect to `/login`
   - Should clear session

#### 4.3 Test All Pages

Visit each page and verify data loads:

| Page | URL | Expected Data |
|------|-----|---------------|
| Dashboard | `/teacher` | 8 widgets with data or empty states |
| My Classes | `/teacher/classes` | Class sections or empty state |
| My Subjects | `/teacher/subjects` | Assigned courses or empty state |
| Assessments | `/teacher/assessments` | Assessment list or empty state |
| Grading Inbox | `/teacher/submissions` | Pending submissions or empty state |
| Attendance | `/teacher/attendance` | Student list with status tracking |
| Calendar | `/teacher/calendar` | Calendar grid with sessions |
| Messages | `/teacher/messages` | Conversation list |

#### 4.4 Test Mobile Responsiveness

Open Chrome DevTools:
- Toggle device toolbar (Cmd+Shift+M / Ctrl+Shift+M)
- Test on iPhone SE, iPad, Desktop sizes
- Verify all layouts adapt correctly
- Check navigation, buttons, forms work

#### 4.5 Test Dark Mode

Toggle dark mode:
- System preference detection works
- All colors render correctly
- No contrast issues

---

### Step 5: Build for Production

#### 5.1 Production Build
```bash
npm run build
```

**Expected output:**
```
Route (app)                                Size     First Load JS
┌ ○ /                                      x kB           x kB
├ ○ /login                                 x kB           x kB
├ ○ /teacher                              x kB           x kB
├ ○ /teacher/classes                      x kB           x kB
... (all routes listed)

○  (Static)  automatically rendered as static HTML
```

#### 5.2 Check for Errors

If build fails, check:
- TypeScript errors: `npm run type-check`
- Missing dependencies: `npm install`
- Environment variables set
- Supabase connection working

#### 5.3 Test Production Build Locally
```bash
npm run start
```

Visit: http://localhost:3001

**Verify:**
- All pages load
- Data fetches work
- No console errors
- Performance is good

---

### Step 6: Deploy to Vercel (Recommended)

#### 6.1 Install Vercel CLI
```bash
npm i -g vercel
```

#### 6.2 Login to Vercel
```bash
vercel login
```

#### 6.3 Deploy
```bash
vercel
```

**Follow prompts:**
- Set up and deploy? Y
- Which scope? (your account)
- Link to existing project? N
- Project name? `msu-teacher-app`
- Directory? `./`
- Override settings? N

#### 6.4 Set Environment Variables in Vercel

Go to Vercel dashboard → Project → Settings → Environment Variables

Add:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_PROJECT_ID`

**Re-deploy after adding variables:**
```bash
vercel --prod
```

#### 6.5 Configure Custom Domain (Optional)

In Vercel dashboard:
1. Go to **Settings** → **Domains**
2. Add your domain: `teacher.msu.edu.ph`
3. Follow DNS configuration instructions
4. Wait for SSL certificate

---

### Step 7: Database Configuration for Production

#### 7.1 Verify RLS is Enabled

In Supabase dashboard:
- Go to **Database** → **Policies**
- Confirm RLS is enabled on all teacher tables
- Verify policies exist and are active

#### 7.2 Set Up Database Indexes

All indexes were created via migrations. Verify in SQL Editor:
```sql
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'n8n_content_creation'
  AND tablename LIKE 'teacher_%'
ORDER BY tablename, indexname;
```

#### 7.3 Configure Storage Buckets

Create Supabase Storage buckets:

1. Go to **Storage** → **Create bucket**

Create these buckets:
- `teacher_assets` - For slides, PDFs, images (Public)
- `recordings` - For live session recordings (Public/Authenticated)
- `submissions` - For student submission files (Authenticated)
- `message_attachments` - For message attachments (Authenticated)

**Configure bucket policies:**
- `teacher_assets`: Teachers can upload, all can read
- `recordings`: Teachers can upload, enrolled students can read
- `submissions`: Students can upload, teachers can read
- `message_attachments`: Participants can upload/read

---

### Step 8: Create Admin Account

#### 8.1 Register First Teacher

Via UI:
1. Navigate to `/teacher-register`
2. Fill form with admin teacher details
3. Use real email (for future email confirmation)
4. Submit

Via SQL (alternative):
```sql
-- 1. Create auth user (do this in Supabase Auth dashboard first)
-- Then:

-- 2. Create profile
INSERT INTO n8n_content_creation.profiles (auth_user_id, full_name, phone)
VALUES (
  'auth-user-uuid-here',
  'Admin Teacher',
  '+63-xxx-xxxx-xxxx'
);

-- 3. Create teacher profile
WITH profile AS (
  SELECT id FROM n8n_content_creation.profiles
  WHERE auth_user_id = 'auth-user-uuid-here'
),
school AS (
  SELECT id FROM n8n_content_creation.schools LIMIT 1
)
INSERT INTO n8n_content_creation.teacher_profiles (
  profile_id, school_id, employee_id, department, is_active
)
SELECT profile.id, school.id, 'ADMIN-001', 'Administration', true
FROM profile, school;
```

---

### Step 9: Monitoring & Maintenance

#### 9.1 Set Up Monitoring

**Vercel Analytics** (if using Vercel):
- Automatically enabled
- View in Vercel dashboard

**Supabase Logs:**
- Go to **Logs** in Supabase dashboard
- Monitor slow queries
- Check for errors

**Error Tracking** (Optional):
- Integrate Sentry: `npm install @sentry/nextjs`
- Configure in `next.config.js`

#### 9.2 Database Maintenance

**Weekly:**
- Review slow queries
- Check database size
- Monitor RLS policy performance

**Monthly:**
- Backup database (Supabase auto-backups)
- Review and archive old data
- Update indexes if needed

#### 9.3 Application Updates

**Update Dependencies:**
```bash
npm update
npm audit fix
```

**Deploy Updates:**
```bash
git add .
git commit -m "Update dependencies"
git push origin main
vercel --prod
```

---

## 🔒 Security Checklist

### Before Production Launch

- [ ] All RLS policies enabled and tested
- [ ] Environment variables are secret (not committed to git)
- [ ] `.gitignore` includes `.env.local`
- [ ] HTTPS enabled (automatic with Vercel)
- [ ] Secure cookies configured (automatic with Next.js)
- [ ] Input validation on all forms
- [ ] SQL injection protection (Supabase parameterized queries)
- [ ] XSS protection (React automatic escaping)
- [ ] CSRF protection (Next.js automatic)
- [ ] Rate limiting configured (optional)
- [ ] File upload size limits set
- [ ] Allowed file types restricted
- [ ] Error messages don't leak sensitive info

### Authentication Security

- [ ] Passwords hashed (Supabase bcrypt)
- [ ] Session tokens secure
- [ ] Logout clears all sessions
- [ ] Inactive session timeout configured
- [ ] Password requirements enforced
- [ ] Email confirmation enabled (optional)
- [ ] 2FA available (optional)

### Database Security

- [ ] RLS policies tested with different users
- [ ] No public schema access
- [ ] Teacher can only see their data
- [ ] Student data properly restricted
- [ ] Database credentials secured
- [ ] Connection pooling configured
- [ ] Prepared statements used (automatic)

---

## 🧪 Testing Guide

### Unit Testing (Optional)

Add Jest for testing:
```bash
npm install -D jest @testing-library/react @testing-library/jest-dom
```

Create `jest.config.js`:
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
}
```

**Test DAL functions:**
```typescript
// lib/dal/__tests__/teacher.test.ts
import { getTeacherProfile } from '../teacher'

describe('getTeacherProfile', () => {
  it('should return teacher profile for authenticated user', async () => {
    // Mock Supabase client
    // Call function
    // Assert results
  })
})
```

### Integration Testing

**Test complete workflows:**

1. **Teacher Registration → Login → Dashboard:**
   - Register new teacher
   - Verify profile created
   - Login with credentials
   - Check dashboard loads

2. **Module Creation → Publish → Student Sees:**
   - Create draft module
   - Add lessons
   - Publish module
   - Verify student can see

3. **Assessment Creation → Submission → Grading → Release:**
   - Create assessment
   - Student submits
   - Teacher grades with rubric
   - Release grade
   - Student sees result

### End-to-End Testing (Optional)

Use Playwright:
```bash
npm install -D @playwright/test
npx playwright install
```

Create `tests/e2e/teacher-flow.spec.ts`:
```typescript
import { test, expect } from '@playwright/test'

test('teacher can log in and view dashboard', async ({ page }) => {
  await page.goto('http://localhost:3001/login')
  await page.fill('[name="email"]', 'test@msu.edu.ph')
  await page.fill('[name="password"]', 'password')
  await page.click('button[type="submit"]')

  await expect(page).toHaveURL('/teacher')
  await expect(page.locator('h1')).toContainText('Welcome')
})
```

---

## 🐛 Troubleshooting

### Common Issues

#### Issue: "Failed to fetch" errors
**Solution:**
- Check Supabase URL and keys in `.env.local`
- Verify Supabase project is active
- Check internet connection

#### Issue: "Unauthorized" on teacher routes
**Solution:**
- Verify user has teacher_profile record
- Check teacher_profile.is_active = true
- Review RLS policies in Supabase
- Check middleware configuration

#### Issue: Empty data on pages
**Solution:**
- Verify teacher has teacher_assignments records
- Check courses exist in database
- Review RLS policies allow teacher access
- Check Supabase logs for errors

#### Issue: Logo not showing
**Solution:**
- Place logo at `public/brand/logo.png`
- Check file permissions
- Verify image format (PNG recommended)
- Clear browser cache

#### Issue: Build errors
**Solution:**
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules
npm install

# Rebuild
npm run build
```

#### Issue: Database connection errors
**Solution:**
- Verify SUPABASE_URL is correct
- Check SUPABASE_ANON_KEY is valid
- Ensure Supabase project is not paused
- Check RLS policies aren't blocking access

---

## 📊 Performance Optimization

### Before Production

#### 1. Optimize Images
```bash
# If using images, optimize them
npm install sharp
```

Next.js will auto-optimize images.

#### 2. Enable Caching

In `next.config.js`:
```javascript
module.exports = {
  images: {
    domains: ['*.supabase.co'],
  },
  // Add caching headers
  async headers() {
    return [
      {
        source: '/brand/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}
```

#### 3. Configure Supabase Connection Pooling

In Supabase dashboard:
- Go to **Settings** → **Database**
- Enable **Connection Pooler**
- Use pooler URL for production

#### 4. Set Revalidation

For pages that should update frequently:
```typescript
// app/teacher/page.tsx
export const revalidate = 60 // Revalidate every 60 seconds
```

For pages that can cache longer:
```typescript
// app/teacher/classes/page.tsx
export const revalidate = 300 // Revalidate every 5 minutes
```

---

## 🌐 Production Deployment

### Deploy to Vercel (Recommended)

#### Option A: CLI Deployment

```bash
# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

#### Option B: Git Integration

1. Push to GitHub:
```bash
git init
git add .
git commit -m "Initial commit - MSU Teacher App"
git branch -M main
git remote add origin your-repo-url
git push -u origin main
```

2. Connect in Vercel:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Configure:
     - Framework Preset: Next.js
     - Root Directory: `./`
     - Build Command: `npm run build`
     - Output Directory: `.next`
   - Add environment variables
   - Deploy

3. Auto-deploy on push:
   - Every push to `main` auto-deploys
   - Preview deploys for PRs

### Alternative: Deploy to Other Platforms

#### Netlify
```bash
npm install -g netlify-cli
netlify init
netlify deploy --prod
```

#### AWS Amplify
- Push to GitHub
- Connect in Amplify Console
- Configure build settings
- Add environment variables

#### Self-Hosted (Docker)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

---

## 📧 Post-Deployment

### 1. Verify Deployment

Visit your production URL and test:
- [ ] Homepage loads
- [ ] Login works
- [ ] Registration works
- [ ] Dashboard displays
- [ ] All pages accessible
- [ ] Data loads correctly
- [ ] No console errors

### 2. Configure Supabase for Production

In Supabase dashboard:

**Authentication:**
- Go to **Authentication** → **Email Templates**
- Customize confirmation email (optional)
- Set site URL to production domain

**API:**
- Go to **Settings** → **API**
- Verify anon key is being used (not service key)

**Database:**
- Go to **Database** → **Connection Pooling**
- Enable if not already
- Use pooler connection string

### 3. Monitor First Week

**Track:**
- User registrations
- Login attempts
- Error rates
- Page load times
- Database query performance

**Tools:**
- Vercel Analytics
- Supabase Dashboard Logs
- Browser Console (for client errors)

### 4. Gather Feedback

**Test with real teachers:**
- Ask 2-3 teachers to test
- Note any confusion or issues
- Collect feature requests
- Fix critical bugs immediately

---

## 🔄 Update & Rollback Procedures

### Deploying Updates

```bash
# Make changes
# Test locally
npm run dev

# Build and test
npm run build
npm start

# Commit
git add .
git commit -m "Description of changes"
git push origin main

# Vercel auto-deploys or:
vercel --prod
```

### Rolling Back

**Vercel:**
1. Go to **Deployments** in Vercel dashboard
2. Find previous working deployment
3. Click **⋯** → **Promote to Production**

**Git:**
```bash
# Find commit hash of last working version
git log

# Revert to that commit
git revert <commit-hash>
git push origin main
```

---

## 📈 Scaling Considerations

### When to Scale

Monitor these metrics:
- Response time > 2s consistently
- Database CPU > 80%
- Concurrent users > 1000
- Storage > 80% capacity

### Scaling Database

**Supabase Pro:**
- Upgrade to Pro plan
- Increase compute resources
- Enable read replicas

**Optimize Queries:**
- Add more indexes
- Use materialized views
- Implement caching layer (Redis)

### Scaling Application

**Vercel:**
- Auto-scales automatically
- Configure in **Settings** → **Functions**
- Increase timeout if needed

**CDN:**
- Vercel Edge Network automatic
- Static assets cached globally

---

## 🆘 Support & Resources

### Documentation
- **CLAUDE.md** - Complete specification
- **MASTER_SUMMARY.md** - Executive overview
- **DEPLOYMENT_GUIDE.md** - This file
- Feature-specific docs in root directory

### External Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Vercel Documentation](https://vercel.com/docs)

### Getting Help
1. Check documentation first
2. Review Supabase logs
3. Check browser console
4. Review database query logs
5. Test with Supabase local development

---

## ✅ Pre-Launch Checklist

### Development
- [x] All dependencies installed
- [x] Environment variables configured
- [x] Database migrations applied
- [x] RLS policies enabled
- [x] Test data created
- [x] All pages tested locally
- [x] Mobile responsiveness verified
- [x] Dark mode tested

### Production
- [ ] Logo added
- [ ] Production environment variables set
- [ ] Domain configured (if custom domain)
- [ ] SSL certificate active
- [ ] Database connection pooling enabled
- [ ] Storage buckets created and configured
- [ ] Error tracking setup (optional)
- [ ] Analytics configured (optional)

### Testing
- [ ] Authentication flow tested
- [ ] All pages load with real data
- [ ] Mobile tested on actual devices
- [ ] Performance tested under load
- [ ] Security audit completed
- [ ] Accessibility tested
- [ ] Cross-browser testing done

### Documentation
- [x] README updated
- [x] API documentation complete
- [x] User guides created
- [x] Deployment guide complete
- [ ] Admin documentation created (optional)
- [ ] Video tutorials created (optional)

---

## 🎓 Training Materials (Optional)

### For Teachers

Create quick training guides:
1. **Getting Started:** Registration, login, dashboard overview
2. **Module Creation:** How to create and publish modules
3. **Assessment Management:** Creating quizzes and grading
4. **Attendance Tracking:** Using the attendance system
5. **Live Sessions:** Scheduling and conducting online classes

### For Administrators

Create admin guides:
1. **User Management:** Creating teacher accounts
2. **School Setup:** Configuring schools and sections
3. **Course Assignment:** Assigning teachers to courses
4. **Troubleshooting:** Common issues and solutions
5. **Database Backup:** Backup and restore procedures

---

## 🎉 Launch Day Checklist

**One Week Before:**
- [ ] Final testing complete
- [ ] All bugs fixed
- [ ] Performance optimized
- [ ] Documentation reviewed
- [ ] Training materials ready

**One Day Before:**
- [ ] Production deployment successful
- [ ] Domain DNS propagated
- [ ] SSL certificate active
- [ ] Database backups confirmed
- [ ] Monitoring tools active

**Launch Day:**
- [ ] Send announcement to teachers
- [ ] Monitor error logs
- [ ] Be available for support
- [ ] Track user registrations
- [ ] Note any issues for hot fixes

**One Week After:**
- [ ] Gather user feedback
- [ ] Fix critical bugs
- [ ] Plan first update
- [ ] Review analytics
- [ ] Celebrate success! 🎉

---

## 📞 Emergency Contacts

### Critical Issues

If the app goes down:
1. Check Vercel status
2. Check Supabase status
3. Review recent deployments
4. Check error logs
5. Rollback if necessary

### Escalation Path

1. **Minor issues:** Log for next sprint
2. **Major bugs:** Fix within 24 hours
3. **Critical failures:** Immediate rollback + hot fix
4. **Data loss:** Restore from backup

---

## 🎯 Success Metrics

### Week 1 Goals
- 100% uptime
- < 2s page load time
- Zero data loss incidents
- Teacher adoption: 10+ users

### Month 1 Goals
- Teacher adoption: 50+ users
- Daily active users: 20+
- Modules created: 100+
- Assessments created: 50+
- Sessions conducted: 200+

### Quarter 1 Goals
- Full school adoption
- Student app integration tested
- Performance optimized
- Feature requests prioritized
- Roadmap for v2.0

---

## 📝 Deployment Verification Script

Create `scripts/verify-deployment.sh`:
```bash
#!/bin/bash

echo "Verifying MSU Teacher App Deployment..."

# Check environment variables
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  echo "❌ NEXT_PUBLIC_SUPABASE_URL not set"
  exit 1
fi

# Check Supabase connection
curl -s "$NEXT_PUBLIC_SUPABASE_URL" > /dev/null
if [ $? -eq 0 ]; then
  echo "✅ Supabase reachable"
else
  echo "❌ Supabase not reachable"
  exit 1
fi

# Check Next.js build
if [ -d ".next" ]; then
  echo "✅ Next.js build exists"
else
  echo "❌ Next.js build missing - run 'npm run build'"
  exit 1
fi

# Check logo
if [ -f "public/brand/logo.png" ]; then
  echo "✅ Logo exists"
else
  echo "⚠️  Logo missing - add to public/brand/logo.png"
fi

echo ""
echo "🎉 Deployment verification complete!"
```

Run:
```bash
chmod +x scripts/verify-deployment.sh
./scripts/verify-deployment.sh
```

---

**Ready to deploy! 🚀**

Follow the steps in order, test thoroughly, and launch with confidence.

For questions, refer to `MASTER_SUMMARY.md` or feature-specific documentation files.

**Good luck with the deployment!** 🎓
