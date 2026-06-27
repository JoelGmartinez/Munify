import { useRef, useCallback, memo } from 'react';
import { Heart, Play, Music2 } from 'lucide-react';
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
      className={`group track-row grid gap-4 px-4 py-2 rounded-lg cursor-pointer transition-colors items-center w-full ${isCurrent ? 'bg-[#fce4ec]' : 'hover:bg-black/5'}`}
    >
      <div className="flex items-center justify-center w-5">
        {isCurrent && isPlaying ? (
          <span className="text-[#e91e63] text-sm">♪</span>
        ) : (
          <>
            <span className={`text-sm group-hover:hidden ${isCurrent ? 'text-[#e91e63]' : 'text-[#666666]'}`}>{index + 1}</span>
            <button onClick={(e) => { e.stopPropagation(); onPlay(); }} className="hidden group-hover:flex text-[#1a1a1a]">
              <Play size={14} fill="currentColor" />
            </button>
          </>
        )}
      </div>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded flex-shrink-0 overflow-hidden">
          {track.coverUrl
            ? <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
            : <div className="w-full h-full bg-[#f5f5f5] flex items-center justify-center"><Music2 size={14} className="text-[#999999]" /></div>
          }
        </div>
        <div className="min-w-0">
          <p className={`text-sm font-semibold truncate ${isCurrent ? 'text-[#e91e63]' : 'text-[#1a1a1a]'}`}>{track.title}</p>
          <p className="text-xs text-[#666666] truncate">{track.artist}</p>
        </div>
      </div>
      <p className="hidden md:block text-sm text-[#666666] truncate">{track.album}</p>
      <p className="hidden lg:block text-sm text-[#666666] truncate">{track.artist}</p>
      <div className="flex items-center justify-end gap-2">
        <button onClick={(e) => { e.stopPropagation(); onLike(); }} className="opacity-0 group-hover:opacity-100 text-[#e91e63] p-1.5 rounded-full hover:bg-black/5 transition-all">
          <Heart size={14} fill="currentColor" />
        </button>
        <span className="text-sm text-[#666666] tabular-nums">{formatDuration(track.duration)}</span>
      </div>
    </div>
  );
});

export default function LikedView() {
  const tracks = useTracks();
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const playTrack = usePlayerStore(s => s.playTrack);
  const togglePlay = usePlayerStore(s => s.togglePlay);
  const toggleLike = usePlayerStore(s => s.toggleLike);

  const scrollRef = useRef<HTMLDivElement>(null);

  const likedTracks = tracks.filter(t => t.isLiked).sort((a, b) => b.addedAt - a.addedAt);

  const handleTrackClick = useCallback((track: Track) => {
    if (currentTrack?.id === track.id) togglePlay();
    else playTrack(track, likedTracks);
  }, [currentTrack?.id, togglePlay, playTrack, likedTracks]);

  const renderRow = useCallback((track: Track, index: number) => (
    <TrackRow
      track={track}
      isCurrent={currentTrack?.id === track.id}
      isPlaying={isPlaying}
      index={index}
      onPlay={() => handleTrackClick(track)}
      onLike={() => toggleLike(track.id)}
    />
  ), [currentTrack?.id, isPlaying, handleTrackClick, toggleLike]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#fce4ec] to-white px-6 pt-8 pb-6">
        <div className="flex items-end gap-6">
          <div className="w-48 h-48 rounded-lg bg-gradient-to-br from-[#e91e63] to-[#ff4081] flex items-center justify-center shadow-2xl flex-shrink-0">
            <Heart size={72} className="text-white" fill="white" />
          </div>
          <div>
            <p className="text-[#e91e63]/70 text-xs font-bold uppercase tracking-widest mb-1">Playlist</p>
            <h1 className="text-[#1a1a1a] font-black text-4xl mb-3">Canciones Favoritas</h1>
            <p className="text-[#666666] text-sm">
              <span className="font-semibold text-[#1a1a1a]">Munify</span>
              {' • '}{likedTracks.length} canciones
            </p>
          </div>
        </div>

        {likedTracks.length > 0 && (
          <button
            onClick={() => playTrack(likedTracks[0], likedTracks)}
            className="mt-6 w-14 h-14 bg-[#e91e63] rounded-full flex items-center justify-center hover:scale-105 transition-all shadow-lg"
          >
            <Play size={24} fill="white" className="text-white ml-1" />
          </button>
        )}
      </div>

      {/* Track List */}
      <div className="px-6 pb-8">
        {likedTracks.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-4">
            <Heart size={48} className="text-[#999999]" />
            <p className="text-[#666666] text-lg">No tienes canciones favoritas aún</p>
            <p className="text-[#999999] text-sm">Haz clic en el corazón ♡ de cualquier canción para añadirla aquí</p>
          </div>
        ) : (
          <>
            <div className="track-header grid gap-4 px-4 py-2 mb-2 text-[#666666] text-xs font-semibold uppercase tracking-wider border-b border-black/10">
              <span className="text-center">#</span>
              <span>Título</span>
              <span className="hidden md:block">Álbum</span>
              <span className="hidden lg:block">Artista</span>
              <span className="flex justify-end"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span>
            </div>
            <VirtualizedTrackList
              tracks={likedTracks}
              scrollRef={scrollRef}
              renderRow={renderRow}
              rowHeight={64}
            />
          </>
        )}
      </div>
    </div>
  );
}
