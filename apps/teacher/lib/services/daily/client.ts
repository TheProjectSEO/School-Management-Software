/**
 * Minimal Daily.co API client for teacher-app
 */

type RequestInitLike = RequestInit & { headers?: Record<string, string> };

interface DailyRoomConfig {
  name: string;
  privacy?: 'private' | 'public';
  properties?: {
    enable_screenshare?: boolean;
    enable_chat?: boolean;
    enable_recording?: 'cloud' | 'local' | undefined;
    max_participants?: number;
    start_video_off?: boolean;
    start_audio_off?: boolean;
    exp?: number; // unix seconds
    webhook_url?: string;
  };
}

interface DailyRoom {
  id: string;
  name: string;
  url: string;
  config?: DailyRoomConfig['properties'];
}

export class DailyClient {
  private apiUrl = 'https://api.daily.co/v1';
  private apiKey: string;

  constructor() {
    const key = process.env.DAILY_API_KEY;
    if (!key) throw new Error('DAILY_API_KEY is required');
    this.apiKey = key;
  }

  private async request<T>(path: string, init: RequestInitLike = {}): Promise<T> {
    const res = await fetch(`${this.apiUrl}${path}`, {
      method: init.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        ...(init.headers || {}),
      },
      body: init.body,
    } as RequestInit);

    if (!res.ok) {
      let errText = await res.text().catch(() => '');
      throw new Error(`Daily API ${res.status}: ${errText}`);
    }
    return (await res.json()) as T;
  }

  async createRoom(config: DailyRoomConfig): Promise<DailyRoom> {
    const payload: DailyRoomConfig = {
      name: config.name,
      privacy: config.privacy || 'private',
      properties: {
        enable_chat: false,
        enable_screenshare: true,
        start_video_off: true,
        start_audio_off: true,
        ...(config.properties || {}),
      },
    };
    return this.request<DailyRoom>('/rooms', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getRoom(roomName: string): Promise<DailyRoom> {
    return this.request<DailyRoom>(`/rooms/${encodeURIComponent(roomName)}`);
  }

  async deleteRoom(roomName: string): Promise<void> {
    await this.request(`/rooms/${encodeURIComponent(roomName)}`, { method: 'DELETE' });
  }

  async createMeetingToken(roomName: string, options: {
    is_owner?: boolean;
    user_name?: string;
    user_id?: string;
    enable_recording?: boolean;
    start_video_off?: boolean;
    start_audio_off?: boolean;
  } = {}): Promise<{ token: string }> {
    return this.request('/meeting-tokens', {
      method: 'POST',
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          is_owner: options.is_owner ?? false,
          user_name: options.user_name ?? 'Participant',
          user_id: options.user_id,
          enable_recording: options.enable_recording ?? false,
          start_video_off: options.start_video_off ?? true,
          start_audio_off: options.start_audio_off ?? true,
        },
      }),
    });
  }

  async startRecording(roomName: string): Promise<void> {
    await this.request(`/rooms/${encodeURIComponent(roomName)}/recordings/start`, { method: 'POST' });
  }

  async stopRecording(roomName: string): Promise<void> {
    await this.request(`/rooms/${encodeURIComponent(roomName)}/recordings/stop`, { method: 'POST' });
  }

  async getRecordings(roomName: string): Promise<DailyRecording[]> {
    const response = await this.request<{ data: DailyRecording[] }>(
      `/recordings?room_name=${encodeURIComponent(roomName)}`
    );
    return response.data || [];
  }

  async getRecordingDownloadUrl(recordingId: string): Promise<string | null> {
    try {
      // Daily.co requires calling GET /recordings/:id/access-link to get a temporary download URL
      // See: https://docs.daily.co/reference/rest-api/recordings/get-recording-link
      console.log(`[Daily] Requesting access link for recording: ${recordingId}`);
      const accessResponse = await this.request<{ download_link: string; expires: number }>(
        `/recordings/${recordingId}/access-link`
        // GET is the default method, no need to specify
      );

      if (accessResponse.download_link) {
        console.log(`[Daily] Got download link, expires at: ${new Date(accessResponse.expires * 1000).toISOString()}`);
        return accessResponse.download_link;
      }

      console.log(`[Daily] No download link available for recording: ${recordingId}`);
      return null;
    } catch (error) {
      console.error('[Daily] Error fetching recording download URL:', error);
      return null;
    }
  }

  async deleteRecording(recordingId: string): Promise<void> {
    await this.request(`/recordings/${recordingId}`, {
      method: 'DELETE',
    });
  }
}

interface DailyRecording {
  id: string;
  room_name: string;
  start_ts: number;
  duration: number;
  max_participants: number;
  status: 'finished' | 'processing' | 'error';
}

interface DailyRecordingDetails extends DailyRecording {
  download_link?: string;
  s3_key?: string;
}

let singleton: DailyClient | null = null;
export function getDailyClient(): DailyClient {
  if (!singleton) singleton = new DailyClient();
  return singleton;
}

