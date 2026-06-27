import { useEffect, useRef, useCallback } from 'react';
import { usePlayerStore } from '../store/playerStore';

export function useAudioEngine() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const seekingRef = useRef(false);

  const {
    currentTrack,
    isPlaying,
    currentTime,
    setCurrentTime,
    setDuration,
    trackEnded,
    repeat,
  } = usePlayerStore();

  // Create audio element once
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'metadata';
      audioRef.current.volume = 1;
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  // Load new track
  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;
    let cancelled = false;

    (async () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      const source = await usePlayerStore.getState().getFileForTrack(currentTrack.id);
      if (cancelled || !source || !audioRef.current) return;
      const url = source instanceof File
        ? URL.createObjectURL(source)
        : URL.createObjectURL(source);
      objectUrlRef.current = url;
      audioRef.current.src = url;
      audioRef.current.load();
      if (usePlayerStore.getState().isPlaying) {
        audioRef.current.play().catch(() => {});
      }
    })();

    // Media Session API
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album,
        artwork: currentTrack.coverUrl
          ? [{ src: currentTrack.coverUrl, sizes: '512x512', type: 'image/jpeg' }]
          : [],
      });
    }

    return () => { cancelled = true; };
  }, [currentTrack?.id]);

  // Play/pause
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  // Seek from store (when user drags seeker)
  useEffect(() => {
    if (!audioRef.current || seekingRef.current) return;
    const diff = Math.abs(audioRef.current.currentTime - currentTime);
    if (diff > 1.5) {
      audioRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      if (!seekingRef.current) {
        setCurrentTime(audio.currentTime);
      }
    };
    const onLoadedMetadata = () => {
      setDuration(audio.duration);
    };
    const onEnded = () => {
      trackEnded();
    };
    const onDurationChange = () => {
      if (isFinite(audio.duration)) setDuration(audio.duration);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);

    // Media Session actions
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => usePlayerStore.getState().togglePlay());
      navigator.mediaSession.setActionHandler('pause', () => usePlayerStore.getState().togglePlay());
      navigator.mediaSession.setActionHandler('nexttrack', () => usePlayerStore.getState().next());
      navigator.mediaSession.setActionHandler('previoustrack', () => usePlayerStore.getState().previous());
    }

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
    };
  }, [setCurrentTime, setDuration, trackEnded]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const store = usePlayerStore.getState();
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          store.togglePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (audioRef.current) {
            const newTime = Math.min(audioRef.current.currentTime + 10, audioRef.current.duration);
            audioRef.current.currentTime = newTime;
            setCurrentTime(newTime);
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (audioRef.current) {
            const newTime = Math.max(audioRef.current.currentTime - 10, 0);
            audioRef.current.currentTime = newTime;
            setCurrentTime(newTime);
          }
          break;
        case 'KeyN':
          store.next();
          break;
        case 'KeyP':
          store.previous();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setCurrentTime]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      seekingRef.current = true;
      audioRef.current.currentTime = time;
      usePlayerStore.getState().seekTo(time);
      setTimeout(() => { seekingRef.current = false; }, 200);
    }
  }, []);

  return { seek };
}
