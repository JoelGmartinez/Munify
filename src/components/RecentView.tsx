import { useRef, useCallback, memo } from 'react';
import { Clock, Play, Music2 } from 'lucide-react';
import { usePlayerStore } from '../store/playerStore';
import { formatDuration } from '../lib/metadataParser';
import { Track } from '../types';
import VirtualizedTrackList from './VirtualizedTrackList';
import { useTracks } from '../utils/useTracks';

const TrackRow = memo(function TrackRow({
  track, isCurrent, isPlaying, index, onPlay,
}: {
  track: Track; isCurrent: boolean; isPlaying: boolean; index: number; onPlay: () => void;
}) {
  const timeAgo = () => {
    if (!track.lastPlayed) return '';
    const diff = Date.now() - track.lastPlayed;
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'Ahora mismo';
    if (m < 60) return `Hace ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `Hace ${h} h`;
    const d = Math.floor(h / 24);
    return `Hace ${d} día${d > 1 ? 's' : ''}`;
  };

  return (
    <div
      onClick={onPlay}
      className={`group flex items-center gap-4 px-4 py-2 rounded-lg cursor-pointer transition-colors w-full ${isCurrent ? 'bg-accent-surface' : 'hover:bg-black/5'}`}
    >
      <span className="max-md:hidden w-5 text-center text-xs text-muted flex-shrink-0">{index + 1}</span>
      <div className="w-10 h-10 rounded flex-shrink-0 overflow-hidden">
        {track.coverUrl
          ? <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-surface flex items-center justify-center"><Music2 size={14} className="text-subtle" /></div>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${isCurrent ? 'text-accent' : 'text-main'}`}>{track.title}</p>
        <p className="text-xs text-muted truncate">{track.artist} • {track.album}</p>
      </div>
      <span className="max-md:hidden text-xs text-muted hidden sm:block flex-shrink-0">{timeAgo()}</span>
      <span className="max-md:hidden text-xs text-muted tabular-nums flex-shrink-0">{formatDuration(track.duration)}</span>
      <button onClick={(e) => { e.stopPropagation(); onPlay(); }} className="max-md:hidden opacity-0 group-hover:opacity-100 text-main p-1.5 rounded-full hover:bg-black/5">
        <Play size={14} fill="currentColor" />
      </button>
    </div>
  );
});

export default function RecentView() {
  const tracks = useTracks();
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const playTrack = usePlayerStore(s => s.playTrack);
  const togglePlay = usePlayerStore(s => s.togglePlay);

  const scrollRef = useRef<HTMLDivElement>(null);

  const recentTracks = [...tracks]
    .filter(t => t.lastPlayed)
    .sort((a, b) => (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0));

  const handleTrackClick = useCallback((track: Track) => {
    if (currentTrack?.id === track.id) togglePlay();
    else playTrack(track, recentTracks);
  }, [currentTrack?.id, togglePlay, playTrack, recentTracks]);

  const renderRow = useCallback((track: Track, index: number) => (
    <TrackRow
      track={track}
      isCurrent={currentTrack?.id === track.id}
      isPlaying={isPlaying}
      index={index}
      onPlay={() => handleTrackClick(track)}
    />
  ), [currentTrack?.id, isPlaying, handleTrackClick]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
      <div className="bg-gradient-to-b from-accent-surface to-white px-6 pt-8 pb-6">
        <div className="flex items-end gap-6">
          <div className="w-48 h-48 rounded-lg bg-gradient-to-br from-accent to-accent-light flex items-center justify-center shadow-2xl flex-shrink-0">
            <Clock size={72} className="text-white" />
          </div>
          <div>
            <p className="text-accent/70 text-xs font-bold uppercase tracking-widest mb-1">Historial</p>
            <h1 className="text-main font-black text-4xl mb-3">Reproducidas Recientemente</h1>
            <p className="text-muted text-sm">{recentTracks.length} canciones</p>
          </div>
        </div>
        {recentTracks.length > 0 && (
          <button
            onClick={() => playTrack(recentTracks[0], recentTracks)}
            className="mt-6 w-14 h-14 bg-accent rounded-full flex items-center justify-center hover:scale-105 transition-all shadow-lg"
          >
            <Play size={24} fill="white" className="text-white ml-1" />
          </button>
        )}
      </div>
      <div className="px-6 pb-8">
        {recentTracks.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-4">
            <Clock size={48} className="text-subtle" />
            <p className="text-muted">No has reproducido ninguna canción aún</p>
          </div>
        ) : (
          <div className="pt-2">
            <VirtualizedTrackList
              tracks={recentTracks}
              scrollRef={scrollRef}
              renderRow={renderRow}
              rowHeight={64}
            />
          </div>
        )}
      </div>
    </div>
  );
}
