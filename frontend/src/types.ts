export interface Device {
  id: string;
  name: string;
  type: 'fan' | 'light';
  room: 'drawing_room' | 'work1' | 'work2';
  status: boolean;
  power_watt: number;
  last_changed: string; // ISO string timestamp
}

export type RoomType = 'drawing_room' | 'work1' | 'work2';

const ROOM_ALIASES: Record<string, RoomType> = {
  drawing_room: 'drawing_room',
  drawingroom: 'drawing_room',
  drawing: 'drawing_room',
  draw: 'drawing_room',
  'drawing room': 'drawing_room',
  'drawing-room': 'drawing_room',
  work1: 'work1',
  work_room_1: 'work1',
  workroom1: 'work1',
  work_room1: 'work1',
  'work room 1': 'work1',
  'work-room-1': 'work1',
  work2: 'work2',
  work_room_2: 'work2',
  workroom2: 'work2',
  work_room2: 'work2',
  'work room 2': 'work2',
  'work-room-2': 'work2',
};

export function normalizeRoom(room: string | undefined | null): RoomType {
  if (typeof room !== 'string') return 'drawing_room';

  const normalized = room.toLowerCase().trim();
  if (normalized in ROOM_ALIASES) return ROOM_ALIASES[normalized];
  if (normalized.includes('drawing')) return 'drawing_room';
  if (normalized.includes('work') && normalized.includes('1')) return 'work1';
  if (normalized.includes('work') && normalized.includes('2')) return 'work2';

  return 'drawing_room';
}

export function getRoomLabel(room: string | undefined | null): string {
  return ROOM_LABELS[normalizeRoom(room)] ?? 'Unknown Room';
}

export interface Alert {
  id: string;
  type: 'outside_hours' | 'all_on_duration';
  message: string;
  timestamp: string; // Time of alert trigger
  severity: 'warning' | 'error';
}

export const ROOM_LABELS: Record<RoomType, string> = {
  drawing_room: 'Drawing Room',
  work1: 'Work Room 1',
  work2: 'Work Room 2',
};
