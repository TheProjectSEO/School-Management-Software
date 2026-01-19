import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

const BUCKET = "application-documents";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; docId: string } }
) {
  const supabase = createServiceClient();

  const { data: doc, error } = await supabase
    .from("application_documents")
    .select("storage_path, file_name, mime_type")
    .eq("id", params.docId)
    .eq("application_id", params.id)
    .single();

  if (error || !doc) {
    console.error("document lookup error", error);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: signed, error: signedError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(doc.storage_path, 60 * 10); // 10 minutes

  if (signedError || !signed?.signedUrl) {
    console.error("signed url error", signedError);
    return NextResponse.json({ error: "Failed to sign URL" }, { status: 500 });
  }

  return NextResponse.json({
    url: signed.signedUrl,
    fileName: doc.file_name,
    mimeType: doc.mime_type,
  });
}
