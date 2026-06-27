import { create } from 'zustand';
import { Track, Playlist, RepeatMode } from '../types';
import { IndexedDBRepository } from '../lib/repository';
import { getAllFileHandles, saveFileHandle, deleteFileHandle, getAudioBlob, getFileHandle, getDirectoryHandles, saveDirectoryHandle, deleteDirectoryHandle } from '../lib/db';
import { parseAudioFile, cleanFileName } from '../lib/metadataParser';

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function toEntities(tracks: Track[]): Record<string, Track> {
  const entities: Record<string, Track> = {};
  for (const t of tracks) entities[t.id] = t;
  return entities;
}

interface TrackInput {
  track: Track;
  blob: Blob;
}

interface PlayerStore {
  trackEntities: Record<string, Track>;
  trackIds: string[];
  playlistTrackIds: Record<string, string[]>;
  playlists: Playlist[];
  isLoading: boolean;
  localFileMap: Record<string, File>;

  currentView: 'home' | 'playlist' | 'liked' | 'recent' | 'songs' | 'library';
  activePlaylistId: string | null;

  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  shuffle: boolean;
  repeat: RepeatMode;
  queueIds: string[];
  originalQueueIds: string[];
  queueIndex: number;

  showUploadModal: boolean;
  showQueue: boolean;
  searchQuery: string;
  isSyncing: boolean;
  directoryPath: string | null;

  loadLibrary: () => Promise<void>;
  pickMusicFolder: () => Promise<void>;
  rescanFolder: () => Promise<void>;
  clearMusicFolder: () => Promise<void>;
  addPlaylist: (playlist: Playlist, items: TrackInput[]) => Promise<void>;
  removePlaylist: (id: string) => Promise<void>;
  toggleLike: (trackId: string) => Promise<void>;
  renamePlaylist: (id: string, name: string) => Promise<void>;
  createEmptyPlaylist: (name: string) => Promise<void>;
  addTracks: (items: TrackInput[]) => Promise<void>;
  addLocalTracks: (items: { track: Track; file: File; handle?: FileSystemFileHandle }[]) => Promise<void>;
  getFileForTrack: (trackId: string) => Promise<File | Blob | null>;
  addTrackToPlaylist: (trackId: string, playlistId: string) => Promise<void>;
  removeTrackFromPlaylist: (trackId: string) => Promise<void>;
  deleteTrackPermanently: (trackId: string) => Promise<void>;
  reorderTracks: (playlistId: string, fromIndex: number, toIndex: number) => Promise<void>;

  setView: (view: 'home' | 'playlist' | 'liked' | 'recent' | 'songs' | 'library', playlistId?: string) => void;

  playTrack: (track: Track, queueTracks?: Track[]) => void;
  playPlaylist: (playlist: Playlist) => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  seekTo: (time: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  trackEnded: () => void;

  setShowUploadModal: (show: boolean) => void;
  setShowQueue: (show: boolean) => void;
  setSearchQuery: (q: string) => void;
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  trackEntities: {},
  trackIds: [],
  playlistTrackIds: {},
  playlists: [],
  isLoading: true,
  localFileMap: {},

  currentView: 'home',
  activePlaylistId: null,

  currentTrack: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  shuffle: false,
  repeat: 0,
  queueIds: [],
  originalQueueIds: [],
  queueIndex: -1,

  showUploadModal: false,
  showQueue: false,
  searchQuery: '',
  isSyncing: false,
  directoryPath: null,

  loadLibrary: async () => {
    set({ isLoading: true });
    try {
      const [playlists, tracks, dirHandles] = await Promise.all([
        IndexedDBRepository.getAllPlaylists(),
        IndexedDBRepository.getAllTracks(),
        getDirectoryHandles(),
      ]);
      const playlistTrackIds: Record<string, string[]> = {};
      const withPlaylist = tracks.filter(t => t.playlistId)
        .sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999) || a.addedAt - b.addedAt);
      for (const t of withPlaylist) {
        if (!playlistTrackIds[t.playlistId!]) playlistTrackIds[t.playlistId!] = [];
        playlistTrackIds[t.playlistId!].push(t.id);
      }

      // Load tracks into store first so rescanFolder can match them
      let directoryPath: string | null = null;
      if (dirHandles.length > 0) {
        directoryPath = dirHandles[0].handle.name;
      }

      set({
        playlists,
        trackEntities: toEntities(tracks),
        trackIds: tracks.map(t => t.id),
        playlistTrackIds,
        localFileMap: {},
        directoryPath,
      });

      // Scan folder synchronously to populate localFileMap before user can play
      if (dirHandles.length > 0) {
        await get().rescanFolder();
      }

      set({ isLoading: false });
    } catch (e) {
      console.error('Failed to load library:', e);
      set({ isLoading: false });
    }
  },

  pickMusicFolder: async () => {
    try {
      if (!('showDirectoryPicker' in window)) {
        set({ showUploadModal: true });
        return;
      }
      const dirHandle = await (window as any).showDirectoryPicker();
      const permission = await dirHandle.requestPermission({ mode: 'read' });
      if (permission !== 'granted') return;

      await saveDirectoryHandle('music', dirHandle);
      set({ directoryPath: dirHandle.name });
      await get().rescanFolder();
    } catch (err: any) {
      if (err.name === 'AbortError' || err.name === 'SecurityError' || err.name === 'NotAllowedError') return;
      console.error('Failed to pick folder:', err);
    }
  },

  rescanFolder: async () => {
    set({ isSyncing: true });
    try {
      const dirHandles = await getDirectoryHandles();
      if (dirHandles.length === 0) { set({ isSyncing: false }); return; }

      const dirHandle = dirHandles[0].handle;
      const permission = await dirHandle.requestPermission({ mode: 'read' });
      if (permission !== 'granted') { set({ isSyncing: false }); return; }

      const state = get();

      // Map existing local tracks by stored fileName, with fallback by cleaned name
      const existingByName = new Map<string, Track>();
      const existingByStem = new Map<string, Track[]>();
      for (const tid of state.trackIds) {
        const t = state.trackEntities[tid];
        if (t?.isLocal) {
          const fileName = (t as any)._fileName as string | undefined;
          if (fileName) {
            existingByName.set(fileName, t);
          } else {
            // Migration: old tracks without _fileName — index by cleaned title
            const stem = t.title.toLowerCase().trim();
            if (stem) {
              const arr = existingByStem.get(stem) || [];
              arr.push(t);
              existingByStem.set(stem, arr);
            }
          }
        }
      }

      const AUDIO_EXTS = new Set(['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aac', '.opus', '.wma']);

      // Walk directory collecting handles + file names (NO .getFile() calls yet)
      interface ScannedEntry {
        handle: FileSystemFileHandle;
        fileName: string;
      }
      const scanned: ScannedEntry[] = [];

      async function walkDir(handle: FileSystemDirectoryHandle): Promise<void> {
        for await (const entry of (handle as any).values()) {
          if (entry.kind === 'file') {
            const name = entry.name.toLowerCase();
            if (AUDIO_EXTS.has(name.slice(name.lastIndexOf('.')))) {
              scanned.push({ handle: entry as FileSystemFileHandle, fileName: entry.name });
            }
          } else if (entry.kind === 'directory') {
            await walkDir(entry as FileSystemDirectoryHandle);
          }
        }
      }

      await walkDir(dirHandle);

      // Match scanned files to existing tracks (by _fileName first, then by title)
      const matchedIds = new Set<string>();
      const newLocalFiles: Record<string, File> = {};
      let imported = 0;

      for (const entry of scanned) {
        let existing = existingByName.get(entry.fileName);

        // Fallback: try matching old tracks (no _fileName) by cleaned title
        if (!existing) {
          const fileStem = cleanFileName(entry.fileName).toLowerCase();
          const matches = existingByStem.get(fileStem) || [];
          // Pick the first unmatched one
          existing = matches.find(t => !matchedIds.has(t.id)) || null;
          if (existing) {
            // Migrate: store _fileName for future scans
            (existing as any)._fileName = entry.fileName;
            try {
              await IndexedDBRepository.saveTrack(existing, null);
            } catch {}
          }
        }

        if (existing) {
          // Existing track — get the live File reference
          matchedIds.add(existing.id);
          try {
            const file = await entry.handle.getFile();
            newLocalFiles[existing.id] = file;
          } catch {
            // skip if file can't be read
          }
        } else {
          // New track — import it
          try {
            const file = await entry.handle.getFile();
            const { track } = await parseAudioFile(file);
            const localTrack: Track = { ...track, isLocal: true };
            (localTrack as any)._fileName = entry.fileName;

            await IndexedDBRepository.saveTrack(localTrack, null);
            await saveFileHandle(localTrack.id, entry.handle);

            const s = get();
            set({
              trackEntities: { ...s.trackEntities, [localTrack.id]: localTrack },
              trackIds: [...s.trackIds, localTrack.id],
            });
            newLocalFiles[localTrack.id] = file;
            matchedIds.add(localTrack.id);
            imported++;
          } catch (e) {
            console.error('Error importing', entry.fileName, e);
          }
        }
      }

      // Batch-update localFileMap
      set(s => ({ localFileMap: { ...s.localFileMap, ...newLocalFiles } }));

      if (imported > 0) {
        console.log(`[rescan] imported ${imported} new tracks`);
      }

      // Remove local tracks whose files are no longer on disk
      const toRemove = [...existingByName.values()]
        .filter(t => !matchedIds.has(t.id))
        .map(t => t.id);

      for (const id of toRemove) {
        try {
          await IndexedDBRepository.deleteTrack(id);
          await deleteFileHandle(id);
        } catch { /* ignore */ }
      }

      if (toRemove.length > 0) {
        const s = get();
        const newEntities = { ...s.trackEntities };
        const newIds = s.trackIds.filter(id => !toRemove.includes(id));
        const removedLocalFiles = { ...s.localFileMap };
        for (const id of toRemove) {
          delete newEntities[id];
          delete removedLocalFiles[id];
        }
        set({ trackEntities: newEntities, trackIds: newIds, localFileMap: removedLocalFiles });
      }
    } catch (e) {
      console.error('Failed to scan folder:', e);
    }
    set({ isSyncing: false });
  },

  clearMusicFolder: async () => {
    await deleteDirectoryHandle('music');
    set({ directoryPath: null });
  },

  addPlaylist: async (playlist, items) => {
    try {
      await IndexedDBRepository.savePlaylist(playlist);
      await IndexedDBRepository.saveTracksBatch(items.map(i => ({ track: i.track, blob: i.blob })));
    } catch (e) {
      console.error('Failed to save playlist:', e);
      return;
    }
    const { trackEntities, trackIds, playlistTrackIds } = get();
    const newEntities = { ...trackEntities };
    const newIds = [...trackIds];
    const playlistIds = items.map(i => i.track.id);
    for (const { track } of items) {
      newEntities[track.id] = track;
      newIds.push(track.id);
    }
    set({
      playlists: [...get().playlists, playlist],
      trackEntities: newEntities,
      trackIds: newIds,
      playlistTrackIds: { ...playlistTrackIds, [playlist.id]: playlistIds },
    });
  },

  removePlaylist: async (id) => {
    try {
      await IndexedDBRepository.deletePlaylist(id);
    } catch (e) {
      console.error('Failed to remove playlist:', e);
      return;
    }
    const { trackEntities, trackIds, activePlaylistId, playlistTrackIds } = get();
    const newEntities = { ...trackEntities };
    let changed = false;
    for (const tid of trackIds) {
      if (newEntities[tid].playlistId === id) {
        newEntities[tid] = { ...newEntities[tid], playlistId: undefined };
        changed = true;
      }
    }
    const newIndex = { ...playlistTrackIds };
    delete newIndex[id];
    const updates: Partial<PlayerStore> = {
      playlists: get().playlists.filter(p => p.id !== id),
      trackEntities: changed ? newEntities : trackEntities,
      playlistTrackIds: newIndex,
    };
    if (activePlaylistId === id) {
      updates.activePlaylistId = null;
      updates.currentView = 'home';
    }
    set(updates);
  },

  toggleLike: async (trackId) => {
    const entity = get().trackEntities[trackId];
    if (!entity) return;
    const updated = { ...entity, isLiked: !entity.isLiked };
    // Optimistic update
    set({ trackEntities: { ...get().trackEntities, [trackId]: updated } });
    try {
      await IndexedDBRepository.updateTrack(updated);
    } catch {
      // Rollback
      set({ trackEntities: { ...get().trackEntities, [trackId]: entity } });
    }
  },

  renamePlaylist: async (id, name) => {
    const playlist = get().playlists.find(p => p.id === id);
    if (!playlist) return;
    const updated = { ...playlist, name };
    try {
      await IndexedDBRepository.updatePlaylist(updated);
      set({ playlists: get().playlists.map(p => p.id === id ? updated : p) });
    } catch (e) {
      console.error('Failed to rename playlist:', e);
    }
  },

  createEmptyPlaylist: async (name) => {
    const playlist: Playlist = {
      id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 10),
      name,
      createdAt: Date.now(),
      trackIds: [],
    };
    try {
      await IndexedDBRepository.savePlaylist(playlist);
      set({ playlists: [...get().playlists, playlist] });
    } catch (e) {
      console.error('Failed to create playlist:', e);
    }
  },

  addTracks: async (items) => {
    console.log(`[addTracks] saving ${items.length} tracks...`);
    try {
      for (const { track, blob } of items) {
        console.log(`[addTracks] saving track: ${track.title} (${track.id})`);
        await IndexedDBRepository.saveTrack(track, blob);
      }
    } catch (e) {
      console.error('[addTracks] FAILED:', e);
      return;
    }
    console.log('[addTracks] all saved, updating store...');
    const { trackEntities, trackIds } = get();
    const newEntities = { ...trackEntities };
    const newIds = [...trackIds];
    for (const { track } of items) {
      newEntities[track.id] = track;
      newIds.push(track.id);
    }
    set({ trackEntities: newEntities, trackIds: newIds });
    console.log(`[addTracks] done. trackIds now: ${newIds.length}`);
  },

  addLocalTracks: async (items) => {
    console.log(`[addLocalTracks] saving ${items.length} local tracks...`);
    try {
      for (const { track, file, handle } of items) {
        const namedTrack = { ...track, isLocal: true };
        (namedTrack as any)._fileName = file.name;
        // Save blob so uploaded tracks survive page reload
        await IndexedDBRepository.saveTrack(namedTrack, file);
        if (handle) {
          await saveFileHandle(track.id, handle);
        }
      }
    } catch (e) {
      console.error('[addLocalTracks] FAILED:', e);
      return;
    }
    const { trackEntities, trackIds, localFileMap } = get();
    const newEntities = { ...trackEntities };
    const newIds = [...trackIds];
    const newLocalFiles = { ...localFileMap };
    for (const { track, file } of items) {
      const namedTrack = { ...track, isLocal: true };
      (namedTrack as any)._fileName = file.name;
      newEntities[track.id] = namedTrack;
      newIds.push(track.id);
      newLocalFiles[track.id] = file;
    }
    set({ trackEntities: newEntities, trackIds: newIds, localFileMap: newLocalFiles });
    console.log(`[addLocalTracks] done. trackIds now: ${newIds.length}`);
  },

  getFileForTrack: async (trackId) => {
    const state = get();

    // 1. Already in memory (from rescanFolder)
    if (state.localFileMap[trackId]) return state.localFileMap[trackId];

    // 2. Try saved FileSystemFileHandle
    const handle = await getFileHandle(trackId);
    if (handle) {
      try {
        const perm = await handle.requestPermission({ mode: 'read' });
        if (perm === 'granted') {
          const file = await handle.getFile();
          set(s => ({ localFileMap: { ...s.localFileMap, [trackId]: file } }));
          return file;
        }
      } catch { /* handle invalid */ }
    }

    // 3. Walk directory to find file by _fileName (if available)
    const track = state.trackEntities[trackId];
    const targetName = (track as any)?._fileName as string | undefined;

    if (targetName) {
      const dirEntries = await getDirectoryHandles();
      if (dirEntries.length > 0) {
        const dir = dirEntries[0].handle;
        try {
          const perm = await dir.requestPermission({ mode: 'read' });
          if (perm === 'granted') {
            async function walkDir(d: FileSystemDirectoryHandle): Promise<File | null> {
              for await (const entry of (d as any).values()) {
                if (entry.kind === 'file' && entry.name === targetName) {
                  try {
                    const f = await (entry as FileSystemFileHandle).getFile();
                    set(s => ({ localFileMap: { ...s.localFileMap, [trackId]: f } }));
                    return f;
                  } catch { return null; }
                } else if (entry.kind === 'directory') {
                  const found = await walkDir(entry as FileSystemDirectoryHandle);
                  if (found) return found;
                }
              }
              return null;
            }
            const found = await walkDir(dir);
            if (found) return found;
          }
        } catch { /* dir handle invalid */ }
      }
    }

    // 4. Try blob from IndexedDB
    const blob = await getAudioBlob(trackId);
    if (blob) return blob;

    return null;
  },

  addTrackToPlaylist: async (trackId, playlistId) => {
    const entity = get().trackEntities[trackId];
    if (!entity) return;
    const updated = { ...entity, playlistId };
    const { playlistTrackIds } = get();
    const prevIds = playlistTrackIds[playlistId] ?? [];
    const newIndex = { ...playlistTrackIds, [playlistId]: [...prevIds, trackId] };
    set({ trackEntities: { ...get().trackEntities, [trackId]: updated }, playlistTrackIds: newIndex });
    try {
      await IndexedDBRepository.updateTrack(updated);
    } catch {
      set({ trackEntities: { ...get().trackEntities, [trackId]: entity }, playlistTrackIds: { ...playlistTrackIds, [playlistId]: prevIds } });
    }
  },

  removeTrackFromPlaylist: async (trackId) => {
    const entity = get().trackEntities[trackId];
    if (!entity) return;
    const plId = entity.playlistId;
    if (!plId) return;
    const updated = { ...entity, playlistId: undefined };
    const { playlistTrackIds } = get();
    const prevIds = playlistTrackIds[plId] ?? [];
    const newTids = prevIds.filter(id => id !== trackId);
    set({ trackEntities: { ...get().trackEntities, [trackId]: updated }, playlistTrackIds: { ...playlistTrackIds, [plId]: newTids } });
    try {
      await IndexedDBRepository.updateTrack(updated);
    } catch {
      set({ trackEntities: { ...get().trackEntities, [trackId]: entity }, playlistTrackIds: { ...playlistTrackIds, [plId]: prevIds } });
    }
  },

  deleteTrackPermanently: async (trackId) => {
    const { trackEntities, trackIds, currentTrack, queueIds, queueIndex, playlistTrackIds, localFileMap } = get();
    if (!trackEntities[trackId]) return;
    try {
      await IndexedDBRepository.deleteTrack(trackId);
      await deleteFileHandle(trackId);
    } catch (e) {
      console.error('Failed to delete track:', e);
      return;
    }
    const newEntities = { ...trackEntities };
    delete newEntities[trackId];
    const newIds = trackIds.filter(id => id !== trackId);
    const newLocalFiles = { ...localFileMap };
    delete newLocalFiles[trackId];
    const newIndex = { ...playlistTrackIds };
    for (const plId of Object.keys(newIndex)) {
      if (newIndex[plId].includes(trackId)) {
        newIndex[plId] = newIndex[plId].filter(id => id !== trackId);
      }
    }
    const updates: Partial<PlayerStore> = {
      trackEntities: newEntities,
      trackIds: newIds,
      localFileMap: newLocalFiles,
      playlistTrackIds: newIndex,
    };
    if (currentTrack?.id === trackId) {
      updates.currentTrack = null;
      updates.isPlaying = false;
      if (queueIndex >= 0 && queueIndex < queueIds.length) {
        const newQueueIds = queueIds.filter(id => id !== trackId);
        const newIdx = queueIndex >= newQueueIds.length ? Math.max(0, newQueueIds.length - 1) : queueIndex;
        updates.queueIds = newQueueIds;
        updates.queueIndex = newIdx;
        if (newQueueIds.length === 0) {
          updates.originalQueueIds = [];
        }
      } else {
        updates.queueIds = [];
        updates.originalQueueIds = [];
        updates.queueIndex = -1;
      }
    }
    set(updates);
  },

  reorderTracks: async (playlistId, fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    const { trackEntities, playlistTrackIds } = get();
    const ids = [...(playlistTrackIds[playlistId] ?? [])];
    const [moved] = ids.splice(fromIndex, 1);
    ids.splice(toIndex, 0, moved);

    const updated = ids.map((id, i) => ({ ...trackEntities[id], sortOrder: i }));
    try {
      await IndexedDBRepository.updateTracksBatch(updated);
    } catch (e) {
      console.error('Failed to reorder tracks:', e);
      return;
    }
    const newEntities = { ...trackEntities };
    for (const track of updated) {
      newEntities[track.id] = track;
    }
    set({ trackEntities: newEntities, playlistTrackIds: { ...playlistTrackIds, [playlistId]: ids } });
  },

  setView: (view, playlistId) => {
    set({ currentView: view, activePlaylistId: playlistId ?? null });
  },

  playTrack: (track, queueTracks) => {
    const state = get();
    const queue = queueTracks ?? [];
    const { shuffle } = state;
    const queueIds = queue.map(t => t.id);
    const originalQueueIds = queueIds;
    const finalQueueIds = shuffle ? shuffleArray(queueIds) : queueIds;
    const idx = finalQueueIds.indexOf(track.id);

    const entity = state.trackEntities[track.id] ?? track;
    const updated = { ...entity, playCount: entity.playCount + 1, lastPlayed: Date.now() };

    IndexedDBRepository.updateTrack(updated);

    const newEntities = { ...state.trackEntities, [track.id]: updated };
    set({
      trackEntities: newEntities,
      currentTrack: updated,
      isPlaying: true,
      queueIds: finalQueueIds,
      originalQueueIds,
      queueIndex: idx >= 0 ? idx : 0,
      currentTime: 0,
    });
  },

  playPlaylist: (playlist) => {
    const { trackEntities, playlistTrackIds, shuffle } = get();
    const ids = playlistTrackIds[playlist.id] ?? [];
    const playlistTracks = ids.map(id => trackEntities[id]).filter(Boolean) as Track[];
    if (playlistTracks.length === 0) return;
    const first = shuffle
      ? playlistTracks[Math.floor(Math.random() * playlistTracks.length)]
      : playlistTracks[0];
    get().playTrack(first, playlistTracks);
  },

  togglePlay: () => {
    set(s => ({ isPlaying: !s.isPlaying }));
  },

  next: () => {
    const state = get();
    const { queueIds, queueIndex, repeat, shuffle, originalQueueIds, trackEntities } = state;
    if (queueIds.length === 0) return;
    if (repeat === 2) {
      set({ currentTime: 0, isPlaying: true });
      return;
    }
    let nextIdx = queueIndex + 1;
    if (nextIdx >= queueIds.length) {
      if (repeat === 1) nextIdx = 0;
      else {
        set({ isPlaying: false, currentTime: 0 });
        return;
      }
    }
    const nextId = queueIds[nextIdx];
    const nextEntity = trackEntities[nextId];
    if (!nextEntity) return;
    const updated = { ...nextEntity, playCount: nextEntity.playCount + 1, lastPlayed: Date.now() };
    IndexedDBRepository.updateTrack(updated);
    set({
      trackEntities: { ...trackEntities, [nextId]: updated },
      currentTrack: updated,
      queueIndex: nextIdx,
      currentTime: 0,
      isPlaying: true,
    });
  },

  previous: () => {
    const state = get();
    const { queueIds, queueIndex, currentTime, trackEntities } = state;
    if (queueIds.length === 0) return;
    if (currentTime > 3) {
      set({ currentTime: 0 });
      return;
    }
    let prevIdx = queueIndex - 1;
    if (prevIdx < 0) prevIdx = 0;
    const prevId = queueIds[prevIdx];
    const prevEntity = trackEntities[prevId];
    if (!prevEntity) return;
    const updated = { ...prevEntity, playCount: prevEntity.playCount + 1, lastPlayed: Date.now() };
    IndexedDBRepository.updateTrack(updated);
    set({
      trackEntities: { ...trackEntities, [prevId]: updated },
      currentTrack: updated,
      queueIndex: prevIdx,
      currentTime: 0,
      isPlaying: true,
    });
  },

  seekTo: (time) => {
    set({ currentTime: time });
  },

  toggleShuffle: () => {
    const { shuffle, queueIds, queueIndex, originalQueueIds } = get();
    const newShuffle = !shuffle;
    if (newShuffle) {
      const currentId = queueIds[queueIndex];
      const rest = queueIds.filter((_, i) => i !== queueIndex);
      const shuffled = shuffleArray(rest);
      const newQueue = [currentId, ...shuffled];
      set({ shuffle: newShuffle, queueIds: newQueue, queueIndex: 0 });
    } else {
      const currentId = queueIds[queueIndex];
      const newIdx = originalQueueIds.indexOf(currentId);
      set({ shuffle: newShuffle, queueIds: originalQueueIds, queueIndex: newIdx >= 0 ? newIdx : 0 });
    }
  },

  cycleRepeat: () => {
    set(s => ({ repeat: ((s.repeat + 1) % 3) as RepeatMode }));
  },

  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),

  trackEnded: () => {
    const { repeat } = get();
    if (repeat === 2) {
      set({ currentTime: 0, isPlaying: true });
      return;
    }
    get().next();
  },

  setShowUploadModal: (show) => set({ showUploadModal: show }),
  setShowQueue: (show) => set({ showQueue: show }),
  setSearchQuery: (q) => set({ searchQuery: q }),
}));
