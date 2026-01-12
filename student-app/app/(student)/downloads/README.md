# Downloads Page - MSU Student Portal

## Overview

The Downloads page provides students with access to offline learning materials. Students can download educational resources (PDFs, videos, documents, audio files) and manage them efficiently.

## Features

### 1. **Download Management**
- View all downloaded materials with file information (name, type, size)
- Download individual files with a single click
- Download all ready files at once (batch download)
- Real file downloads that trigger browser download dialogs

### 2. **Status Tracking**
Files can have four different statuses:
- **Ready**: File is ready for download
- **Syncing**: File is currently being synced/downloaded
- **Queued**: File is waiting to be synced
- **Error**: File download/sync failed

### 3. **File Type Support**
- **Documents**: PDFs, Word documents, presentations
- **Videos**: MP4, AVI, educational video content
- **Images**: PNG, JPG, diagrams, charts
- **Audio**: MP3, audio lessons, podcasts
- **Archives**: ZIP files containing multiple resources

### 4. **Filtering & Organization**
- Filter by file type (Videos, Documents, Images, Audio)
- Filter by status (All, Queued, History)
- Status badges with visual indicators
- Sort by date added

### 5. **Storage Management**
- Visual storage indicator showing space used
- Total storage: 10 GB default
- Real-time calculation of used space
- Individual file size display

### 6. **Actions**
- **Download**: Download ready files to device
- **Delete**: Remove files from download list
- **Retry**: Retry failed downloads
- **Download All**: Batch download all ready files

## File Structure

```
app/(student)/downloads/
├── page.tsx              # Server component - fetches data
├── DownloadsClient.tsx   # Client component - UI and interactions
└── README.md            # This file

lib/dal/
└── downloads.ts         # Data access functions

app/api/downloads/
├── [id]/route.ts        # Download/delete single file
└── batch/route.ts       # Batch download endpoint
```

## API Routes

### GET `/api/downloads/[id]`
Get download URL for a specific file.

**Response:**
```json
{
  "url": "https://example.com/file.pdf"
}
```

### DELETE `/api/downloads/[id]`
Delete a download from the student's list.

**Response:**
```json
{
  "success": true
}
```

### PATCH `/api/downloads/[id]`
Update download status.

**Request:**
```json
{
  "status": "ready" | "syncing" | "queued" | "error"
}
```

### POST `/api/downloads/batch`
Get download URLs for multiple files.

**Request:**
```json
{
  "downloadIds": ["id1", "id2", "id3"]
}
```

**Response:**
```json
{
  "downloads": [
    {
      "id": "id1",
      "title": "File Name",
      "url": "https://example.com/file.pdf",
      "fileName": "file.pdf"
    }
  ]
}
```

## Database Schema

The `downloads` table contains:
- `id`: UUID primary key
- `student_id`: Foreign key to students table
- `lesson_id`: Optional foreign key to lessons
- `module_id`: Optional foreign key to modules
- `title`: Display name of the file
- `file_url`: URL to the actual file
- `file_size_bytes`: File size in bytes
- `file_type`: MIME type (e.g., "application/pdf")
- `status`: Current status (ready, syncing, queued, error)
- `created_at`: Timestamp

## Usage Examples

### Adding Sample Downloads

Run the seed script to add sample downloads:

```bash
# Using Supabase migration
npx supabase db reset

# Or using the TypeScript seed script
npm run seed:downloads
```

### Real File URLs

The system supports both:
1. **Direct URLs**: Public URLs that download directly
2. **Supabase Storage**: Files stored in Supabase Storage (with signed URLs)

Example file URLs used:
- Python Tutorial: `https://www.tutorialspoint.com/python/python_tutorial.pdf`
- Math Reference: `https://tutorial.math.lamar.edu/pdf/Calculus_Cheat_Sheet_All.pdf`
- Historical Documents: `https://www.archives.gov/files/founding-docs/declaration-transcript.pdf`

### File Type Detection

The system automatically detects file types and shows appropriate icons:
- PDF/Documents → Blue document icon
- Videos → Red play icon
- Images → Green image icon
- Audio → Purple headphone icon
- ZIP files → Yellow folder icon

## Security

- All downloads are validated against the logged-in student
- Row-Level Security (RLS) policies ensure students can only access their own downloads
- Supabase Storage files use signed URLs with 1-hour expiration
- No direct file access without authentication

## Performance Considerations

- Downloads are paginated (default: show all, can be updated)
- Batch downloads include 500ms delay between files to prevent browser blocking
- File size calculations are cached in the database
- Real-time updates on status changes

## Future Enhancements

Potential improvements:
1. Progress tracking for syncing files
2. Automatic retry for failed downloads
3. Download queue prioritization
4. Offline mode indicator
5. Search functionality
6. Download history with timestamps
7. File preview before download
8. Share downloads with other students
9. Download scheduling (download at specific times)
10. Bandwidth usage tracking

## Troubleshooting

### Downloads Not Working
1. Check if student is logged in
2. Verify file URLs are accessible
3. Check browser download settings
4. Ensure RLS policies allow access

### Batch Download Blocked
Some browsers block multiple simultaneous downloads. The system includes delays, but users may need to:
- Allow multiple downloads in browser settings
- Download files individually if batch fails

### File Size Incorrect
File sizes are stored in bytes. If incorrect:
1. Verify the `file_size_bytes` value in database
2. Re-seed sample data if needed
3. Update file information

## Testing

To test the downloads page:
1. Create a student account
2. Run the seed script to add sample downloads
3. Navigate to `/downloads`
4. Test individual downloads
5. Test batch download
6. Test filtering by type
7. Test status filtering
8. Test delete functionality
9. Test retry on error status
