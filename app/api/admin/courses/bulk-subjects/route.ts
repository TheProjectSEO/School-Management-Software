import { NextRequest, NextResponse } from "next/server";
import { requireAdminAPI } from "@/lib/dal/admin";
import { createAdminClient } from "@/lib/supabase/admin";

// Standard Philippine DepEd K-12 subjects for Grade 1-6
const ELEMENTARY_SUBJECTS: Record<string, { name: string; code: string; description: string }[]> = {
  "1": [
    { name: "Mother Tongue", code: "MTB1", description: "Mother Tongue-Based Multilingual Education for Grade 1" },
    { name: "Filipino", code: "FIL1", description: "Filipino language and communication for Grade 1" },
    { name: "English", code: "ENG1", description: "English language arts for Grade 1" },
    { name: "Mathematics", code: "MATH1", description: "Mathematics fundamentals for Grade 1" },
    { name: "Araling Panlipunan", code: "AP1", description: "Social studies for Grade 1" },
    { name: "Science", code: "SCI1", description: "General science for Grade 1" },
    { name: "Music", code: "MUS1", description: "Music appreciation and fundamentals for Grade 1" },
    { name: "Arts", code: "ART1", description: "Visual arts and creativity for Grade 1" },
    { name: "Physical Education", code: "PE1", description: "Physical education and health for Grade 1" },
    { name: "Health", code: "HE1", description: "Health education for Grade 1" },
    { name: "Edukasyon sa Pagpapakatao", code: "ESP1", description: "Values education for Grade 1" },
  ],
  "2": [
    { name: "Mother Tongue", code: "MTB2", description: "Mother Tongue-Based Multilingual Education for Grade 2" },
    { name: "Filipino", code: "FIL2", description: "Filipino language and communication for Grade 2" },
    { name: "English", code: "ENG2", description: "English language arts for Grade 2" },
    { name: "Mathematics", code: "MATH2", description: "Mathematics fundamentals for Grade 2" },
    { name: "Araling Panlipunan", code: "AP2", description: "Social studies for Grade 2" },
    { name: "Science", code: "SCI2", description: "General science for Grade 2" },
    { name: "Music", code: "MUS2", description: "Music appreciation and fundamentals for Grade 2" },
    { name: "Arts", code: "ART2", description: "Visual arts and creativity for Grade 2" },
    { name: "Physical Education", code: "PE2", description: "Physical education and health for Grade 2" },
    { name: "Health", code: "HE2", description: "Health education for Grade 2" },
    { name: "Edukasyon sa Pagpapakatao", code: "ESP2", description: "Values education for Grade 2" },
  ],
  "3": [
    { name: "Mother Tongue", code: "MTB3", description: "Mother Tongue-Based Multilingual Education for Grade 3" },
    { name: "Filipino", code: "FIL3", description: "Filipino language and communication for Grade 3" },
    { name: "English", code: "ENG3", description: "English language arts for Grade 3" },
    { name: "Mathematics", code: "MATH3", description: "Mathematics for Grade 3" },
    { name: "Araling Panlipunan", code: "AP3", description: "Social studies for Grade 3" },
    { name: "Science", code: "SCI3", description: "General science for Grade 3" },
    { name: "Music", code: "MUS3", description: "Music appreciation and fundamentals for Grade 3" },
    { name: "Arts", code: "ART3", description: "Visual arts and creativity for Grade 3" },
    { name: "Physical Education", code: "PE3", description: "Physical education and health for Grade 3" },
    { name: "Health", code: "HE3", description: "Health education for Grade 3" },
    { name: "Edukasyon sa Pagpapakatao", code: "ESP3", description: "Values education for Grade 3" },
  ],
  "4": [
    { name: "Filipino", code: "FIL4", description: "Filipino language and communication for Grade 4" },
    { name: "English", code: "ENG4", description: "English language arts for Grade 4" },
    { name: "Mathematics", code: "MATH4", description: "Mathematics for Grade 4" },
    { name: "Araling Panlipunan", code: "AP4", description: "Social studies and history for Grade 4" },
    { name: "Science", code: "SCI4", description: "General science for Grade 4" },
    { name: "Music", code: "MUS4", description: "Music appreciation for Grade 4" },
    { name: "Arts", code: "ART4", description: "Visual arts for Grade 4" },
    { name: "Physical Education", code: "PE4", description: "Physical education for Grade 4" },
    { name: "Health", code: "HE4", description: "Health education for Grade 4" },
    { name: "Edukasyon sa Pagpapakatao", code: "ESP4", description: "Values education for Grade 4" },
    { name: "Technology and Livelihood Education", code: "TLE4", description: "Technology and livelihood for Grade 4" },
  ],
  "5": [
    { name: "Filipino", code: "FIL5", description: "Filipino language and communication for Grade 5" },
    { name: "English", code: "ENG5", description: "English language arts for Grade 5" },
    { name: "Mathematics", code: "MATH5", description: "Mathematics for Grade 5" },
    { name: "Araling Panlipunan", code: "AP5", description: "Social studies and history for Grade 5" },
    { name: "Science", code: "SCI5", description: "General science for Grade 5" },
    { name: "Music", code: "MUS5", description: "Music appreciation for Grade 5" },
    { name: "Arts", code: "ART5", description: "Visual arts for Grade 5" },
    { name: "Physical Education", code: "PE5", description: "Physical education for Grade 5" },
    { name: "Health", code: "HE5", description: "Health education for Grade 5" },
    { name: "Edukasyon sa Pagpapakatao", code: "ESP5", description: "Values education for Grade 5" },
    { name: "Technology and Livelihood Education", code: "TLE5", description: "Technology and livelihood for Grade 5" },
  ],
  "6": [
    { name: "Filipino", code: "FIL6", description: "Filipino language and communication for Grade 6" },
    { name: "English", code: "ENG6", description: "English language arts for Grade 6" },
    { name: "Mathematics", code: "MATH6", description: "Mathematics for Grade 6" },
    { name: "Araling Panlipunan", code: "AP6", description: "Social studies and history for Grade 6" },
    { name: "Science", code: "SCI6", description: "General science for Grade 6" },
    { name: "Music", code: "MUS6", description: "Music appreciation for Grade 6" },
    { name: "Arts", code: "ART6", description: "Visual arts for Grade 6" },
    { name: "Physical Education", code: "PE6", description: "Physical education for Grade 6" },
    { name: "Health", code: "HE6", description: "Health education for Grade 6" },
    { name: "Edukasyon sa Pagpapakatao", code: "ESP6", description: "Values education for Grade 6" },
    { name: "Technology and Livelihood Education", code: "TLE6", description: "Technology and livelihood for Grade 6" },
  ],
};

// POST /api/admin/courses/bulk-subjects - Bulk create standard subjects for selected grade levels
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminAPI("users:create");
    if (!auth.success) return auth.response;

    const body = await request.json();
    const { grade_levels } = body as { grade_levels: string[] };

    if (!grade_levels || !Array.isArray(grade_levels) || grade_levels.length === 0) {
      return NextResponse.json(
        { error: "Please select at least one grade level" },
        { status: 400 }
      );
    }

    // Validate grade levels
    const validGrades = ["1", "2", "3", "4", "5", "6"];
    const invalidGrades = grade_levels.filter((g) => !validGrades.includes(g));
    if (invalidGrades.length > 0) {
      return NextResponse.json(
        { error: `Invalid grade levels: ${invalidGrades.join(", ")}. Only Grade 1-6 are supported.` },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get existing subject codes for this school to avoid duplicates
    const { data: existingCourses } = await supabase
      .from("courses")
      .select("subject_code")
      .eq("school_id", auth.admin.schoolId);

    const existingCodes = new Set((existingCourses || []).map((c) => c.subject_code));

    // Build insert list, skipping duplicates
    const toInsert: {
      name: string;
      subject_code: string;
      description: string;
      grade_level: string;
      is_active: boolean;
      school_id: string;
    }[] = [];
    const skipped: string[] = [];

    for (const grade of grade_levels) {
      const subjects = ELEMENTARY_SUBJECTS[grade];
      if (!subjects) continue;

      for (const subj of subjects) {
        if (existingCodes.has(subj.code)) {
          skipped.push(`${subj.code} (${subj.name})`);
          continue;
        }
        toInsert.push({
          name: subj.name,
          subject_code: subj.code,
          description: subj.description,
          grade_level: grade,
          is_active: true,
          school_id: auth.admin.schoolId,
        });
      }
    }

    if (toInsert.length === 0) {
      return NextResponse.json({
        created: 0,
        skipped: skipped.length,
        skipped_subjects: skipped,
        message: "All subjects already exist for the selected grade levels.",
      });
    }

    // Insert in batches of 50
    let totalCreated = 0;
    for (let i = 0; i < toInsert.length; i += 50) {
      const batch = toInsert.slice(i, i + 50);
      const { error: insertError, count } = await supabase
        .from("courses")
        .insert(batch);

      if (insertError) {
        console.error("Error inserting batch:", insertError);
        return NextResponse.json(
          { error: `Failed to create subjects. ${totalCreated} created before error.`, details: insertError.message },
          { status: 500 }
        );
      }
      totalCreated += batch.length;
    }

    return NextResponse.json({
      created: totalCreated,
      skipped: skipped.length,
      skipped_subjects: skipped.length > 0 ? skipped : undefined,
      message: `Successfully created ${totalCreated} subjects${skipped.length > 0 ? `. ${skipped.length} already existed and were skipped.` : "."}`,
    }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/admin/courses/bulk-subjects:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
