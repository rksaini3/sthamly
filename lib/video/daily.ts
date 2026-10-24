const API_BASE = "https://api.daily.co/v1";
const TIMEOUT_MS = 10_000;

export class VideoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VideoError";
  }
}

function apiKey(): string {
  const key = process.env.DAILY_API_KEY;
  if (!key) throw new VideoError("video_not_configured");
  return key;
}

async function dailyFetch(path: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    if (err instanceof VideoError) throw err;
    throw new VideoError("video_unreachable");
  }
}

export type RoomInfo = { name: string; url: string };

// Returns the room with this name, creating it if needed.
// Unix seconds for nbf (not before) and exp (expiry).
export async function getOrCreateRoom(name: string, nbf: number, exp: number): Promise<RoomInfo> {
  const existing = await dailyFetch(`/rooms/${name}`, { method: "GET" });
  if (existing.ok) {
    return (await existing.json()) as RoomInfo;
  }

  const created = await dailyFetch("/rooms", {
    method: "POST",
    body: JSON.stringify({
      name,
      privacy: "private",
      properties: {
        nbf,
        exp,
        max_participants: 2,
        eject_at_room_exp: true,
        enable_recording: "off",
        enable_chat: false,
        enable_prejoin_ui: true,
      },
    }),
  });
  if (created.ok) {
    return (await created.json()) as RoomInfo;
  }

  // Another request may have created the same room a moment earlier.
  const again = await dailyFetch(`/rooms/${name}`, { method: "GET" });
  if (again.ok) {
    return (await again.json()) as RoomInfo;
  }

  throw new VideoError("room_failed");
}

// A short-lived token that lets one person join one room.
export async function createMeetingToken(input: {
  room: string;
  label: string;
  owner: boolean;
  nbf: number;
  exp: number;
}): Promise<string> {
  const res = await dailyFetch("/meeting-tokens", {
    method: "POST",
    body: JSON.stringify({
      properties: {
        room_name: input.room,
        user_name: input.label,
        is_owner: input.owner,
        nbf: input.nbf,
        exp: input.exp,
      },
    }),
  });

  if (!res.ok) throw new VideoError("token_failed");

  const data = (await res.json()) as { token: string };
  return data.token;
}