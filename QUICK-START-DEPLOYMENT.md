# 🚀 Quick Start: Deploy to Klase.ph

## What Was Fixed

✅ **Build Issues Resolved:**
1. Added `packageManager` field to package.json (Turbo requirement)
2. Upgraded Teacher app to Next.js 16 + React 19 (matching Student app)
3. Fixed 3 route handlers for Next.js 16 async params
4. Created separate Vercel configs for each app

✅ **Files Created:**
- `vercel-student.json` - Student portal config
- `vercel-teacher.json` - Teacher portal config
- `vercel-admin.json` - Admin portal config
- `vercel-landing.json` - Landing page config
- `deploy-all.sh` - Automated deployment script
- `DEPLOYMENT.md` - Complete deployment guide

---

## 🎯 Deploy Now (3 Methods)

### Method 1: Automated (Easiest)

```bash
# Deploy all 4 sites at once
./deploy-all.sh
```

### Method 2: One at a Time

```bash
# Student portal
vercel --prod -A vercel-student.json

# Teacher portal
vercel --prod -A vercel-teacher.json

# Admin portal
vercel --prod -A vercel-admin.json

# Landing page
vercel --prod -A vercel-landing.json
```

### Method 3: From Vercel CLI (Manual)

```bash
vercel --prod
# Then select project when prompted
```

---

## ⚙️ Environment Variables (Required!)

Before deploying, add these to each Vercel project:

### Student Project Env Vars
```
NEXT_PUBLIC_SUPABASE_URL=https://qyjzqzqqjimittltttph.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DAILY_API_KEY=5a400788fc8e091243f5080ea09254580083c3783d53f1fb899a4210700b7dae
DAILY_DOMAIN=klase.daily.co
RESEND_API_KEY=re_US5UsX6v_2Do26VZZbVhiMvVroXd5sZnp
NEXT_PUBLIC_APP_URL=https://student.klase.ph
```

### Teacher Project Env Vars
```
NEXT_PUBLIC_SUPABASE_URL=https://qyjzqzqqjimittltttph.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=https://teachers.klase.ph
```

### Admin Project Env Vars
```
NEXT_PUBLIC_SUPABASE_URL=https://qyjzqzqqjimittltttph.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
RESEND_API_KEY=re_US5UsX6v_2Do26VZZbVhiMvVroXd5sZnp
NEXT_PUBLIC_APP_URL=https://admin.klase.ph
```

---

## 🌐 Domain Setup

In your domain registrar (Namecheap, GoDaddy, etc):

```
Type: A     | Name: @        | Value: 76.76.21.21
Type: CNAME | Name: student  | Value: cname.vercel-dns.com
Type: CNAME | Name: teachers | Value: cname.vercel-dns.com
Type: CNAME | Name: admin    | Value: cname.vercel-dns.com
```

Then in Vercel dashboard for each project:
1. Go to Settings → Domains
2. Add custom domain:
   - Student project: `student.klase.ph`
   - Teacher project: `teachers.klase.ph`
   - Admin project: `admin.klase.ph`
   - Landing project: `klase.ph`

---

## ✅ Verification Checklist

After deployment:

- [ ] All 4 sites build successfully
- [ ] Environment variables set for each project
- [ ] DNS records configured
- [ ] Custom domains added in Vercel
- [ ] Test student login: https://student.klase.ph/login
- [ ] Test teacher login: https://teachers.klase.ph/login
- [ ] Test admin login: https://admin.klase.ph/login
- [ ] Landing page loads: https://klase.ph

---

## 🐛 Common Issues

**"turbo: command not found"**
→ Already fixed! packageManager added to package.json

**"Type error in route handlers"**
→ Already fixed! Async params updated for Next.js 16

**"DndContext type error" or "Cached dependency issues"**
→ Run clean install: `rm -rf node_modules apps/*/node_modules apps/*/.next && npm install`

**"routes-manifest.json couldn't be found" on Vercel**
→ Already fixed! Using `npx turbo run build --filter=@repo/X` in Vercel configs

**Build fails on Vercel**
→ Check environment variables are set correctly

**Domain not working**
→ DNS can take 24-48 hours to propagate

---

## 📞 Next Steps

1. Run `./deploy-all.sh` to deploy all apps
2. Configure DNS records at your registrar
3. Add custom domains in Vercel dashboard
4. Test each site after deployment
5. Monitor deployment logs for any issues

---

**Updated:** January 23, 2026
**Status:** Ready to deploy! 🚀
