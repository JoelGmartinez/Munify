import { useState, useRef, useCallback, memo } from 'react';
import { Play, Pause, Shuffle, Heart, Music2, Clock, MoreHorizontal, Trash2, ListMusic, Plus } from 'lucide-react';
import { usePlayerStore } from '../store/playerStore';
import { formatDuration } from '../lib/metadataParser';
import { Track } from '../types';
import VirtualizedTrackList from './VirtualizedTrackList';
import { usePlaylistTracks } from '../utils/useTracks';

const GRADIENT_CLASSES: Record<string, string> = {
  '#1db954': 'from-green-700', '#e91e63': 'from-pink-700', '#9c27b0': 'from-purple-700',
  '#2196f3': 'from-blue-700', '#ff5722': 'from-orange-700', '#ff9800': 'from-amber-600',
  '#00bcd4': 'from-cyan-600', '#4caf50': 'from-green-600', '#f44336': 'from-red-600',
  '#673ab7': 'from-violet-700',
};

function getGradient(color?: string) {
  return (color && GRADIENT_CLASSES[color]) ? GRADIENT_CLASSES[color] : 'from-neutral-700';
}

const TrackRow = memo(function TrackRow({
  track, index, isCurrent, isPlaying, playlistLength, onPlay, onLike, onContextMenu, onMoreClick,
}: {
  track: Track; index: number; isCurrent: boolean; isPlaying: boolean; playlistLength: number;
  onPlay: () => void; onLike: () => void;
  onContextMenu: (e: React.MouseEvent) => void; onMoreClick: (e: React.MouseEvent) => void;
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

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString('es-MX', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div
      onClick={onPlay}
      onContextMenu={onContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
      className={`track-row group grid gap-4 px-4 py-2 rounded-lg cursor-pointer transition-colors items-center w-full ${
        isCurrent ? 'bg-[#fce4ec]' : 'hover:bg-black/5'
      }`}
    >
      <div className="flex items-center justify-center w-5 h-5">
        {isCurrent && isPlaying ? (
          <NowPlayingBars />
        ) : (
          <>
            <span className={`text-sm group-hover:hidden ${isCurrent ? 'text-[#e91e63]' : 'text-[#666666]'}`}>
              {isCurrent ? '♪' : index + 1}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onPlay(); }}
              className="hidden group-hover:flex items-center justify-center text-[#1a1a1a]"
            >
              {isCurrent && isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
            </button>
          </>
        )}
      </div>

      <div className="flex items-center gap-3 min-w-0">
        <div className="flex-shrink-0 w-10 h-10 rounded overflow-hidden">
          {track.coverUrl ? (
            <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-[#f5f5f5] flex items-center justify-center">
              <Music2 size={14} className="text-[#999999]" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className={`text-sm font-semibold truncate ${isCurrent ? 'text-[#e91e63]' : 'text-[#1a1a1a]'}`}>
            {track.title}
          </p>
          <p className="text-xs text-[#666666] truncate">{track.artist}</p>
        </div>
      </div>

      <p className="hidden md:block text-sm text-[#666666] truncate hover:text-[#1a1a1a] transition-colors">
        {track.album}
      </p>

      <p className="hidden lg:block text-sm text-[#666666]">
        {formatDate(track.addedAt)}
      </p>

      <div className="flex items-center justify-end gap-3">
        <button
          onClick={(e) => { e.stopPropagation(); onLike(); }}
          className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-black/5 transition-all ${track.isLiked ? '!opacity-100 text-[#e91e63]' : 'text-[#666666] hover:text-[#1a1a1a]'}`}
        >
          <Heart size={15} fill={track.isLiked ? 'currentColor' : 'none'} />
        </button>
        <span className="text-sm text-[#666666] tabular-nums">{formatDuration(track.duration)}</span>
        <button
          onClick={onMoreClick}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-black/5 text-[#666666] hover:text-[#1a1a1a] transition-all"
        >
          <MoreHorizontal size={15} />
        </button>
      </div>
    </div>
  );
});

function NowPlayingBars() {
  return (
    <div className="flex items-end gap-[2px] h-3.5">
      {[1, 2, 3].map(i => (
        <div
          key={i}
          className="w-[3px] bg-[#e91e63] rounded-sm animate-pulse"
          style={{
            height: `${40 + i * 20}%`,
            animationDelay: `${i * 0.15}s`,
            animationDuration: `${0.6 + i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function PlaylistView() {
  const playlists = usePlayerStore(s => s.playlists);
  const activePlaylistId = usePlayerStore(s => s.activePlaylistId);
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const shuffle = usePlayerStore(s => s.shuffle);
  const playTrack = usePlayerStore(s => s.playTrack);
  const playPlaylist = usePlayerStore(s => s.playPlaylist);
  const togglePlay = usePlayerStore(s => s.togglePlay);
  const toggleLike = usePlayerStore(s => s.toggleLike);
  const toggleShuffle = usePlayerStore(s => s.toggleShuffle);
  const addTrackToPlaylist = usePlayerStore(s => s.addTrackToPlaylist);
  const removeTrackFromPlaylist = usePlayerStore(s => s.removeTrackFromPlaylist);
  const deleteTrackPermanently = usePlayerStore(s => s.deleteTrackPermanently);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; track: Track } | null>(null);
  const [showPlaylistSubmenu, setShowPlaylistSubmenu] = useState(false);

  const playlistTracks = usePlaylistTracks(activePlaylistId ?? '');

  const playlist = playlists.find(p => p.id === activePlaylistId);
  if (!playlist) return null;

  const totalDuration = playlistTracks.reduce((sum, t) => sum + t.duration, 0);
  const isCurrentPlaylist = currentTrack?.playlistId === playlist.id;

  const handlePlayAll = useCallback(() => {
    if (isCurrentPlaylist) togglePlay();
    else playPlaylist(playlist);
  }, [isCurrentPlaylist, togglePlay, playPlaylist, playlist]);

  const handleTrackClick = useCallback((track: Track) => {
    if (currentTrack?.id === track.id) togglePlay();
    else playTrack(track, playlistTracks);
  }, [currentTrack?.id, togglePlay, playTrack, playlistTracks]);

  const handleContextMenu = useCallback((e: React.MouseEvent, track: Track) => {
    e.preventDefault();
    const menuW = 220;
    const menuH = 300;
    const x = Math.min(e.clientX, window.innerWidth - menuW);
    const y = Math.min(e.clientY, window.innerHeight - menuH);
    setContextMenu({ x: Math.max(0, x), y: Math.max(0, y), track });
  }, []);

  const renderRow = useCallback((track: Track, index: number) => (
    <TrackRow
      track={track}
      index={index}
      isCurrent={currentTrack?.id === track.id}
      isPlaying={isPlaying}
      playlistLength={playlistTracks.length}
      onPlay={() => handleTrackClick(track)}
      onLike={() => toggleLike(track.id)}
      onContextMenu={(e) => handleContextMenu(e, track)}
      onMoreClick={(e) => { e.stopPropagation(); handleContextMenu(e as any, track); }}
    />
  ), [currentTrack?.id, isPlaying, playlistTracks.length, handleTrackClick, toggleLike, handleContextMenu]);

  const formatTotalDuration = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (h > 0) return `${h} hr ${m} min`;
    return `${m} min`;
  };

  const gradClass = getGradient(playlist.color);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto relative" onClick={() => { setContextMenu(null); setShowPlaylistSubmenu(false); }}>
      {/* Hero Header */}
      <div className={`relative bg-gradient-to-b ${gradClass} to-white px-6 pb-6`}>
        <div className="pt-8 pb-4 flex flex-col sm:flex-row items-center sm:items-end gap-6">
          <div className="flex-shrink-0 w-48 h-48 sm:w-52 sm:h-52 rounded-lg overflow-hidden shadow-2xl">
            {playlist.coverUrl ? (
              <img src={playlist.coverUrl} alt={playlist.name} className="w-full h-full object-cover" />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${gradClass} to-neutral-300 flex items-center justify-center`}>
                <Music2 size={72} className="text-white/50" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <p className="text-[#1a1a1a]/50 text-xs font-bold uppercase tracking-widest mb-1">Playlist</p>
            <h1 className="text-[#1a1a1a] font-black text-3xl sm:text-5xl mb-4 leading-tight">{playlist.name}</h1>
            <div className="flex items-center justify-center sm:justify-start gap-1 text-[#666666] text-sm">
              <span className="font-semibold text-[#1a1a1a]">Munify</span>
              <span>•</span>
              <span>{playlistTracks.length} canciones</span>
              <span>•</span>
              <span>{formatTotalDuration(totalDuration)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-4">
          <button
            onClick={handlePlayAll}
            className="w-14 h-14 bg-[#e91e63] rounded-full flex items-center justify-center hover:scale-105 transition-all shadow-lg hover:bg-[#ff4081]"
          >
            {isCurrentPlaylist && isPlaying
              ? <Pause size={24} fill="white" className="text-white" />
              : <Play size={24} fill="white" className="text-white ml-1" />
            }
          </button>
          <button
            onClick={toggleShuffle}
            className={`p-3 rounded-full transition-colors hover:bg-black/5 ${shuffle ? 'text-[#e91e63]' : 'text-[#666666] hover:text-[#1a1a1a]'}`}
          >
            <Shuffle size={24} />
          </button>
        </div>
      </div>

      {/* Track List */}
      <div className="px-4 md:px-6 pb-8 bg-gradient-to-b from-white/80 to-white">
        <div className="track-header grid gap-4 px-4 py-2 mb-2 text-[#666666] text-xs font-semibold uppercase tracking-wider border-b border-black/10">
          <span className="text-center">#</span>
          <span>Título</span>
          <span className="hidden md:block">Álbum</span>
          <span className="hidden lg:block">Fecha de Adición</span>
          <span className="flex justify-end">
            <Clock size={14} />
          </span>
        </div>

        {playlistTracks.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <Music2 size={40} className="text-[#999999]" />
            <p className="text-[#666666]">Esta playlist está vacía</p>
          </div>
        ) : (
          <VirtualizedTrackList
            tracks={playlistTracks}
            scrollRef={scrollRef}
            renderRow={renderRow}
            rowHeight={64}
          />
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && !showPlaylistSubmenu && (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-2xl py-1 min-w-[180px] border border-black/10"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { toggleLike(contextMenu.track.id); setContextMenu(null); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#1a1a1a] hover:bg-pink-500/10 transition-colors"
          >
            <Heart size={15} className={contextMenu.track.isLiked ? 'text-[#e91e63]' : ''} fill={contextMenu.track.isLiked ? 'currentColor' : 'none'} />
            {contextMenu.track.isLiked ? 'Quitar de Favoritos' : 'Añadir a Favoritos'}
          </button>
          <button
            onClick={() => { playTrack(contextMenu.track, playlistTracks); setContextMenu(null); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#1a1a1a] hover:bg-pink-500/10 transition-colors"
          >
            <Play size={15} />
            Reproducir ahora
          </button>
          {playlists.length > 0 && (
            <>
              <div className="border-t border-black/5 my-1" />
              <button
                onClick={() => setShowPlaylistSubmenu(true)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#1a1a1a] hover:bg-pink-500/10 transition-colors"
              >
                <ListMusic size={15} />
                Añadir a Playlist
              </button>
              {contextMenu.track.playlistId && contextMenu.track.playlistId !== activePlaylistId && (
                <button
                  onClick={() => { addTrackToPlaylist(contextMenu.track.id, activePlaylistId!); setContextMenu(null); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#1a1a1a] hover:bg-pink-500/10 transition-colors"
                >
                  <Plus size={15} />
                  Mover a esta playlist
                </button>
              )}
              <button
                onClick={() => { removeTrackFromPlaylist(contextMenu.track.id); setContextMenu(null); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#1a1a1a] hover:bg-pink-500/10 transition-colors"
              >
                <Trash2 size={15} className="text-red-400" />
                <span className="text-red-400">Quitar de playlist</span>
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
            <p className="text-xs text-[#999999]">{formatDuration(contextMenu.track.duration)}</p>
            {contextMenu.track.year && <p className="text-xs text-[#999999]">{contextMenu.track.year}</p>}
            {contextMenu.track.genre && <p className="text-xs text-[#999999]">{contextMenu.track.genre}</p>}
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
          <div className="px-4 py-2 text-xs text-[#666666] font-semibold uppercase tracking-wider">Seleccionar playlist</div>
          {playlists.map(pl => (
            <button
              key={pl.id}
              onClick={() => {
                addTrackToPlaylist(contextMenu.track.id, pl.id);
                setContextMenu(null);
                setShowPlaylistSubmenu(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#1a1a1a] hover:bg-pink-500/10 transition-colors"
            >
              <ListMusic size={15} className="text-[#666666]" />
              {pl.name}
            </button>
          ))}
          <div className="border-t border-black/5 my-1" />
          <button
            onClick={() => setShowPlaylistSubmenu(false)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#666666] hover:text-[#1a1a1a] hover:bg-pink-500/10 transition-colors"
          >
            Volver
          </button>
        </div>
      )}
    </div>
  );
}
