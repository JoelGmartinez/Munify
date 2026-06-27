import { useState, useEffect, useRef } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { Track } from '../types';

export function useTracks(): Track[] {
  const [tracks, setTracks] = useState<Track[]>(() => {
    const state = usePlayerStore.getState();
    return state.trackIds.map(id => state.trackEntities[id]).filter(Boolean) as Track[];
  });

  const cbRef = useRef<((state: any, prevState: any) => void) | null>(null);
  if (!cbRef.current) {
    cbRef.current = (state, prevState) => {
      if (state.trackIds !== prevState.trackIds || state.trackEntities !== prevState.trackEntities) {
        setTracks(state.trackIds.map(id => state.trackEntities[id]).filter(Boolean) as Track[]);
      }
    };
  }

  useEffect(() => {
    const unsub = usePlayerStore.subscribe(cbRef.current!);
    return unsub;
  }, []);

  return tracks;
}

export function useQueueTracks(): Track[] {
  const [tracks, setTracks] = useState<Track[]>(() => {
    const state = usePlayerStore.getState();
    return state.queueIds.map(id => state.trackEntities[id] ?? state.currentTrack).filter(Boolean) as Track[];
  });

  const cbRef = useRef<((state: any, prevState: any) => void) | null>(null);
  if (!cbRef.current) {
    cbRef.current = (state, prevState) => {
      if (state.queueIds !== prevState.queueIds ||
          state.trackEntities !== prevState.trackEntities ||
          state.currentTrack !== prevState.currentTrack) {
        setTracks(state.queueIds.map(id => state.trackEntities[id] ?? state.currentTrack).filter(Boolean) as Track[]);
      }
    };
  }

  useEffect(() => {
    const unsub = usePlayerStore.subscribe(cbRef.current!);
    return unsub;
  }, []);

  return tracks;
}

export function usePlaylistTracks(playlistId: string): Track[] {
  const [tracks, setTracks] = useState<Track[]>(() => {
    const state = usePlayerStore.getState();
    const ids = state.playlistTrackIds[playlistId] ?? [];
    return ids.map(id => state.trackEntities[id]).filter(Boolean) as Track[];
  });

  const playlistIdRef = useRef(playlistId);
  playlistIdRef.current = playlistId;

  useEffect(() => {
    const unsub = usePlayerStore.subscribe((state, prevState) => {
      const id = playlistIdRef.current;
      const ids = state.playlistTrackIds[id] ?? [];
      const prevIds = prevState.playlistTrackIds[id] ?? [];
      if (ids !== prevIds || state.trackEntities !== prevState.trackEntities) {
        setTracks(ids.map(tid => state.trackEntities[tid]).filter(Boolean) as Track[]);
      }
    });
    return unsub;
  }, []);

  return tracks;
}
