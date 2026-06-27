import { useState } from 'react';
import { Plus, Music2, ListMusic, Trash2, Edit3, Check, X, Heart, Clock, Headphones } from 'lucide-react';
import { usePlayerStore } from '../store/playerStore';
import { useTracks } from '../utils/useTracks';
import { Playlist } from '../types';

export default function MobileLibraryView() {
  const playlists = usePlayerStore(s => s.playlists);
  const setView = usePlayerStore(s => s.setView);
  const removePlaylist = usePlayerStore(s => s.removePlaylist);
  const renamePlaylist = usePlayerStore(s => s.renamePlaylist);
  const createEmptyPlaylist = usePlayerStore(s => s.createEmptyPlaylist);
  const tracks = useTracks();

  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
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

  const playlistTrackCount = (playlistId: string) => {
    const ids = usePlayerStore.getState().playlistTrackIds[playlistId];
    return ids?.length ?? 0;
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-[#fff5f7] via-white to-white">
      <div className="px-6 pt-8 pb-6">
        <h1 className="text-3xl font-black text-[#1a1a1a] mb-2">Tu Biblioteca</h1>
        <p className="text-[#666666] text-sm">{playlists.length} playlists</p>
      </div>

      <div className="px-6 pb-4">
        {/* Library quick links */}
        <button
          onClick={() => setView('songs')}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-black/5 transition-colors text-left"
        >
          <div className="w-12 h-12 rounded bg-gradient-to-br from-[#e91e63] to-[#ff4081] flex items-center justify-center flex-shrink-0">
            <Headphones size={20} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[#1a1a1a] text-sm font-semibold">Todas las Canciones</p>
            <p className="text-[#666666] text-xs">{tracks.length} canciones</p>
          </div>
        </button>

        <button
          onClick={() => setView('liked')}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-black/5 transition-colors text-left"
        >
          <div className="w-12 h-12 rounded bg-gradient-to-br from-[#e91e63] to-[#c2185b] flex items-center justify-center flex-shrink-0">
            <Heart size={20} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[#1a1a1a] text-sm font-semibold">Canciones Favoritas</p>
            <p className="text-[#666666] text-xs">Tus canciones marcadas con like</p>
          </div>
        </button>

        <button
          onClick={() => setView('recent')}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-black/5 transition-colors text-left"
        >
          <div className="w-12 h-12 rounded bg-gradient-to-br from-[#e91e63] to-[#ff4081] flex items-center justify-center flex-shrink-0">
            <Clock size={20} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[#1a1a1a] text-sm font-semibold">Reproducidas Recientemente</p>
            <p className="text-[#666666] text-xs">Tu historial de reproducción</p>
          </div>
        </button>
      </div>

      <div className="px-6 pb-2">
        <div className="flex items-center justify-between">
          <h2 className="text-[#1a1a1a] text-lg font-bold">Playlists</h2>
          <button
            onClick={() => setCreating(!creating)}
            className="p-2 rounded-full hover:bg-black/5 transition-colors text-[#666666] hover:text-[#1a1a1a]"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      {creating && (
        <div className="mx-6 mb-3 flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setCreating(false); setNewName(''); } }}
            placeholder="Nombre de la playlist"
            className="flex-1 bg-black/5 text-[#1a1a1a] text-sm px-3 py-2 rounded-lg outline-none border border-[#e91e63] placeholder:text-[#999999]"
          />
          <button onClick={handleCreate} className="text-[#e91e63] p-1.5 rounded-full hover:bg-black/5"><Check size={18} /></button>
          <button onClick={() => { setCreating(false); setNewName(''); }} className="text-[#666666] p-1.5 rounded-full hover:bg-black/5"><X size={18} /></button>
        </div>
      )}

      <div className="px-6 pb-8 space-y-1">
        {playlists.length === 0 && !creating ? (
          <div className="p-6 rounded-xl bg-[#f5f5f5] text-center">
            <ListMusic size={32} className="text-[#999999] mx-auto mb-3" />
            <p className="text-[#1a1a1a] text-sm font-semibold mb-1">Crea tu primera playlist</p>
            <p className="text-[#666666] text-xs mb-3">Agrupa tus canciones favoritas</p>
            <button
              onClick={() => setCreating(true)}
              className="px-6 py-2 bg-[#e91e63] text-white text-xs font-bold rounded-full hover:scale-105 transition-transform"
            >
              + Crear Playlist
            </button>
          </div>
        ) : (
          playlists.map(pl => (
            <div key={pl.id} className="group flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-black/5 transition-colors cursor-pointer"
              onClick={() => setView('playlist', pl.id)}
            >
              <div className="w-12 h-12 rounded bg-gradient-to-br from-neutral-300 to-neutral-400 flex items-center justify-center flex-shrink-0">
                <Music2 size={18} className="text-white" />
              </div>

              <div className="min-w-0 flex-1">
                {editing?.id === pl.id ? (
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <input
                      autoFocus
                      value={editing.name}
                      onChange={e => setEditing({ ...editing, name: e.target.value })}
                      onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditing(null); }}
                      className="flex-1 bg-black/5 text-[#1a1a1a] text-sm px-2 py-1 rounded outline-none border border-[#e91e63]"
                    />
                    <button onClick={handleRename} className="text-[#e91e63] p-1"><Check size={14} /></button>
                    <button onClick={() => setEditing(null)} className="text-[#666666] p-1"><X size={14} /></button>
                  </div>
                ) : (
                  <p className="text-[#1a1a1a] text-sm font-semibold truncate">{pl.name}</p>
                )}
                <p className="text-[#666666] text-xs">
                  {playlistTrackCount(pl.id)} canciones
                </p>
              </div>

              <div className="hidden group-hover:flex items-center gap-1" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => setEditing({ id: pl.id, name: pl.name })}
                  className="p-1.5 rounded-full hover:bg-black/5 text-[#666666] hover:text-[#1a1a1a] transition-colors"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`¿Eliminar la playlist "${pl.name}"?`)) {
                      removePlaylist(pl.id);
                    }
                  }}
                  className="p-1.5 rounded-full hover:bg-red-500/10 text-[#666666] hover:text-red-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
