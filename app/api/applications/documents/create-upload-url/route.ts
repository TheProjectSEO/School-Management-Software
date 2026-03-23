import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createServiceClient } from "@/lib/supabase/service";

type UploadRequest = {
  applicationId: string;
  documentType: string;
  fileName: string;
  fileType: string;
  uploadToken?: string;
};

function makeUploadToken(applicationId: string): string {
  const secret = process.env.JWT_SECRET || "fallback-secret";
  return createHmac("sha256", secret).update(`upload:${applicationId}`).digest("hex");
}

function verifyUploadToken(applicationId: string, token: string): boolean {
  const expected = makeUploadToken(applicationId);
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch {
    return false;
  }
}

// POST /api/applications/documents/create-upload-url - Get signed URL for document upload
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as UploadRequest;

    if (!body.applicationId || !body.documentType || !body.fileName || !body.fileType) {
      return NextResponse.json(
        { error: "applicationId, documentType, fileName, fileType are required" },
        { status: 400 }
      );
    }

    // Verify upload token (prevents unauthorized uploads to arbitrary application IDs)
    if (!body.uploadToken || !verifyUploadToken(body.applicationId, body.uploadToken)) {
      return NextResponse.json({ error: "Invalid upload token" }, { status: 403 });
    }

    const supabase = createServiceClient();

    // Verify the application exists
    const { data: application, error: appError } = await supabase
      .from("student_applications")
      .select("id")
      .eq("id", body.applicationId)
      .single();

    if (appError || !application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Generate file path
    const fileExt = body.fileName.split(".").pop() || "bin";
    const filePath = `applications/${body.applicationId}/${body.documentType}_${Date.now()}.${fileExt}`;

    // Create signed upload URL
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("application-documents")
      .createSignedUploadUrl(filePath);

    if (uploadError) {
      console.error("Error creating upload URL", uploadError);
      return NextResponse.json(
        { error: "Failed to create upload URL" },
        { status: 500 }
      );
    }

    // Record the document in the database
    const { error: docError } = await supabase
      .from("application_documents")
      .insert({
        application_id: body.applicationId,
        document_type: body.documentType,
        file_name: body.fileName,
        mime_type: body.fileType,
        storage_path: filePath,
        verified: false,
      });

    if (docError) {
      console.error("Error recording document", docError);
      // Continue anyway - upload is more important
    }

    return NextResponse.json({
      uploadUrl: uploadData.signedUrl,
      path: filePath,
    });
  } catch (err) {
    console.error("POST /api/applications/documents/create-upload-url error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
