import { Play, Music2, Upload, Heart, Clock, TrendingUp, List } from 'lucide-react';
import { usePlayerStore } from '../store/playerStore';
import { formatDuration } from '../lib/metadataParser';
import { useTracks } from '../utils/useTracks';

const GRADIENT_CLASSES: Record<string, string> = {
  '#1db954': 'from-green-600 to-green-900', '#e91e63': 'from-pink-600 to-pink-900',
  '#9c27b0': 'from-purple-600 to-purple-900', '#2196f3': 'from-blue-600 to-blue-900',
  '#ff5722': 'from-orange-600 to-orange-900', '#ff9800': 'from-amber-500 to-amber-900',
  '#00bcd4': 'from-cyan-500 to-cyan-900', '#4caf50': 'from-green-500 to-green-900',
  '#f44336': 'from-red-500 to-red-900', '#673ab7': 'from-violet-600 to-violet-900',
};

function getGradient(color?: string) {
  if (!color) return 'from-neutral-600 to-neutral-900';
  return GRADIENT_CLASSES[color] || 'from-neutral-600 to-neutral-900';
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function HomeView() {
  const playlists = usePlayerStore(s => s.playlists);
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const setView = usePlayerStore(s => s.setView);
  const setShowUploadModal = usePlayerStore(s => s.setShowUploadModal);
  const playPlaylist = usePlayerStore(s => s.playPlaylist);
  const tracks = useTracks();

  const likedTracks = tracks.filter(t => t.isLiked);
  const recentTracks = [...tracks]
    .filter(t => t.lastPlayed)
    .sort((a, b) => (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0))
    .slice(0, 5);

  const topTracks = [...tracks]
    .sort((a, b) => b.playCount - a.playCount)
    .slice(0, 10);

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-[#fff5f7] via-white to-white">
      <div className="px-6 pt-8 pb-4">
        <h1 className="text-3xl font-black text-[#1a1a1a] mb-6">{getGreeting()}</h1>

        {tracks.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
            <button onClick={() => setView('songs')}
              className="group flex items-center gap-3 bg-[#f5f5f5] hover:bg-[#fce4ec] rounded-lg overflow-hidden transition-all">
              <div className="w-16 h-16 flex-shrink-0 bg-gradient-to-br from-[#e91e63] to-[#ff4081] flex items-center justify-center">
                <List size={24} className="text-white" />
              </div>
              <span className="text-[#1a1a1a] font-bold text-sm truncate pr-2">Todas las Canciones</span>
            </button>
            {likedTracks.length > 0 && (
              <button onClick={() => setView('liked')}
                className="group flex items-center gap-3 bg-[#fce4ec] hover:bg-[#f8bbd0] rounded-lg overflow-hidden transition-all">
                <div className="w-16 h-16 flex-shrink-0 bg-gradient-to-br from-[#e91e63] to-[#ff4081] flex items-center justify-center">
                  <Heart size={24} className="text-white" fill="white" />
                </div>
                <span className="text-[#1a1a1a] font-bold text-sm truncate pr-2">Canciones favoritas</span>
              </button>
            )}
            {playlists.slice(0, likedTracks.length > 0 ? 4 : 5).map(pl => (
              <button key={pl.id} onClick={() => setView('playlist', pl.id)}
                className="group flex items-center gap-3 bg-[#f5f5f5] hover:bg-[#fce4ec] rounded-lg overflow-hidden transition-all">
                <div className="w-16 h-16 flex-shrink-0">
                  {pl.coverUrl ? (
                    <img src={pl.coverUrl} alt={pl.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${getGradient(pl.color)} flex items-center justify-center`}>
                      <Music2 size={22} className="text-white/70" />
                    </div>
                  )}
                </div>
                <span className="text-[#1a1a1a] font-bold text-sm truncate pr-2">{pl.name}</span>
              </button>
            ))}
          </div>
        )}

        {tracks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-6">
            <div className="p-6 rounded-full bg-[#f5f5f5]">
              <Music2 size={48} className="text-[#666666]" />
            </div>
            <div className="text-center">
              <h2 className="text-[#1a1a1a] text-2xl font-bold mb-2">Tu biblioteca está vacía</h2>
              <p className="text-[#666666] max-w-sm">Sube tu música para empezar a escuchar. Soporta MP3, FLAC, WAV, M4A y más.</p>
            </div>
            <button onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-8 py-3 bg-[#e91e63] hover:bg-[#ff4081] text-white font-bold rounded-full transition-colors text-sm">
              <Upload size={18} />
              Añadir Música
            </button>
          </div>
        )}
      </div>

      {playlists.length > 0 && (
        <section className="px-6 pb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[#1a1a1a] font-bold text-xl">Tus Playlists</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {playlists.map(pl => {
              const plTracks = tracks.filter(t => t.playlistId === pl.id);
              const isPlaying = currentTrack?.playlistId === pl.id;
              return (
                <div key={pl.id}
                  className="group relative bg-[#fafafa] hover:bg-[#f5f5f5] rounded-xl p-4 cursor-pointer transition-all duration-300 border border-black/5"
                  onClick={() => setView('playlist', pl.id)}>
                  <div className="relative mb-4 aspect-square rounded-lg overflow-hidden shadow-xl">
                    {pl.coverUrl ? (
                      <img src={pl.coverUrl} alt={pl.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${getGradient(pl.color)} flex items-center justify-center`}>
                        <Music2 size={36} className="text-white/50" />
                      </div>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); playPlaylist(pl); }}
                      className="absolute bottom-2 right-2 w-10 h-10 bg-[#e91e63] rounded-full flex items-center justify-center shadow-xl
                        opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 hover:scale-105 transition-all duration-200">
                      <Play size={18} fill="white" className="text-white ml-0.5" />
                    </button>
                  </div>
                  <p className="text-[#1a1a1a] font-bold text-sm truncate mb-1">{pl.name}</p>
                  <p className="text-[#666666] text-xs">{plTracks.length} canciones</p>
                  {isPlaying && (
                    <div className="absolute top-3 left-3">
                      <div className="flex items-end gap-[2px] h-3 bg-[#e91e63]/80 rounded px-1 py-0.5">
                        {[1,2,3].map(i => (
                          <div key={i} className="w-[2px] bg-white rounded-sm animate-pulse"
                            style={{ height: `${40 + i * 20}%`, animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {topTracks.length > 0 && topTracks[0].playCount > 0 && (
        <section className="px-6 pb-8">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-[#e91e63]" />
            <h2 className="text-[#1a1a1a] font-bold text-xl">Más Escuchadas</h2>
          </div>
          <RecentTrackList tracks={topTracks} />
        </section>
      )}
    </div>
  );
}

function RecentTrackList({ tracks }: { tracks: ReturnType<typeof usePlayerStore.getState>['trackEntities'] extends Record<string, infer T> ? T[] : never }) {
  const playTrack = usePlayerStore(s => s.playTrack);
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const togglePlay = usePlayerStore(s => s.togglePlay);
  const toggleLike = usePlayerStore(s => s.toggleLike);

  return (
    <div className="space-y-1">
      {tracks.map((track, i) => {
        const isCurrent = currentTrack?.id === track.id;
        return (
          <div key={track.id} onClick={() => playTrack(track)}
            className={`group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${isCurrent ? 'bg-[#fce4ec]' : 'hover:bg-black/5'}`}>
            <span className="w-5 text-center text-xs text-[#666666] flex-shrink-0">
              {isCurrent && isPlaying ? (
                <span className="text-[#e91e63]">♪</span>
              ) : (
                <span>{i + 1}</span>
              )}
            </span>
            <div className="w-10 h-10 rounded flex-shrink-0 overflow-hidden">
              {track.coverUrl ? (
                <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#f5f5f5] flex items-center justify-center">
                  <Music2 size={14} className="text-[#999999]" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold truncate ${isCurrent ? 'text-[#e91e63]' : 'text-[#1a1a1a]'}`}>{track.title}</p>
              <p className="text-xs text-[#666666] truncate">{track.artist}</p>
            </div>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => toggleLike(track.id)}
                className={`p-1.5 rounded-full hover:bg-black/5 transition-colors ${track.isLiked ? 'text-[#e91e63]' : 'text-[#666666] hover:text-[#1a1a1a]'}`}>
                <Heart size={14} fill={track.isLiked ? 'currentColor' : 'none'} />
              </button>
            </div>
            <span className="text-xs text-[#666666] tabular-nums flex-shrink-0">{formatDuration(track.duration)}</span>
          </div>
        );
      })}
    </div>
  );
}
