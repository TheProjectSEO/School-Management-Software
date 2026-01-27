/**
 * API Route for File Upload to Supabase Storage
 * POST - Upload a file to course-content or lesson-attachments bucket
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTeacherProfile } from '@/lib/dal/teacher'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const teacherProfile = await getTeacherProfile()
    if (!teacherProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const bucket = formData.get('bucket') as string || 'lesson-attachments'
    const folder = formData.get('folder') as string || 'uploads'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate bucket
    const allowedBuckets = ['course-content', 'lesson-attachments']
    if (!allowedBuckets.includes(bucket)) {
      return NextResponse.json({ error: 'Invalid bucket' }, { status: 400 })
    }

    // Generate unique file path
    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filePath = `${folder}/${teacherProfile.id}/${timestamp}_${sanitizedFileName}`

    const supabase = await createClient()

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Upload error:', error)
      return NextResponse.json(
        { error: `Failed to upload: ${error.message}` },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path)

    return NextResponse.json({
      success: true,
      file: {
        path: data.path,
        url: publicUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/content/upload:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
