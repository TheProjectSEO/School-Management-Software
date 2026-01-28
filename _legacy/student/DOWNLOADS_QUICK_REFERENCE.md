# Downloads Page - Quick Reference

## 🎯 What You Can Do

### Individual File Actions
- **Download** - Click download icon (↓) to download file
- **Delete** - Click delete icon (🗑️) to remove from list
- **Retry** - Click retry icon (🔄) on failed downloads

### Batch Actions
- **Download All Ready** - Download all ready files at once
- **Filter by Type** - Show only Videos, Documents, Images, or Audio
- **Filter by Status** - Switch between All, Queued, or History tabs

## 📊 Status Meanings

| Status | Icon | Meaning | Actions Available |
|--------|------|---------|-------------------|
| **Ready** | ✅ | File ready to download | Download, Delete |
| **Syncing** | 🔄 | Currently downloading | View only |
| **Queued** | ☁️ | Waiting to sync | View only |
| **Error** | ⚠️ | Download failed | Retry |

## 📁 File Types Supported

| Type | Extensions | Icon |
|------|------------|------|
| Documents | PDF, DOC, DOCX | 📄 (Blue) |
| Videos | MP4, AVI, MOV | ▶️ (Red) |
| Images | PNG, JPG, GIF | 🖼️ (Green) |
| Audio | MP3, WAV, M4A | 🎧 (Purple) |
| Archives | ZIP, RAR | 📦 (Yellow) |

## 🔧 API Endpoints

```
GET    /api/downloads/[id]       # Get download URL
DELETE /api/downloads/[id]       # Delete download
PATCH  /api/downloads/[id]       # Update status
POST   /api/downloads/batch      # Batch download
```

## 💾 Storage Info

- **Total Space**: 10 GB
- **View Usage**: Top right storage card
- **File Sizes**: Shown in KB/MB/GB

## 🚀 Quick Start for Developers

### 1. Add Sample Data
```sql
-- Run in Supabase SQL Editor
-- See scripts/add-sample-download.sql
```

### 2. Test Downloads
```bash
npm run dev
# Navigate to http://localhost:3000/downloads
```

### 3. Key Files
- UI: `app/(student)/downloads/DownloadsClient.tsx`
- API: `app/api/downloads/`
- DAL: `lib/dal/downloads.ts`

## 🐛 Common Issues

### Downloads Not Starting?
- Check browser popup blocker
- Allow downloads in browser settings
- Verify you're logged in

### Batch Download Blocked?
- Some browsers limit simultaneous downloads
- Try downloading individually
- Check browser download permissions

### File Not Found?
- Verify file URL is accessible
- Check Supabase Storage permissions
- Ensure file hasn't been deleted

## 📝 Code Examples

### Add a Download (TypeScript)
```typescript
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

await supabase.from("downloads").insert({
  student_id: studentId,
  title: "Python Tutorial",
  file_url: "https://example.com/python.pdf",
  file_size_bytes: 2457600,
  file_type: "application/pdf",
  status: "ready"
});
```

### Download a File (API)
```typescript
const response = await fetch(`/api/downloads/${downloadId}`);
const { url } = await response.json();

// Trigger download
const link = document.createElement('a');
link.href = url;
link.download = fileName;
link.click();
```

### Update Status (API)
```typescript
await fetch(`/api/downloads/${downloadId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 'ready' })
});
```

## 🎨 UI Components

### Stats Cards
- Downloaded Packs (ready count)
- Pending Uploads (queued count)
- Syncing Now (syncing count)

### Tabs
- **All Downloads** - Show everything
- **Queued Uploads** - Show queued/syncing only
- **Sync History** - Show ready only

### Filters
- All Types
- Videos
- Documents
- Images
- Audio

## 🔐 Security

- ✅ Authentication required
- ✅ Student ownership verified
- ✅ RLS policies enforced
- ✅ Signed URLs (1hr expiry)
- ✅ Input validation

## 📱 Mobile Friendly

- Responsive design
- Touch-friendly buttons
- Swipe-friendly tables
- Mobile download support

## ⚡ Performance

- Client-side filtering (instant)
- Optimized queries
- Minimal re-renders
- Efficient batch processing

## 🧪 Testing Checklist

- [ ] Login as student
- [ ] View downloads list
- [ ] Download individual file
- [ ] Download all ready files
- [ ] Delete a download
- [ ] Retry failed download
- [ ] Filter by file type
- [ ] Switch between tabs
- [ ] Check storage meter
- [ ] Verify status badges

## 📚 Additional Resources

- Full Documentation: `app/(student)/downloads/README.md`
- Implementation Details: `DOWNLOADS_IMPLEMENTATION.md`
- Database Schema: See Supabase migrations
- API Reference: Check route files in `app/api/downloads/`
