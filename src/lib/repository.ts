import { Track, Playlist, AudioFile } from '../types';
import * as db from './db';

export interface TrackRepository {
  getAllTracks(): Promise<Track[]>;
  saveTrack(track: Track, blob: Blob): Promise<void>;
  saveTracksBatch(items: { track: Track; blob: Blob | null }[]): Promise<void>;
  updateTrack(track: Track): Promise<void>;
  updateTracksBatch(tracks: Track[]): Promise<void>;
  deleteTrack(id: string): Promise<void>;
  getAudioBlob(id: string): Promise<Blob | undefined>;

  getAllPlaylists(): Promise<Playlist[]>;
  savePlaylist(playlist: Playlist): Promise<void>;
  updatePlaylist(playlist: Playlist): Promise<void>;
  deletePlaylist(id: string): Promise<void>;
}

export const IndexedDBRepository: TrackRepository = {
  async getAllTracks() {
    return db.getAllTracks();
  },

  async saveTrack(track, blob) {
    await db.saveTrack(track);
    if (blob) {
      await db.saveAudioFile(track.id, blob);
    }
  },

  async saveTracksBatch(items) {
    const tracks = items.map(i => i.track);
    const blobs = items.map(i => i.blob);
    await db.saveTracksBatch(tracks, blobs);
  },

  async updateTrack(track) {
    await db.updateTrack(track);
  },

  async updateTracksBatch(tracks) {
    await db.updateTracksBatch(tracks);
  },

  async deleteTrack(id) {
    await db.deleteTrack(id);
  },

  async getAudioBlob(id) {
    return db.getAudioBlob(id);
  },

  async getAllPlaylists() {
    return db.getAllPlaylists();
  },

  async savePlaylist(playlist) {
    await db.savePlaylist(playlist);
  },

  async updatePlaylist(playlist) {
    await db.updatePlaylist(playlist);
  },

  async deletePlaylist(id) {
    await db.deletePlaylist(id);
  },
};
