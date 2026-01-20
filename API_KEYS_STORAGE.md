# API Keys Storage Guide

This document explains where all API keys are stored for the School Management System.

## 📍 Storage Locations

### 1. Local Development (`.env.local` files)

Each app has its own `.env.local` file in the app root directory:

- **`student-app/.env.local`**
- **`teacher-app/.env.local`**
- **`admin-app/.env.local`**

**⚠️ IMPORTANT**: These files are in `.gitignore` and should NEVER be committed to GitHub.

### 2. Supabase Edge Functions (Supabase Secrets)

Edge Functions run in a Deno environment and read environment variables from **Supabase Secrets**.

**Location**: Supabase Dashboard → Project Settings → Edge Functions → Secrets

**Required Secrets for `daily-webhook` function:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DAILY_API_KEY`
- `OPENAI_API_KEY`

---

## 🔑 API Keys Required

### Supabase Keys

**Location**: `.env.local` files (all apps) + Supabase Secrets (Edge Functions)

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (safe for client-side) | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-side only, bypasses RLS) | Supabase Dashboard → Settings → API → `service_role` key |

**⚠️ Security Note**: 
- `NEXT_PUBLIC_*` keys are exposed to the browser (safe for anon key)
- `SUPABASE_SERVICE_ROLE_KEY` must NEVER be exposed to the client
- Service role key should only be used in API routes and server-side code

### Daily.co Keys

**Location**: 
- `.env.local` files (student-app, teacher-app)
- Supabase Secrets (Edge Functions)

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `DAILY_API_KEY` | Daily.co API key for creating rooms | Daily.co Dashboard → Developers → API Keys |
| `DAILY_DOMAIN` | Your Daily.co domain (optional) | Daily.co Dashboard → Settings |

**Current Value**: `5a400788fc8e091243f5080ea09254580083c3783d53f1fb899a4210700b7dae`
**Domain**: `klase.daily.co`

### OpenAI Keys

**Location**: 
- `.env.local` files (student-app, teacher-app)
- Supabase Secrets (Edge Functions)

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `OPENAI_API_KEY` | OpenAI API key for chat completions and embeddings | OpenAI Platform → API Keys |
| `OPENAI_MODEL` | Model to use (optional, defaults to `gpt-4o-mini`) | - |
| `OPENAI_BASE_URL` | Base URL (optional, defaults to `https://api.openai.com/v1`) | - |

**Models Used**:
- Chat: `gpt-4o-mini` (student chat), `gpt-4o` (teacher planning)
- Embeddings: `text-embedding-3-small`
- Transcription: `whisper-1` (in Edge Function)

### Twilio Keys (Optional - SMS)

**Location**: `.env.local` files (admin-app only)

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `TWILIO_ACCOUNT_SID` | Twilio account SID | Twilio Console → Account |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | Twilio Console → Account |
| `TWILIO_PHONE_NUMBER` | Twilio phone number | Twilio Console → Phone Numbers |

**Status**: Optional - System works without SMS (email notifications only)

### Resend Keys (Email)

**Location**: `.env.local` files (student-app, admin-app)

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `RESEND_API_KEY` | Resend API key for sending emails | Resend Dashboard → API Keys |

**Current Value**: `re_US5UsX6v_2Do26VZZbVhiMvVroXd5sZnp`
**Free Tier**: 3,000 emails/month, 100/day

---

## 📝 Example `.env.local` Files

### student-app/.env.local

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://qyjzqzqqjimittltttph.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Daily.co (Live Sessions)
DAILY_API_KEY=5a400788fc8e091243f5080ea09254580083c3783d53f1fb899a4210700b7dae
DAILY_DOMAIN=klase.daily.co

# OpenAI (AI Features)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=https://api.openai.com/v1

# Resend (Email)
RESEND_API_KEY=re_US5UsX6v_2Do26VZZbVhiMvVroXd5sZnp
```

### teacher-app/.env.local

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://qyjzqzqqjimittltttph.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3001

# Daily.co (Live Sessions)
DAILY_API_KEY=5a400788fc8e091243f5080ea09254580083c3783d53f1fb899a4210700b7dae
DAILY_DOMAIN=klase.daily.co

# OpenAI (AI Planning)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
OPENAI_BASE_URL=https://api.openai.com/v1
```

### admin-app/.env.local

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://qyjzqzqqjimittltttph.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3002

# Resend (Email Notifications)
RESEND_API_KEY=re_US5UsX6v_2Do26VZZbVhiMvVroXd5sZnp

# Twilio (SMS - Optional)
# TWILIO_ACCOUNT_SID=...
# TWILIO_AUTH_TOKEN=...
# TWILIO_PHONE_NUMBER=...
```

---

## 🚀 Setting Up Supabase Secrets for Edge Functions

The `daily-webhook` Edge Function requires these secrets to be set in Supabase:

### Steps:

1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/qyjzqzqqjimittltttph
2. Navigate to: **Settings** → **Edge Functions** → **Secrets**
3. Add the following secrets:

```bash
SUPABASE_URL=https://qyjzqzqqjimittltttph.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci... (your service role key)
DAILY_API_KEY=5a400788fc8e091243f5080ea09254580083c3783d53f1fb899a4210700b7dae
OPENAI_API_KEY=sk-... (your OpenAI API key)
```

**Note**: These are automatically available to Edge Functions via `Deno.env.get()`.

---

## 🔒 Security Best Practices

1. **Never commit `.env.local` files** - They're in `.gitignore`
2. **Use different keys for development and production**
3. **Rotate keys regularly** (especially if exposed)
4. **Service role key** should only be used server-side (API routes, Edge Functions)
5. **Anon key** is safe for client-side use (has RLS protection)
6. **For production**, use Vercel Environment Variables or similar platform secrets

---

## 🧪 Verifying Keys Are Set

### Check Local Environment

```bash
# Student App
cd student-app
node -e "require('dotenv').config({ path: '.env.local' }); console.log('DAILY_API_KEY:', process.env.DAILY_API_KEY ? '✅ Set' : '❌ Missing');"

# Teacher App
cd teacher-app
node -e "require('dotenv').config({ path: '.env.local' }); console.log('DAILY_API_KEY:', process.env.DAILY_API_KEY ? '✅ Set' : '❌ Missing');"

# Admin App
cd admin-app
node -e "require('dotenv').config({ path: '.env.local' }); console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing');"
```

### Check Supabase Secrets

1. Go to Supabase Dashboard → Settings → Edge Functions → Secrets
2. Verify all required secrets are listed
3. Test the Edge Function by triggering a Daily.co webhook

---

## 📚 References

- [Supabase Environment Variables](https://supabase.com/docs/guides/functions/secrets)
- [Daily.co API Documentation](https://docs.daily.co/reference)
- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
- [Resend Documentation](https://resend.com/docs)
- [Twilio Documentation](https://www.twilio.com/docs)
