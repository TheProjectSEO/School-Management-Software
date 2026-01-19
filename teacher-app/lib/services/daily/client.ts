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

  async deleteRoom(roomName: string): Promise<void> {
    await this.request(`/rooms/${encodeURIComponent(roomName)}`, { method: 'DELETE' });
  }

  async createMeetingToken(roomName: string, options: { is_owner?: boolean; user_name?: string; enable_recording?: boolean } = {}): Promise<{ token: string }> {
    return this.request('/meeting-tokens', {
      method: 'POST',
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          is_owner: options.is_owner ?? false,
          user_name: options.user_name ?? 'Teacher',
          enable_recording: options.enable_recording ?? false,
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
}

let singleton: DailyClient | null = null;
export function getDailyClient(): DailyClient {
  if (!singleton) singleton = new DailyClient();
  return singleton;
}

