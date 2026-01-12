import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Sample downloads to seed
const sampleDownloads = [
  {
    title: 'Data Structures Study Guide',
    file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    file_size_bytes: 1024000,
    file_type: 'application/pdf',
    status: 'ready'
  },
  {
    title: 'Algorithm Analysis Cheat Sheet',
    file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    file_size_bytes: 512000,
    file_type: 'application/pdf',
    status: 'ready'
  },
  {
    title: 'Database Design Templates',
    file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    file_size_bytes: 2048000,
    file_type: 'application/pdf',
    status: 'ready'
  },
  {
    title: 'SQL Query Examples',
    file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    file_size_bytes: 768000,
    file_type: 'application/pdf',
    status: 'ready'
  },
  {
    title: 'Web Development Basics Video',
    file_url: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
    file_size_bytes: 10485760,
    file_type: 'video/mp4',
    status: 'ready'
  },
  {
    title: 'CSS Flexbox Tutorial',
    file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    file_size_bytes: 1536000,
    file_type: 'application/pdf',
    status: 'syncing'
  },
  {
    title: 'JavaScript ES6 Features',
    file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    file_size_bytes: 896000,
    file_type: 'application/pdf',
    status: 'queued'
  }
];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get student ID
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("profile_id", profile.id)
      .single();

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Check how many downloads already exist
    const { count: existingCount } = await supabase
      .from("student_downloads")
      .select("*", { count: "exact", head: true })
      .eq("student_id", student.id);

    if (existingCount && existingCount >= 5) {
      return NextResponse.json({
        message: "Downloads already exist",
        count: existingCount
      });
    }

    // Insert sample downloads
    const results = [];
    for (const download of sampleDownloads) {
      const { data, error } = await supabase
        .from("student_downloads")
        .insert({
          student_id: student.id,
          ...download
        })
        .select()
        .single();

      if (error) {
        console.error(`Error inserting ${download.title}:`, error);
        results.push({ title: download.title, success: false, error: error.message });
      } else {
        results.push({ title: download.title, success: true, id: data.id });
      }
    }

    const successCount = results.filter(r => r.success).length;
    return NextResponse.json({
      message: `Seeded ${successCount} of ${sampleDownloads.length} downloads`,
      results
    });
  } catch (error) {
    console.error("Seed downloads error:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
