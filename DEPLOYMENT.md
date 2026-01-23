# 🚀 Klase.ph Multi-Site Deployment Guide

## Overview

This monorepo contains 4 separate Next.js applications that deploy to different domains:

| App | Directory | Domain | Vercel Config |
|-----|-----------|--------|---------------|
| **Landing** | `klase-landing/` | klase.ph | `vercel-landing.json` |
| **Student** | `apps/student/` | student.klase.ph | `vercel-student.json` |
| **Teacher** | `apps/teacher/` | teachers.klase.ph | `vercel-teacher.json` |
| **Admin** | `admin-app/` | admin.klase.ph | `vercel-admin.json` |

---

## 🎯 Deployment Strategy

Each app is deployed as a **separate Vercel project** with custom domain configuration.

---

## 📋 Prerequisites

1. **Vercel CLI** installed and authenticated:
   ```bash
   npm i -g vercel
   vercel login
   ```

2. **Environment Variables** set up in Vercel dashboard for each project

3. **Domain DNS** configured (see Domain Setup below)

---

## 🚢 Step-by-Step Deployment

### Option 1: Automated Deployment (Recommended)

Run the deployment script:

```bash
./deploy-all.sh
```

This will deploy all 4 apps in sequence.

### Option 2: Manual Deployment Per App

#### 1. Deploy Student Portal (student.klase.ph)

```bash
# Use student config
vercel --prod --yes -A vercel-student.json

# Or explicitly set project
vercel --prod --project klase-student
```

#### 2. Deploy Teacher Portal (teachers.klase.ph)

```bash
vercel --prod --yes -A vercel-teacher.json

# Or explicitly
vercel --prod --project klase-teachers
```

#### 3. Deploy Admin Portal (admin.klase.ph)

```bash
vercel --prod --yes -A vercel-admin.json

# Or explicitly
vercel --prod --project klase-admin
```

#### 4. Deploy Landing Page (klase.ph)

```bash
vercel --prod --yes -A vercel-landing.json

# Or explicitly
vercel --prod --project klase-landing
```

---

## 🌐 Domain Configuration

### In Your Domain Registrar (e.g., Namecheap, GoDaddy)

Add these DNS records:

```
Type: A     | Name: @        | Value: 76.76.21.21         (klase.ph)
Type: CNAME | Name: student  | Value: cname.vercel-dns.com (student.klase.ph)
Type: CNAME | Name: teachers | Value: cname.vercel-dns.com (teachers.klase.ph)
Type: CNAME | Name: admin    | Value: cname.vercel-dns.com (admin.klase.ph)
```

### In Vercel Dashboard

For each project:

1. Go to **Project Settings** → **Domains**
2. Add custom domain:
   - Student project: `student.klase.ph`
   - Teacher project: `teachers.klase.ph`
   - Admin project: `admin.klase.ph`
   - Landing project: `klase.ph` and `www.klase.ph`
3. Verify DNS propagation
4. Enable HTTPS

---

## 🔐 Environment Variables

### Student Project Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://qyjzqzqqjimittltttph.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DAILY_API_KEY=5a400788fc8e091243f5080ea09254580083c3783d53f1fb899a4210700b7dae
DAILY_DOMAIN=klase.daily.co
RESEND_API_KEY=re_US5UsX6v_2Do26VZZbVhiMvVroXd5sZnp
NEXT_PUBLIC_APP_URL=https://student.klase.ph
OPENAI_API_KEY=sk-...
```

### Teacher Project Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://qyjzqzqqjimittltttph.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=https://teachers.klase.ph
```

### Admin Project Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://qyjzqzqqjimittltttph.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
RESEND_API_KEY=re_US5UsX6v_2Do26VZZbVhiMvVroXd5sZnp
NEXT_PUBLIC_APP_URL=https://admin.klase.ph
```

### Landing Project Variables

```env
NEXT_PUBLIC_APP_URL=https://klase.ph
```

---

## 🛠️ Vercel Project Setup (First Time)

### Create Projects in Vercel Dashboard

1. Go to https://vercel.com/new
2. Import Git repository (this repo)
3. Create **4 separate projects**:
   - Project name: `klase-landing`
   - Project name: `klase-student`
   - Project name: `klase-teachers`
   - Project name: `klase-admin`

### Configure Build Settings

For each project in Vercel:

**Student Project:**
- Framework Preset: Next.js
- Build Command: `cd apps/student && npm run build`
- Output Directory: `apps/student/.next`
- Install Command: `npm install`
- Root Directory: (Leave as /)

**Teacher Project:**
- Framework Preset: Next.js
- Build Command: `cd apps/teacher && npm run build`
- Output Directory: `apps/teacher/.next`
- Install Command: `npm install`
- Root Directory: (Leave as /)

**Admin Project:**
- Framework Preset: Next.js
- Build Command: `cd admin-app && npm run build`
- Output Directory: `admin-app/.next`
- Install Command: `cd admin-app && npm install`
- Root Directory: (Leave as /)

**Landing Project:**
- Framework Preset: Next.js
- Build Command: `cd klase-landing && npm run build`
- Output Directory: `klase-landing/.next`
- Install Command: `cd klase-landing && npm install`
- Root Directory: (Leave as /)

---

## 🔄 CI/CD with GitHub

Link each Vercel project to the same GitHub repo:

1. **Student** - Deploy on push to `main` with filter: `apps/student/**`
2. **Teacher** - Deploy on push to `main` with filter: `apps/teacher/**`
3. **Admin** - Deploy on push to `main` with filter: `admin-app/**`
4. **Landing** - Deploy on push to `main` with filter: `klase-landing/**`

---

## ✅ Deployment Checklist

Before deploying:

- [ ] All environment variables set in Vercel
- [ ] DNS records configured
- [ ] Local build successful: `npm run build`
- [ ] Supabase migrations applied
- [ ] Database RLS policies updated
- [ ] Daily.co API key valid
- [ ] Resend API key valid

After deploying:

- [ ] Test student login: https://student.klase.ph/login
- [ ] Test teacher login: https://teachers.klase.ph/login
- [ ] Test admin login: https://admin.klase.ph/login
- [ ] Test landing page: https://klase.ph
- [ ] Verify SSL certificates (HTTPS)
- [ ] Test cross-domain communication
- [ ] Monitor deployment logs

---

## 🐛 Troubleshooting

### Build Fails with "turbo: command not found"

**Solution:** Add `packageManager` field to root `package.json`:
```json
{
  "packageManager": "npm@10.2.4"
}
```

### Build Fails with React Type Errors

**Solution:** Ensure all apps use same React version (React 19):
```bash
cd apps/teacher && npm install react@^19.2.3 react-dom@^19.2.3
```

### Domain Not Resolving

**Solution:**
1. Check DNS propagation: https://dnschecker.org
2. Verify CNAME records point to `cname.vercel-dns.com`
3. Wait 24-48 hours for full propagation

### 404 on Custom Domain

**Solution:**
1. Go to Vercel project → Domains
2. Add custom domain
3. Verify ownership
4. Wait for SSL certificate provisioning

---

## 📞 Support

- Vercel Docs: https://vercel.com/docs
- Domain DNS Guide: https://vercel.com/docs/projects/domains
- Deployment Issues: https://github.com/vercel/vercel/discussions

---

**Last Updated:** January 23, 2026
**Platform:** klase.ph Multi-Portal School Management System
