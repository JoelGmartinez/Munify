import { useState, useRef, useCallback, memo } from 'react';
import { Play, Music2, Heart, MoreHorizontal, Trash2, ListMusic } from 'lucide-react';
import { usePlayerStore } from '../store/playerStore';
import { formatDuration } from '../lib/metadataParser';
import { Track } from '../types';
import VirtualizedTrackList from './VirtualizedTrackList';
import { useTracks } from '../utils/useTracks';

const TrackRow = memo(function TrackRow({
  track, isCurrent, isPlaying, onPlay, onLike, onContextMenu, onMoreClick,
}: {
  track: Track; isCurrent: boolean; isPlaying: boolean;
  onPlay: () => void; onLike: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onMoreClick: (e: React.MouseEvent) => void;
}) {
  const touchTimer = useRef<ReturnType<typeof setTimeout>>();

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchTimer.current = setTimeout(() => {
      const touch = e.touches[0];
      onContextMenu({
        preventDefault: () => {},
        clientX: touch.clientX,
        clientY: touch.clientY,
      } as unknown as React.MouseEvent);
    }, 500);
  }, [onContextMenu]);

  const handleTouchEnd = useCallback(() => {
    clearTimeout(touchTimer.current);
  }, []);

  return (
    <div
      onClick={onPlay}
      onContextMenu={onContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
      className={`group flex items-center gap-4 px-4 py-2 rounded-lg cursor-pointer transition-colors w-full ${
        isCurrent ? 'bg-accent-surface' : 'hover:bg-black/5'
      }`}
    >
      <div className="max-md:hidden w-5 text-center">
        {isCurrent && isPlaying ? (
          <span className="text-accent text-sm">♪</span>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onPlay(); }}
            className="opacity-0 group-hover:opacity-100 text-main"
          >
            <Play size={14} fill="currentColor" />
          </button>
        )}
      </div>
      <div className="w-10 h-10 rounded flex-shrink-0 overflow-hidden">
        {track.coverUrl ? (
          <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-surface flex items-center justify-center">
            <Music2 size={14} className="text-subtle" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${isCurrent ? 'text-accent' : 'text-main'}`}>
          {track.title}
        </p>
        <p className="text-xs text-muted truncate">{track.artist} • {track.album}</p>
      </div>
      {track.playlistId && (
        <span className="hidden sm:block text-xs text-subtle">En playlist</span>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onLike(); }}
        className={`max-md:hidden p-1.5 rounded-full hover:bg-black/5 transition-colors ${
          track.isLiked ? 'text-accent' : 'text-muted hover:text-main opacity-0 group-hover:opacity-100'
        }`}
      >
        <Heart size={14} fill={track.isLiked ? 'currentColor' : 'none'} />
      </button>
      <button
        onClick={onMoreClick}
        className="p-1.5 rounded-full hover:bg-black/5 text-muted hover:text-main transition-all max-md:opacity-100 md:opacity-0 md:group-hover:opacity-100"
      >
        <MoreHorizontal size={15} />
      </button>
      <span className="max-md:hidden text-xs text-muted tabular-nums flex-shrink-0">{formatDuration(track.duration)}</span>
    </div>
  );
});

export default function SongsView() {
  const tracks = useTracks();
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const playlists = usePlayerStore(s => s.playlists);
  const playTrack = usePlayerStore(s => s.playTrack);
  const togglePlay = usePlayerStore(s => s.togglePlay);
  const toggleLike = usePlayerStore(s => s.toggleLike);
  const addTrackToPlaylist = usePlayerStore(s => s.addTrackToPlaylist);
  const deleteTrackPermanently = usePlayerStore(s => s.deleteTrackPermanently);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; track: Track } | null>(null);
  const [showPlaylistSubmenu, setShowPlaylistSubmenu] = useState(false);

  const sortedTracks = [...tracks].sort((a, b) => b.addedAt - a.addedAt);

  const handleTrackClick = useCallback((track: Track) => {
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      playTrack(track, sortedTracks);
    }
  }, [currentTrack?.id, togglePlay, playTrack, sortedTracks]);

  const handleLike = useCallback((trackId: string) => {
    toggleLike(trackId);
  }, [toggleLike]);

  const handleContextMenu = useCallback((e: React.MouseEvent, track: Track) => {
    e.preventDefault();
    const menuW = 220;
    const menuH = 300;
    const x = Math.min(e.clientX, window.innerWidth - menuW);
    const y = Math.min(e.clientY, window.innerHeight - menuH);
    setContextMenu({ x: Math.max(0, x), y: Math.max(0, y), track });
  }, []);

  const renderRow = useCallback((track: Track) => (
    <TrackRow
      track={track}
      isCurrent={currentTrack?.id === track.id}
      isPlaying={isPlaying}
      onPlay={() => handleTrackClick(track)}
      onLike={() => handleLike(track.id)}
      onContextMenu={(e) => handleContextMenu(e, track)}
      onMoreClick={(e) => { e.stopPropagation(); handleContextMenu(e as any, track); }}
    />
  ), [currentTrack?.id, isPlaying, handleTrackClick, handleLike, handleContextMenu]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto bg-gradient-to-b from-accent-bg via-white to-white" onClick={() => { setContextMenu(null); setShowPlaylistSubmenu(false); }}>
      <div className="px-6 pt-8 pb-6">
        <h1 className="text-3xl font-black text-main mb-2">Todas las Canciones</h1>
        <p className="text-muted text-sm">{tracks.length} canciones</p>
      </div>

      {tracks.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-4">
          <Music2 size={48} className="text-subtle" />
          <p className="text-muted text-lg">No hay canciones aún</p>
          <p className="text-subtle text-sm">Sube música desde el menú lateral</p>
        </div>
      ) : (
        <div className="px-6 pb-8">
          <VirtualizedTrackList
            tracks={sortedTracks}
            scrollRef={scrollRef}
            renderRow={renderRow}
            rowHeight={64}
          />
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && !showPlaylistSubmenu && (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-2xl py-1 min-w-[180px] border border-black/10"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { toggleLike(contextMenu.track.id); setContextMenu(null); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-main hover:bg-pink-500/10 transition-colors"
          >
            <Heart size={15} className={contextMenu.track.isLiked ? 'text-accent' : ''} fill={contextMenu.track.isLiked ? 'currentColor' : 'none'} />
            {contextMenu.track.isLiked ? 'Quitar de Favoritos' : 'Añadir a Favoritos'}
          </button>
          <button
            onClick={() => { playTrack(contextMenu.track, sortedTracks); setContextMenu(null); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-main hover:bg-pink-500/10 transition-colors"
          >
            <Play size={15} />
            Reproducir ahora
          </button>
          {playlists.length > 0 && (
            <>
              <div className="border-t border-black/5 my-1" />
              <button
                onClick={() => setShowPlaylistSubmenu(true)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-main hover:bg-pink-500/10 transition-colors"
              >
                <ListMusic size={15} />
                Añadir a Playlist
              </button>
            </>
          )}
          <div className="border-t border-black/5 my-1" />
          <button
            onClick={() => { if (confirm('¿Eliminar "' + contextMenu.track.title + '" de la biblioteca?')) { deleteTrackPermanently(contextMenu.track.id); setContextMenu(null); } }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={15} />
            Eliminar
          </button>
          <div className="border-t border-black/5 my-1" />
          <div className="px-4 py-2">
            <p className="text-xs text-subtle">{formatDuration(contextMenu.track.duration)}</p>
            {contextMenu.track.year && <p className="text-xs text-subtle">{contextMenu.track.year}</p>}
            {contextMenu.track.genre && <p className="text-xs text-subtle">{contextMenu.track.genre}</p>}
          </div>
        </div>
      )}

      {/* Playlist Submenu */}
      {contextMenu && showPlaylistSubmenu && (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-2xl py-1 min-w-[200px] border border-black/10"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-2 text-xs text-muted font-semibold uppercase tracking-wider">Seleccionar playlist</div>
          {playlists.map(pl => (
            <button
              key={pl.id}
              onClick={() => {
                addTrackToPlaylist(contextMenu.track.id, pl.id);
                setContextMenu(null);
                setShowPlaylistSubmenu(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-main hover:bg-pink-500/10 transition-colors"
            >
              <ListMusic size={15} className="text-muted" />
              {pl.name}
            </button>
          ))}
          <div className="border-t border-black/5 my-1" />
          <button
            onClick={() => setShowPlaylistSubmenu(false)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-muted hover:text-main hover:bg-pink-500/10 transition-colors"
          >
            Volver
          </button>
        </div>
      )}
    </div>
  );
}
