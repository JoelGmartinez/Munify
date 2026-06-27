import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Track, Playlist, AudioFile } from '../types';

export interface StoredFileHandle {
  trackId: string;
  handle: FileSystemFileHandle;
}

interface MunifyDB extends DBSchema {
  tracks: {
    key: string;
    value: Track;
    indexes: { 'by-playlist': string };
  };
  audioFiles: {
    key: string;
    value: AudioFile;
  };
  playlists: {
    key: string;
    value: Playlist;
  };
  fileHandles: {
    key: string;
    value: StoredFileHandle;
  };
}

let db: IDBPDatabase<MunifyDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<MunifyDB>> {

  db = await openDB<MunifyDB>('munify-db', 3, {
    upgrade(database, oldVersion) {
      if (oldVersion < 1) {
        database.createObjectStore('tracks', { keyPath: 'id' })
          .createIndex('by-playlist', 'playlistId');
        database.createObjectStore('playlists', { keyPath: 'id' });
      }
      if (oldVersion < 2) {
        database.createObjectStore('audioFiles', { keyPath: 'id' });
      }
      if (oldVersion < 3) {
        database.createObjectStore('fileHandles', { keyPath: 'trackId' });
      }
    },
  });
  return db;
}

// ---- Playlists ----
export async function getAllPlaylists(): Promise<Playlist[]> {
  const database = await getDB();
  return database.getAll('playlists');
}

export async function savePlaylist(playlist: Playlist): Promise<void> {
  const database = await getDB();
  await database.put('playlists', playlist);
}

export async function deletePlaylist(id: string): Promise<void> {
  const database = await getDB();
  const tx = database.transaction(['playlists', 'tracks'], 'readwrite');
  await tx.objectStore('playlists').delete(id);
  const trackStore = tx.objectStore('tracks');
  const index = trackStore.index('by-playlist');
  let cursor = await index.openCursor(id);
  while (cursor) {
    const track = cursor.value;
    track.playlistId = undefined;
    await cursor.update(track);
    cursor = await cursor.continue();
  }
  await tx.done;
}

export async function updatePlaylist(playlist: Playlist): Promise<void> {
  const database = await getDB();
  await database.put('playlists', playlist);
}

// ---- Tracks ----
export async function getTracksByPlaylist(playlistId: string): Promise<Track[]> {
  const database = await getDB();
  return database.getAllFromIndex('tracks', 'by-playlist', playlistId);
}

export async function getAllTracks(): Promise<Track[]> {
  const database = await getDB();
  const tracks = await database.getAll('tracks');

  // Migrate v1 → v2: extract embedded fileBlob to separate audioFiles store
  const needsMigration = tracks.some(t => (t as any).fileBlob !== undefined);
  if (needsMigration) {
    try {
      const tx = database.transaction(['tracks', 'audioFiles'], 'readwrite');
      for (const raw of tracks) {
        const old = raw as any;
        if (old.fileBlob) {
          tx.objectStore('audioFiles').put({ id: raw.id, blob: old.fileBlob });
          delete old.fileBlob;
          tx.objectStore('tracks').put(raw);
        }
      }
      await tx.done;
    } catch (e) {
      console.error('Migration failed, tracks returned without blobs:', e);
    }
  }

  return tracks;
}

export async function saveTrack(track: Track): Promise<void> {
  const database = await getDB();
  await database.put('tracks', track);
}

export async function saveTracksBatch(tracks: Track[], blobs: (Blob | null)[]): Promise<void> {
  const database = await getDB();
  const tx = database.transaction(['tracks', 'audioFiles'], 'readwrite');
  for (let i = 0; i < tracks.length; i++) {
    tx.objectStore('tracks').put(tracks[i]);
    if (blobs[i]) {
      tx.objectStore('audioFiles').put({ id: tracks[i].id, blob: blobs[i]! });
    }
  }
  await tx.done;
}

export async function updateTrack(track: Track): Promise<void> {
  const database = await getDB();
  await database.put('tracks', track);
}

export async function updateTracksBatch(tracks: Track[]): Promise<void> {
  const database = await getDB();
  const tx = database.transaction('tracks', 'readwrite');
  for (const track of tracks) {
    tx.objectStore('tracks').put(track);
  }
  await tx.done;
}

export async function deleteTrack(id: string): Promise<void> {
  const database = await getDB();
  const tx = database.transaction(['tracks', 'audioFiles', 'fileHandles'], 'readwrite');
  tx.objectStore('tracks').delete(id);
  tx.objectStore('audioFiles').delete(id);
  tx.objectStore('fileHandles').delete(id);
  await tx.done;
}

// ---- Audio Files (blobs stored separately) ----
export async function saveAudioFile(id: string, blob: Blob): Promise<void> {
  const database = await getDB();
  await database.put('audioFiles', { id, blob });
}

export async function getAudioBlob(id: string): Promise<Blob | undefined> {
  const database = await getDB();
  const file = await database.get('audioFiles', id);
  return file?.blob;
}

export async function deleteAudioFile(id: string): Promise<void> {
  const database = await getDB();
  await database.delete('audioFiles', id);
}

// ---- File Handles (File System Access API) ----
export async function saveFileHandle(trackId: string, handle: FileSystemFileHandle): Promise<void> {
  const database = await getDB();
  await database.put('fileHandles', { trackId, handle });
}

export async function getFileHandle(trackId: string): Promise<FileSystemFileHandle | undefined> {
  const database = await getDB();
  const entry = await database.get('fileHandles', trackId);
  return entry?.handle;
}

export async function getAllFileHandles(): Promise<StoredFileHandle[]> {
  const database = await getDB();
  return database.getAll('fileHandles');
}

export async function deleteFileHandle(trackId: string): Promise<void> {
  const database = await getDB();
  await database.delete('fileHandles', trackId);
}
