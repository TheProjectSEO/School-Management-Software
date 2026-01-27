import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import crypto from "crypto";

const BUCKET = "application-documents";

export async function POST(req: NextRequest) {
  try {
    const { applicationId, documentType, fileName, fileType } = await req.json();

    if (!applicationId || !documentType || !fileName || !fileType) {
      return NextResponse.json({ error: "applicationId, documentType, fileName, fileType are required" }, { status: 400 });
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const path = `${applicationId}/${Date.now()}-${crypto.randomBytes(6).toString("hex")}-${safeName}`;

    const supabase = createServiceClient();

    const { data: signed, error: signedError } = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(path);

    if (signedError || !signed?.signedUrl) {
      console.error("createSignedUploadUrl error", signedError);
      return NextResponse.json({ error: "Failed to create upload URL" }, { status: 500 });
    }

    const { data: doc, error: docError } = await supabase
      .from("application_documents")
      .insert({
        application_id: applicationId,
        document_type: documentType,
        file_name: fileName,
        mime_type: fileType,
        storage_path: path,
      })
      .select("id, document_type, storage_path")
      .single();

    if (docError) {
      console.error("insert application_documents error", docError);
      return NextResponse.json({ error: "Failed to create document record" }, { status: 500 });
    }

    return NextResponse.json({
      uploadUrl: signed.signedUrl,
      path,
      documentId: doc.id,
      token: signed.token,
    });
  } catch (err) {
    console.error("POST /api/applications/documents/create-upload-url", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
