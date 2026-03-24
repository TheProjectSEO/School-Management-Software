import { NextResponse } from 'next/server';
import { requireTeacherAPI } from '@/lib/auth/requireTeacherAPI';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET() {
  const auth = await requireTeacherAPI();
  if (!auth.success) return auth.response;

  const supabase = createServiceClient();
  const { data: periods, error } = await supabase
    .from('grading_periods')
    .select('id, name, start_date, end_date, is_active, order')
    .eq('school_id', auth.teacher.schoolId)
    .order('order', { ascending: true });

  if (error) {
    console.error('Error fetching grading periods:', error);
    return NextResponse.json({ error: 'Failed to fetch grading periods' }, { status: 500 });
  }

  return NextResponse.json({ periods: periods || [] });
}
