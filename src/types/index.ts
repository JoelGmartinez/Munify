export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  year?: number;
  genre?: string;
  trackNumber?: number;
  sortOrder?: number;
  coverUrl?: string;
  fileSize: number;
  bitrate?: number;
  playCount: number;
  isLiked: boolean;
  lastPlayed?: number;
  addedAt: number;
  playlistId?: string;
  isLocal?: boolean;
}

export interface AudioFile {
  id: string;
  blob: Blob;
}

export interface Playlist {
  id: string;
  name: string;
  createdAt: number;
  trackIds: string[];
  coverUrl?: string;
  color?: string;
}

export type RepeatMode = 0 | 1 | 2;

export interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  shuffle: boolean;
  repeat: RepeatMode;
  queue: Track[];
  originalQueue: Track[];
  queueIndex: number;
}
