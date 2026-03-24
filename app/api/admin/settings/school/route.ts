import { NextRequest, NextResponse } from "next/server";
import { requireAdminAPI } from "@/lib/dal/admin";
import {
  getSchool,
  updateSchool,
  uploadSchoolLogo,
} from "@/lib/dal/settings";
// GET /api/admin/settings/school - Get school info
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminAPI();
    if (!auth.success) return auth.response;
    const admin = auth.admin;

    const school = await getSchool(admin.schoolId);

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    return NextResponse.json({
      name: school.name || '',
      code: school.slug || '',
      logo: school.logo_url || null,
      region: school.region || '',
      division: school.division || '',
      // Fields not stored in DB — return empty so UI shows editable placeholders
      address: '',
      city: school.division || '',
      province: school.region || '',
      postalCode: '',
      phone: '',
      email: '',
      website: '',
      principal: '',
      foundedYear: '',
      schoolType: '',
    });
  } catch (error) {
    console.error("Error in GET /api/admin/settings/school:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/settings/school - Update school info
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdminAPI('settings:update');
    if (!auth.success) return auth.response;
    const admin = auth.admin;

    const body = await request.json();

    // Only update fields that exist in the schools table
    const updates: Record<string, string> = {};
    if (body.name) updates.name = body.name;
    if (body.code) updates.slug = body.code;
    if (body.region) updates.region = body.region;
    if (body.division) updates.division = body.division;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: true }); // nothing to save
    }

    const result = await updateSchool(admin.schoolId, updates);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in PUT /api/admin/settings/school:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/settings/school - Upload school logo
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminAPI('settings:update');
    if (!auth.success) return auth.response;
    const admin = auth.admin;

    const formData = await request.formData();
    const file = formData.get("logo") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP, SVG" },
        { status: 400 }
      );
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 2MB" },
        { status: 400 }
      );
    }

    const result = await uploadSchoolLogo(admin.schoolId, file);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, url: result.data?.url });
  } catch (error) {
    console.error("Error in POST /api/admin/settings/school:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
