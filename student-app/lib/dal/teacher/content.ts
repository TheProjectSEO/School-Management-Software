/**
 * Teacher Content Management Data Access Layer
 *
 * Handles module creation, transcript publishing, and content asset management.
 * All queries use n8n_content_creation schema.
 */

import { createClient } from '@/lib/supabase/server';

// Types
export interface Subject {
  id: string;
  name: string;
  code?: string;
  description?: string;
  school_id: string;
  created_at: string;
  updated_at: string;
}

export interface Module {
  id: string;
  subject_id: string;
  title: string;
  description?: string;
  objectives?: string[];
  order: number;
  status: 'draft' | 'published' | 'archived';
  is_published: boolean;
  published_at?: string;
  published_by?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateModuleInput {
  subject_id: string;
  title: string;
  description?: string;
  objectives?: string[];
  order?: number;
  created_by: string;
}

export interface Transcript {
  id: string;
  module_id: string;
  source_type: 'recording' | 'upload' | 'ai_generated' | 'manual';
  text: string;
  timestamps_json?: Record<string, unknown>;
  version: number;
  is_published: boolean;
  published_at?: string;
  published_by?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTranscriptInput {
  module_id: string;
  source_type: 'recording' | 'upload' | 'ai_generated' | 'manual';
  text: string;
  timestamps_json?: Record<string, unknown>;
  created_by: string;
}

export interface ContentAsset {
  id: string;
  owner_type: 'module' | 'assessment' | 'submission' | 'message';
  owner_id: string;
  asset_type: 'video' | 'audio' | 'document' | 'image' | 'other';
  storage_path: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  meta_json?: Record<string, unknown>;
  created_by: string;
  created_at: string;
}

export interface UploadContentAssetInput {
  owner_type: 'module' | 'assessment' | 'submission' | 'message';
  owner_id: string;
  asset_type: 'video' | 'audio' | 'document' | 'image' | 'other';
  file: File;
  created_by: string;
}

/**
 * Get all subjects assigned to a teacher
 * Returns unique subjects across all section assignments
 */
export async function getTeacherSubjects(teacherId: string): Promise<Subject[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('section_subjects')
      .select(`
        subject_id,
        subjects (
          id,
          name,
          code,
          description,
          school_id,
          created_at,
          updated_at
        )
      `)
      .eq('teacher_id', teacherId);

    if (error) {
      console.error('Error fetching teacher subjects:', error);
      return [];
    }

    // Deduplicate subjects by id
    const subjectMap = new Map<string, Subject>();
    (data || []).forEach((item: any) => {
      if (item.subjects && !subjectMap.has(item.subjects.id)) {
        subjectMap.set(item.subjects.id, item.subjects as Subject);
      }
    });

    return Array.from(subjectMap.values());
  } catch (error) {
    console.error('Unexpected error in getTeacherSubjects:', error);
    return [];
  }
}

/**
 * Create a new module
 * Sets status to 'draft' and is_published to false initially
 */
export async function createModule(input: CreateModuleInput): Promise<Module | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('modules')
      .insert({
        subject_id: input.subject_id,
        title: input.title,
        description: input.description,
        objectives: input.objectives,
        order: input.order || 999,
        status: 'draft',
        is_published: false,
        created_by: input.created_by,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating module:', error);
      return null;
    }

    return data as Module;
  } catch (error) {
    console.error('Unexpected error in createModule:', error);
    return null;
  }
}

/**
 * Publish a module (set is_published=true)
 * Records timestamp and publisher
 */
export async function publishModule(
  moduleId: string,
  publishedBy: string
): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('modules')
      .update({
        status: 'published',
        is_published: true,
        published_at: new Date().toISOString(),
        published_by: publishedBy,
        updated_at: new Date().toISOString()
      })
      .eq('id', moduleId);

    if (error) {
      console.error('Error publishing module:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error in publishModule:', error);
    return false;
  }
}

/**
 * Create a transcript for a module
 * Starts as unpublished (is_published=false)
 */
export async function createTranscript(input: CreateTranscriptInput): Promise<Transcript | null> {
  try {
    const supabase = await createClient();

    // Get current max version for this module
    const { data: existing } = await supabase
      .from('transcripts')
      .select('version')
      .eq('module_id', input.module_id)
      .order('version', { ascending: false })
      .limit(1);

    const nextVersion = (existing?.[0]?.version || 0) + 1;

    const { data, error } = await supabase
      .from('transcripts')
      .insert({
        module_id: input.module_id,
        source_type: input.source_type,
        text: input.text,
        timestamps_json: input.timestamps_json,
        version: nextVersion,
        is_published: false,
        created_by: input.created_by,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating transcript:', error);
      return null;
    }

    return data as Transcript;
  } catch (error) {
    console.error('Unexpected error in createTranscript:', error);
    return null;
  }
}

/**
 * Publish a transcript (set is_published=true)
 * Only one transcript can be published per module at a time (unpublish others first)
 */
export async function publishTranscript(
  transcriptId: string,
  publishedBy: string
): Promise<boolean> {
  try {
    const supabase = await createClient();

    // First, get the module_id of this transcript
    const { data: transcript } = await supabase
      .from('transcripts')
      .select('module_id')
      .eq('id', transcriptId)
      .single();

    if (!transcript) {
      console.error('Transcript not found');
      return false;
    }

    // Unpublish all other transcripts for this module
    await supabase
      .from('transcripts')
      .update({ is_published: false })
      .eq('module_id', transcript.module_id);

    // Publish this transcript
    const { error } = await supabase
      .from('transcripts')
      .update({
        is_published: true,
        published_at: new Date().toISOString(),
        published_by: publishedBy,
        updated_at: new Date().toISOString()
      })
      .eq('id', transcriptId);

    if (error) {
      console.error('Error publishing transcript:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error in publishTranscript:', error);
    return false;
  }
}

/**
 * Get all transcripts for a module
 * Ordered by version descending (newest first)
 */
export async function getModuleTranscripts(moduleId: string): Promise<Transcript[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('transcripts')
      .select('*')
      .eq('module_id', moduleId)
      .order('version', { ascending: false });

    if (error) {
      console.error('Error fetching module transcripts:', error);
      return [];
    }

    return data as Transcript[];
  } catch (error) {
    console.error('Unexpected error in getModuleTranscripts:', error);
    return [];
  }
}

/**
 * Upload a content asset to Supabase Storage
 * Stores metadata in content_assets table
 */
export async function uploadContentAsset(
  input: UploadContentAssetInput
): Promise<ContentAsset | null> {
  try {
    const supabase = await createClient();

    // Determine storage bucket based on owner_type
    const bucketMap: Record<string, string> = {
      module: 'teacher_assets',
      assessment: 'teacher_assets',
      submission: 'submissions',
      message: 'message_attachments'
    };

    const bucket = bucketMap[input.owner_type] || 'teacher_assets';

    // Generate unique file path
    const timestamp = Date.now();
    const sanitizedFileName = input.file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${input.owner_type}/${input.owner_id}/${timestamp}_${sanitizedFileName}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, input.file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading file to storage:', uploadError);
      return null;
    }

    // Create database record
    const { data, error: dbError } = await supabase
      .from('content_assets')
      .insert({
        owner_type: input.owner_type,
        owner_id: input.owner_id,
        asset_type: input.asset_type,
        storage_path: storagePath,
        file_name: input.file.name,
        file_size: input.file.size,
        mime_type: input.file.type,
        meta_json: {
          bucket,
          original_name: input.file.name
        },
        created_by: input.created_by,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error creating content asset record:', dbError);
      // Attempt to clean up uploaded file
      await supabase.storage.from(bucket).remove([storagePath]);
      return null;
    }

    return data as ContentAsset;
  } catch (error) {
    console.error('Unexpected error in uploadContentAsset:', error);
    return null;
  }
}

/**
 * Get public URL for a content asset
 */
export async function getContentAssetUrl(assetId: string): Promise<string | null> {
  try {
    const supabase = await createClient();

    const { data: asset } = await supabase
      .from('content_assets')
      .select('storage_path, meta_json')
      .eq('id', assetId)
      .single();

    if (!asset) {
      return null;
    }

    const bucket = (asset.meta_json as any)?.bucket || 'teacher_assets';

    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(asset.storage_path);

    return data.publicUrl;
  } catch (error) {
    console.error('Unexpected error in getContentAssetUrl:', error);
    return null;
  }
}
