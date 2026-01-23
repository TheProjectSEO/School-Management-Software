/**
 * Daily.co API Client
 * Handles room creation, deletion, and recording management
 */

interface DailyRoomConfig {
  name?: string;
  privacy: 'public' | 'private';
  properties?: {
    enable_chat?: boolean;
    enable_screenshare?: boolean;
    enable_recording?: 'cloud' | 'local' | 'raw-tracks';
    max_participants?: number;
    start_video_off?: boolean;
    start_audio_off?: boolean;
    exp?: number; // Expiration timestamp
  };
}

interface DailyRoom {
  id: string;
  name: string;
  url: string;
  api_created: boolean;
  privacy: 'public' | 'private';
  config: DailyRoomConfig['properties'];
  created_at: string;
}

interface DailyRecording {
  id: string;
  room_name: string;
  start_ts: number;
  duration: number;
  max_participants: number;
  download_url?: string;
  status: 'finished' | 'processing' | 'error';
}

interface DailyMeetingToken {
  token: string;
}

export class DailyClient {
  private apiKey: string;
  private apiUrl: string = 'https://api.daily.co/v1';

  constructor() {
    const apiKey = process.env.DAILY_API_KEY;
    if (!apiKey) {
      throw new Error('DAILY_API_KEY environment variable is required');
    }
    this.apiKey = apiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.apiUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Daily.co API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Create a new Daily.co room
   */
  async createRoom(config: DailyRoomConfig): Promise<DailyRoom> {
    const roomConfig: DailyRoomConfig = {
      privacy: config.privacy,
      properties: {
        enable_chat: config.properties?.enable_chat ?? false,
        enable_screenshare: config.properties?.enable_screenshare ?? true,
        enable_recording: config.properties?.enable_recording ?? 'cloud',
        max_participants: config.properties?.max_participants ?? 50,
        start_video_off: config.properties?.start_video_off ?? true,
        start_audio_off: config.properties?.start_audio_off ?? true,
        ...config.properties,
      },
    };

    if (config.name) {
      roomConfig.name = config.name;
    }

    return this.request<DailyRoom>('/rooms', {
      method: 'POST',
      body: JSON.stringify(roomConfig),
    });
  }

  /**
   * Get room details
   */
  async getRoom(roomName: string): Promise<DailyRoom> {
    return this.request<DailyRoom>(`/rooms/${roomName}`);
  }

  /**
   * Delete a Daily.co room
   */
  async deleteRoom(roomName: string): Promise<{ deleted: boolean }> {
    return this.request<{ deleted: boolean }>(`/rooms/${roomName}`, {
      method: 'DELETE',
    });
  }

  /**
   * Create a meeting token for participant authentication
   */
  async createMeetingToken(
    roomName: string,
    options: {
      user_name?: string;
      user_id?: string;
      is_owner?: boolean;
      enable_recording?: boolean;
      start_video_off?: boolean;
      start_audio_off?: boolean;
      exp?: number; // Expiration timestamp
    } = {}
  ): Promise<string> {
    const payload: Record<string, any> = {
      room_name: roomName,
      ...options,
    };

    // Set expiration to 24 hours from now if not specified
    if (!payload.exp) {
      payload.exp = Math.floor(Date.now() / 1000) + 86400;
    }

    const result = await this.request<DailyMeetingToken>('/meeting-tokens', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return result.token;
  }

  /**
   * Start recording for a room
   */
  async startRecording(roomName: string): Promise<void> {
    await this.request(`/rooms/${roomName}/recordings/start`, {
      method: 'POST',
    });
  }

  /**
   * Stop recording for a room
   */
  async stopRecording(roomName: string): Promise<void> {
    await this.request(`/rooms/${roomName}/recordings/stop`, {
      method: 'POST',
    });
  }

  /**
   * Get all recordings for a room
   */
  async getRecordings(roomName: string): Promise<DailyRecording[]> {
    const response = await this.request<{ data: DailyRecording[] }>(
      `/recordings?room_name=${roomName}`
    );
    return response.data || [];
  }

  /**
   * Get download URL for a specific recording
   */
  async getRecordingDownloadUrl(recordingId: string): Promise<string | null> {
    try {
      const recording = await this.request<DailyRecording>(
        `/recordings/${recordingId}`
      );
      return recording.download_url || null;
    } catch (error) {
      console.error('Error fetching recording download URL:', error);
      return null;
    }
  }

  /**
   * Delete a recording
   */
  async deleteRecording(recordingId: string): Promise<void> {
    await this.request(`/recordings/${recordingId}`, {
      method: 'DELETE',
    });
  }
}

// Singleton instance
let dailyClient: DailyClient | null = null;

export function getDailyClient(): DailyClient {
  if (!dailyClient) {
    dailyClient = new DailyClient();
  }
  return dailyClient;
}
