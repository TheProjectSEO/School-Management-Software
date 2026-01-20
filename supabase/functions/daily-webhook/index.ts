import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const DAILY_API_KEY = Deno.env.get("DAILY_API_KEY") ?? "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type DailyWebhookPayload = Record<string, unknown>;

function extractRecordingId(payload: DailyWebhookPayload) {
  return (
    payload["recording_id"] ||
    payload["recordingId"] ||
    (payload["recording"] as Record<string, unknown> | undefined)?.id ||
    (payload["payload"] as Record<string, unknown> | undefined)?.recording_id ||
    ((payload["payload"] as Record<string, unknown> | undefined)?.recording as
      | Record<string, unknown>
      | undefined)?.id
  ) as string | undefined;
}

function extractRoomName(payload: DailyWebhookPayload) {
  return (
    payload["room_name"] ||
    payload["roomName"] ||
    (payload["room"] as Record<string, unknown> | undefined)?.name ||
    (payload["payload"] as Record<string, unknown> | undefined)?.room_name ||
    ((payload["payload"] as Record<string, unknown> | undefined)?.room as
      | Record<string, unknown>
      | undefined)?.name
  ) as string | undefined;
}

function extractEventType(payload: DailyWebhookPayload) {
  return (
    payload["type"] ||
    payload["event"] ||
    (payload["payload"] as Record<string, unknown> | undefined)?.type
  ) as string | undefined;
}

async function fetchDailyRecording(recordingId: string) {
  const response = await fetch(`https://api.daily.co/v1/recordings/${recordingId}`, {
    headers: {
      Authorization: `Bearer ${DAILY_API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Daily recording fetch failed: ${response.status}`);
  }

  return response.json() as Promise<{
    download_url?: string;
    duration?: number;
  }>;
}

function chunkText(text: string, maxChars = 1800) {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if ((current + " " + sentence).trim().length > maxChars && current.trim().length > 0) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current = `${current} ${sentence}`.trim();
    }
  }

  if (current.trim().length > 0) {
    chunks.push(current.trim());
  }

  return chunks;
}

async function transcribeWithOpenAI(recordingBuffer: ArrayBuffer) {
  const file = new File([recordingBuffer], "recording.mp4", { type: "video/mp4" });
  const formData = new FormData();
  formData.append("model", "whisper-1");
  formData.append("file", file);
  formData.append("response_format", "verbose_json");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI transcription failed: ${errorText}`);
  }

  return response.json() as Promise<{
    text: string;
    language?: string;
    segments?: unknown[];
  }>;
}

async function embedChunks(chunks: string[]) {
  const results: number[][] = [];
  const batchSize = 16;

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: batch,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI embeddings failed: ${errorText}`);
    }

    const data = await response.json() as { data: { embedding: number[] }[] };
    data.data.forEach((item) => results.push(item.embedding));
  }

  return results;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !DAILY_API_KEY) {
    return new Response("Missing required environment variables", { status: 500 });
  }

  const payload = (await req.json()) as DailyWebhookPayload;
  const eventType = extractEventType(payload) ?? "unknown";
  const recordingId = extractRecordingId(payload);
  const roomName = extractRoomName(payload);

  if (!recordingId || !roomName) {
    console.error("Daily webhook missing recordingId or roomName", payload);
    return new Response("Missing recordingId or roomName", { status: 400 });
  }

  const { data: session, error: sessionError } = await supabase
    .from("live_sessions")
    .select("id")
    .eq("daily_room_name", roomName)
    .single();

  if (sessionError || !session) {
    console.error("Live session not found for room", roomName, sessionError);
    return new Response("Session not found", { status: 404 });
  }

  try {
    const recording = await fetchDailyRecording(recordingId);
    if (!recording.download_url) {
      throw new Error("Recording download URL missing");
    }

    const recordingResponse = await fetch(recording.download_url);
    if (!recordingResponse.ok) {
      throw new Error(`Failed to download recording: ${recordingResponse.status}`);
    }

    const recordingBuffer = await recordingResponse.arrayBuffer();
    const fileName = `${session.id}/recording.mp4`;

    const { error: uploadError } = await supabase.storage
      .from("session-recordings")
      .upload(fileName, new Uint8Array(recordingBuffer), {
        contentType: "video/mp4",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    await supabase
      .from("live_sessions")
      .update({
        recording_url: fileName,
        recording_size_bytes: recordingBuffer.byteLength,
        recording_duration_seconds: recording.duration ?? null,
      })
      .eq("id", session.id);

    if (OPENAI_API_KEY) {
      const transcript = await transcribeWithOpenAI(recordingBuffer);
      await supabase.from("session_transcripts").upsert(
        {
          session_id: session.id,
          provider: "openai",
          language: transcript.language ?? null,
          transcript_text: transcript.text,
          transcript_json: transcript,
        },
        { onConflict: "session_id" }
      );

      const chunks = chunkText(transcript.text);
      const embeddings = await embedChunks(chunks);
      const rows = chunks.map((chunk, index) => ({
        session_id: session.id,
        chunk_index: index,
        content: chunk,
        embedding: embeddings[index],
        model: "text-embedding-3-small",
      }));

      if (rows.length > 0) {
        await supabase.from("session_transcript_chunks").upsert(rows, {
          onConflict: "session_id,chunk_index",
        });
      }
    }

    return new Response(JSON.stringify({ success: true, eventType }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Daily webhook processing error", error);
    return new Response("Webhook processing failed", { status: 500 });
  }
});
