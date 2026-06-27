import { useRef, useCallback, memo } from 'react';
import { Music2, Play, Heart } from 'lucide-react';
import { usePlayerStore } from '../store/playerStore';
import { formatDuration } from '../lib/metadataParser';
import { Track } from '../types';
import VirtualizedTrackList from './VirtualizedTrackList';
import { useTracks } from '../utils/useTracks';

const TrackRow = memo(function TrackRow({
  track, isCurrent, isPlaying, index, onPlay, onLike,
}: {
  track: Track; isCurrent: boolean; isPlaying: boolean; index: number;
  onPlay: () => void; onLike: () => void;
}) {
  return (
    <div
      onClick={onPlay}
      className={`group flex items-center gap-4 px-4 py-2 rounded-lg cursor-pointer transition-colors w-full ${isCurrent ? 'bg-accent-surface' : 'hover:bg-black/5'}`}
    >
      <div className="max-md:hidden w-5 text-center">
        <span className={`text-sm group-hover:hidden ${isCurrent ? 'text-accent' : 'text-muted'}`}>{index + 1}</span>
        <button onClick={(e) => { e.stopPropagation(); onPlay(); }} className="hidden group-hover:flex text-main">
          <Play size={14} fill="currentColor" />
        </button>
      </div>
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
      <div className="max-md:hidden flex items-center gap-2 opacity-0 group-hover:opacity-100">
        <button onClick={(e) => { e.stopPropagation(); onLike(); }}
          className={`p-1.5 rounded-full hover:bg-black/5 ${track.isLiked ? 'text-accent' : 'text-muted'}`}>
          <Heart size={14} fill={track.isLiked ? 'currentColor' : 'none'} />
        </button>
      </div>
      <span className="max-md:hidden text-xs text-muted tabular-nums flex-shrink-0">{formatDuration(track.duration)}</span>
    </div>
  );
});

export default function SearchView({ query }: { query: string }) {
  const tracks = useTracks();
  const playlists = usePlayerStore(s => s.playlists);
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const playTrack = usePlayerStore(s => s.playTrack);
  const togglePlay = usePlayerStore(s => s.togglePlay);
  const toggleLike = usePlayerStore(s => s.toggleLike);
  const setView = usePlayerStore(s => s.setView);

  const scrollRef = useRef<HTMLDivElement>(null);

  const q = query.toLowerCase().trim();
  const matchedTracks = tracks.filter(t =>
    t.title.toLowerCase().includes(q) ||
    t.artist.toLowerCase().includes(q) ||
    t.album.toLowerCase().includes(q)
  );
  const matchedPlaylists = playlists.filter(p => p.name.toLowerCase().includes(q));

  const handleTrack = useCallback((track: Track) => {
    if (currentTrack?.id === track.id) togglePlay();
    else playTrack(track, matchedTracks);
  }, [currentTrack?.id, togglePlay, playTrack, matchedTracks]);

  const renderRow = useCallback((track: Track, index: number) => (
    <TrackRow
      track={track}
      isCurrent={currentTrack?.id === track.id}
      isPlaying={isPlaying}
      index={index}
      onPlay={() => handleTrack(track)}
      onLike={() => toggleLike(track.id)}
    />
  ), [currentTrack?.id, isPlaying, handleTrack, toggleLike]);

  if (!q) return null;

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
      <h2 className="text-main font-bold text-xl mb-4">Resultados para "<span className="text-accent">{query}</span>"</h2>

      {matchedPlaylists.length > 0 && (
        <section className="mb-8">
          <h3 className="text-main font-semibold text-lg mb-3">Playlists</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {matchedPlaylists.map(pl => (
              <button
                key={pl.id}
                onClick={() => setView('playlist', pl.id)}
                className="flex items-center gap-3 bg-surface hover:bg-accent-surface rounded-lg overflow-hidden transition-all"
              >
                <div className="w-14 h-14 flex-shrink-0">
                  {pl.coverUrl
                    ? <img src={pl.coverUrl} alt={pl.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-track flex items-center justify-center"><Music2 size={20} className="text-white/50" /></div>
                  }
                </div>
                <span className="text-main font-semibold text-sm truncate pr-2">{pl.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {matchedTracks.length > 0 ? (
        <section>
          <h3 className="text-main font-semibold text-lg mb-3">Canciones</h3>
          <VirtualizedTrackList
            tracks={matchedTracks}
            scrollRef={scrollRef}
            renderRow={renderRow}
            rowHeight={64}
          />
        </section>
      ) : (
        <div className="flex flex-col items-center py-12 gap-3">
          <Music2 size={48} className="text-subtle" />
          <p className="text-muted">No se encontraron resultados para "{query}"</p>
        </div>
      )}
    </div>
  );
}
