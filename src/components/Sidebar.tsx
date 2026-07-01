import { useState } from 'react';
import { Home, Heart, Clock, Plus, Music2, ListMusic, ChevronRight, Trash2, Edit2, Check, X, List, RotateCw, Folder } from 'lucide-react';
import { usePlayerStore } from '../store/playerStore';
import { formatDuration } from '../lib/metadataParser';
import { useTracks } from '../utils/useTracks';

const NAV_ITEMS = [
  { id: 'home', label: 'Inicio', icon: Home },
  { id: 'songs', label: 'Todas las Canciones', icon: List },
  { id: 'liked', label: 'Canciones Favoritas', icon: Heart },
  { id: 'recent', label: 'Reproducidas Recientemente', icon: Clock },
] as const;

const GRADIENT_COLORS: Record<string, string> = {
  '#1db954': 'from-green-600', '#e91e63': 'from-pink-600', '#9c27b0': 'from-purple-600',
  '#2196f3': 'from-blue-600', '#ff5722': 'from-orange-600', '#ff9800': 'from-amber-500',
  '#00bcd4': 'from-cyan-500', '#4caf50': 'from-green-500', '#f44336': 'from-red-500',
  '#673ab7': 'from-violet-600',
};

function getGradientClass(color?: string): string {
  if (!color) return 'from-neutral-600';
  return GRADIENT_COLORS[color] || 'from-neutral-600';
}

interface EditingState { id: string; name: string }

export default function Sidebar() {
  const playlists = usePlayerStore(s => s.playlists);
  const currentView = usePlayerStore(s => s.currentView);
  const activePlaylistId = usePlayerStore(s => s.activePlaylistId);
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const setView = usePlayerStore(s => s.setView);
  const setShowUploadModal = usePlayerStore(s => s.setShowUploadModal);
  const removePlaylist = usePlayerStore(s => s.removePlaylist);
  const renamePlaylist = usePlayerStore(s => s.renamePlaylist);
  const createEmptyPlaylist = usePlayerStore(s => s.createEmptyPlaylist);
  const tracks = useTracks();

  const [editing, setEditing] = useState<EditingState | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const handleRename = async () => {
    if (!editing || !editing.name.trim()) return;
    await renamePlaylist(editing.id, editing.name.trim());
    setEditing(null);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createEmptyPlaylist(newName.trim());
    setNewName('');
    setCreating(false);
  };

  const totalDuration = (playlistId: string) => {
    let sum = 0;
    for (const t of tracks) {
      if (t.playlistId === playlistId) sum += t.duration;
    }
    return sum;
  };

  return (
    <aside className="flex flex-col bg-white h-full w-full overflow-hidden border-r border-black/5">
      <div className="px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-accent rounded-lg">
            <Music2 size={20} className="text-white" />
          </div>
          <span className="text-main font-black text-xl tracking-tight">Munify</span>
        </div>
      </div>

      <nav className="px-3 mb-2">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setView(id as any)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              currentView === id && !activePlaylistId
                ? 'bg-accent-surface text-accent'
                : 'text-muted hover:text-main hover:bg-black/5'
            }`}
          >
            <Icon size={20} className={currentView === id && !activePlaylistId ? 'text-accent' : ''} />
            {label}
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2 text-muted">
            <ListMusic size={18} />
            <span className="text-sm font-semibold">Tu Biblioteca</span>
          </div>
          <button
            onClick={() => setCreating(!creating)}
            className="p-1.5 rounded-full hover:bg-black/5 transition-colors text-muted hover:text-main"
            title="Crear playlist"
          >
            <Plus size={18} />
          </button>
        </div>

        {creating && (
          <div className="mx-3 mb-2 flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setCreating(false); setNewName(''); } }}
              placeholder="Nombre de la playlist"
              className="bg-black/5 text-main text-sm px-2 py-1.5 rounded w-full outline-none border border-accent placeholder:text-subtle" />
            <button onClick={handleCreate} className="text-accent p-1"><Check size={16} /></button>
            <button onClick={() => { setCreating(false); setNewName(''); }} className="text-muted p-1"><X size={16} /></button>
          </div>
        )}

        {playlists.length === 0 && !creating ? (
          <div className="mx-3 p-4 rounded-xl bg-surface">
            <p className="text-main text-sm font-bold mb-1">Crea tu primera playlist</p>
            <p className="text-muted text-xs mb-3">Es fácil, te ayudaremos</p>
            <button onClick={() => setCreating(true)} className="px-4 py-2 bg-accent text-white text-xs font-bold rounded-full hover:scale-105 transition-transform">
              + Crear Playlist
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-3 space-y-1 pb-4 scrollbar-hide">
            {playlists.map(pl => {
              const trackCount = tracks.reduce((c, t) => c + (t.playlistId === pl.id ? 1 : 0), 0);
              const isActive = currentView === 'playlist' && activePlaylistId === pl.id;
              const isPlaying = currentTrack?.playlistId === pl.id;
              const gradClass = getGradientClass(pl.color);
              return (
                <div key={pl.id}
                  className={`group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${isActive ? 'bg-accent-surface' : 'hover:bg-black/5'}`}
                  onClick={() => setView('playlist', pl.id)}>
                  <div className="flex-shrink-0 w-10 h-10 rounded overflow-hidden relative">
                    {pl.coverUrl ? (
                      <img src={pl.coverUrl} alt={pl.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${gradClass} to-neutral-300 flex items-center justify-center`}>
                        <Music2 size={16} className="text-white/70" />
                      </div>
                    )}
                    {isPlaying && (
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <NowPlayingBars />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {editing?.id === pl.id ? (
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <input autoFocus value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })}
                          onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditing(null); }}
                          className="bg-black/5 text-main text-sm px-2 py-0.5 rounded w-full outline-none border border-accent" />
                        <button onClick={handleRename} className="text-accent p-0.5"><Check size={14} /></button>
                        <button onClick={() => setEditing(null)} className="text-muted p-0.5"><X size={14} /></button>
                      </div>
                    ) : (
                      <p className={`text-sm font-semibold truncate ${isActive ? 'text-accent' : 'text-main'}`}>{pl.name}</p>
                    )}
                    <p className="text-xs text-muted truncate">Playlist • {trackCount} canciones</p>
                  </div>
                  <div className="hidden group-hover:flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setEditing({ id: pl.id, name: pl.name })}
                      className="p-1.5 rounded-full hover:bg-black/5 text-muted hover:text-main transition-colors" title="Renombrar">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => removePlaylist(pl.id)}
                      className="p-1.5 rounded-full hover:bg-red-500/10 text-muted hover:text-red-400 transition-colors" title="Eliminar">
                      <Trash2 size={13} />
                    </button>
                  </div>
                  {!editing && (
                    <ChevronRight size={14} className="text-subtle group-hover:text-muted transition-colors flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {usePlayerStore.getState().directoryPath && (
        <div className="border-t border-black/5 px-4 py-2 flex items-center gap-2">
          <Music2 size={12} className="text-accent" />
          <span className="text-xs text-muted truncate flex-1">{usePlayerStore.getState().directoryPath}</span>
          <button
            onClick={() => usePlayerStore.getState().rescanFolder()}
            className="p-1 rounded hover:bg-black/5 text-muted hover:text-accent transition-colors"
            title="Rescanear carpeta"
          >
            <RotateCw size={13} />
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="p-1 rounded hover:bg-black/5 text-muted hover:text-accent transition-colors"
            title="Cambiar carpeta"
          >
            <Folder size={13} />
          </button>
        </div>
      )}
    </aside>
  );
}

function NowPlayingBars() {
  return (
    <div className="flex items-end gap-[2px] h-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="w-[3px] bg-accent rounded-sm animate-pulse"
          style={{ height: `${40 + i * 20}%`, animationDelay: `${i * 0.15}s`, animationDuration: `${0.6 + i * 0.1}s` }} />
      ))}
    </div>
  );
}
