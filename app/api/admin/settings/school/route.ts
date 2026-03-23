import { NextRequest, NextResponse } from "next/server";
import { requireAdminAPI } from "@/lib/dal/admin";
import {
  getSchoolSettings,
  updateSchoolSettings,
  uploadSchoolLogo,
  SchoolSettings,
} from "@/lib/dal/settings";

// GET /api/admin/settings/school - Get school settings
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminAPI();
    if (!auth.success) return auth.response;
    const admin = auth.admin;

    const settings = await getSchoolSettings(admin.schoolId);

    if (!settings) {
      return NextResponse.json({ error: "Settings not found" }, { status: 404 });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error in GET /api/admin/settings/school:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/settings/school - Update school settings
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdminAPI('settings:update');
    if (!auth.success) return auth.response;
    const admin = auth.admin;

    const body = await request.json();

    // Build updates object, only including valid fields
    const updates: Partial<SchoolSettings> = {};
    const validFields = [
      "name", "code", "address", "city", "province", "postal_code",
      "phone", "email", "website", "principal", "founded_year", "school_type"
    ];

    for (const field of validFields) {
      if (body[field] !== undefined) {
        updates[field as keyof SchoolSettings] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const result = await updateSchoolSettings(admin.schoolId, updates);

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
