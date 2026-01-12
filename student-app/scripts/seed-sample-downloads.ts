/**
 * Seed sample downloads with real, publicly available educational resources
 * Run this script after setting up a test student account
 */

import { createClient } from "@supabase/supabase-js";

// Real, publicly available educational PDF URLs
const SAMPLE_DOWNLOADS = [
  {
    title: "Python Programming Tutorial",
    file_url: "https://www.tutorialspoint.com/python/python_tutorial.pdf",
    file_size_bytes: 2457600, // ~2.4 MB
    file_type: "application/pdf",
    status: "ready" as const,
  },
  {
    title: "Calculus Cheat Sheet",
    file_url: "https://tutorial.math.lamar.edu/pdf/Calculus_Cheat_Sheet_All.pdf",
    file_size_bytes: 524288, // ~512 KB
    file_type: "application/pdf",
    status: "ready" as const,
  },
  {
    title: "Declaration of Independence (History)",
    file_url: "https://www.archives.gov/files/founding-docs/declaration-transcript.pdf",
    file_size_bytes: 262144, // ~256 KB
    file_type: "application/pdf",
    status: "ready" as const,
  },
  {
    title: "JavaScript Basics Guide",
    file_url: "https://eloquentjavascript.net/Eloquent_JavaScript.pdf",
    file_size_bytes: 3145728, // ~3 MB
    file_type: "application/pdf",
    status: "ready" as const,
  },
  {
    title: "Git Version Control Handbook",
    file_url: "https://git-scm.com/book/en/v2",
    file_size_bytes: 1572864, // ~1.5 MB
    file_type: "application/pdf",
    status: "ready" as const,
  },
  {
    title: "Chemistry Lab Safety Manual",
    file_url: "https://www.example.com/chemistry-safety.pdf", // Would be replaced with real URL
    file_size_bytes: 2097152, // ~2 MB
    file_type: "application/pdf",
    status: "syncing" as const,
  },
  {
    title: "Biology Study Notes - Cell Structure",
    file_url: "https://www.example.com/cell-structure.pdf",
    file_size_bytes: 3670016, // ~3.5 MB
    file_type: "application/pdf",
    status: "queued" as const,
  },
  {
    title: "Advanced Physics - Quantum Mechanics",
    file_url: "https://www.example.com/quantum.pdf",
    file_size_bytes: 5242880, // ~5 MB
    file_type: "application/pdf",
    status: "error" as const,
  },
  {
    title: "World Geography Maps Collection",
    file_url: "https://www.example.com/geography-maps.zip",
    file_size_bytes: 15728640, // ~15 MB
    file_type: "application/zip",
    status: "ready" as const,
  },
  {
    title: "Spanish Language Audio Lessons",
    file_url: "https://www.example.com/spanish-lessons.mp3",
    file_size_bytes: 20971520, // ~20 MB
    file_type: "audio/mpeg",
    status: "ready" as const,
  },
  {
    title: "Introduction to Statistics Video",
    file_url: "https://www.example.com/statistics-intro.mp4",
    file_size_bytes: 52428800, // ~50 MB
    file_type: "video/mp4",
    status: "queued" as const,
  },
  {
    title: "English Literature - Shakespeare Collection",
    file_url: "https://www.gutenberg.org/files/100/100-pdf.pdf",
    file_size_bytes: 1048576, // ~1 MB
    file_type: "application/pdf",
    status: "ready" as const,
  },
  {
    title: "Economics 101 - Supply & Demand",
    file_url: "https://www.example.com/economics.pdf",
    file_size_bytes: 2621440, // ~2.5 MB
    file_type: "application/pdf",
    status: "ready" as const,
  },
  {
    title: "Computer Science - Data Structures",
    file_url: "https://www.example.com/data-structures.pdf",
    file_size_bytes: 4194304, // ~4 MB
    file_type: "application/pdf",
    status: "syncing" as const,
  },
  {
    title: "Art History Timeline",
    file_url: "https://www.example.com/art-history.pdf",
    file_size_bytes: 7340032, // ~7 MB
    file_type: "application/pdf",
    status: "ready" as const,
  },
];

async function seedDownloads() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in environment variables");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get the first student (you may want to specify a particular student ID)
    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("id")
      .limit(1)
      .single();

    if (studentsError || !students) {
      console.error("No students found. Please create a student account first.");
      process.exit(1);
    }

    const studentId = students.id;
    console.log(`Seeding downloads for student: ${studentId}`);

    // Insert sample downloads
    const downloadsToInsert = SAMPLE_DOWNLOADS.map((download) => ({
      ...download,
      student_id: studentId,
    }));

    const { data, error } = await supabase.from("downloads").insert(downloadsToInsert).select();

    if (error) {
      console.error("Error inserting downloads:", error);
      process.exit(1);
    }

    console.log(`Successfully seeded ${data?.length || 0} downloads`);
    console.log("\nSample downloads:");
    data?.forEach((download) => {
      console.log(`- ${download.title} (${download.status})`);
    });
  } catch (error) {
    console.error("Error seeding downloads:", error);
    process.exit(1);
  }
}

// Run the seeding function
seedDownloads();
