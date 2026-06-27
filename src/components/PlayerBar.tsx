import { useCallback, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, Heart, ListMusic, Music2 } from 'lucide-react';
import { usePlayerStore } from '../store/playerStore';
import { formatDuration } from '../lib/metadataParser';
import { useAudioEngine } from '../hooks/useAudioEngine';

export default function PlayerBar() {
  const [expanded, setExpanded] = useState(false);
  const { seek } = useAudioEngine();

  const currentTrack = usePlayerStore(s => s.currentTrack);
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const currentTime = usePlayerStore(s => s.currentTime);
  const duration = usePlayerStore(s => s.duration);
  const shuffle = usePlayerStore(s => s.shuffle);
  const repeat = usePlayerStore(s => s.repeat);
  const showQueue = usePlayerStore(s => s.showQueue);
  const togglePlay = usePlayerStore(s => s.togglePlay);
  const next = usePlayerStore(s => s.next);
  const previous = usePlayerStore(s => s.previous);
  const toggleShuffle = usePlayerStore(s => s.toggleShuffle);
  const cycleRepeat = usePlayerStore(s => s.cycleRepeat);
  const toggleLike = usePlayerStore(s => s.toggleLike);
  const setShowQueue = usePlayerStore(s => s.setShowQueue);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    seek(Number(e.target.value));
  }, [seek]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const coverArt = (iconSize: number) => (
    currentTrack?.coverUrl ? (
      <img src={currentTrack.coverUrl} alt={currentTrack.title} className="w-full h-full object-cover" />
    ) : (
      <div className="w-full h-full bg-gradient-to-br from-[#e91e63] to-[#ff4081] flex items-center justify-center">
        <Music2 size={iconSize} className="text-white/50" />
      </div>
    )
  );

  return (
    <>
      {/* DESKTOP */}
      <div className="hidden md:flex h-[90px] bg-white border-t border-black/10 items-center px-4 gap-4 flex-shrink-0">
        <div className="flex items-center gap-3 w-[30%] min-w-0">
          {currentTrack ? (
            <>
              <div className="flex-shrink-0 w-14 h-14 rounded overflow-hidden shadow-lg">{coverArt(20)}</div>
              <div className="min-w-0 flex-1">
                <p className="text-[#1a1a1a] text-sm font-semibold truncate">{currentTrack.title}</p>
                <p className="text-[#666666] text-xs truncate">{currentTrack.artist}</p>
              </div>
              <button onClick={() => toggleLike(currentTrack.id)}
                className={`flex-shrink-0 p-2 rounded-full hover:bg-black/5 transition-colors ${currentTrack.isLiked ? 'text-[#e91e63]' : 'text-[#666666] hover:text-[#1a1a1a]'}`}>
                <Heart size={16} fill={currentTrack.isLiked ? 'currentColor' : 'none'} />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded bg-[#f5f5f5] flex items-center justify-center">
                <Music2 size={20} className="text-[#999999]" />
              </div>
              <div>
                <p className="text-[#999999] text-sm">Sin reproducción</p>
                <p className="text-[#bbbbbb] text-xs">Selecciona una canción</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col items-center gap-2 max-w-[45%]">
          <div className="flex items-center gap-4">
            <button onClick={toggleShuffle}
              className={`p-2 rounded-full transition-colors relative ${shuffle ? 'text-[#e91e63]' : 'text-[#666666] hover:text-[#1a1a1a]'}`} title="Aleatorio (S)">
              <Shuffle size={18} />
              {shuffle && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#e91e63] rounded-full" />}
            </button>
            <button onClick={previous} className="p-2 text-[#666666] hover:text-[#1a1a1a] transition-colors" title="Anterior (P)">
              <SkipBack size={22} fill="currentColor" />
            </button>
            <button onClick={togglePlay} disabled={!currentTrack}
              className="w-10 h-10 bg-[#e91e63] rounded-full flex items-center justify-center hover:scale-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg" title="Play/Pause (Space)">
              {isPlaying ? <Pause size={18} fill="white" className="text-white" /> : <Play size={18} fill="white" className="text-white ml-0.5" />}
            </button>
            <button onClick={next} className="p-2 text-[#666666] hover:text-[#1a1a1a] transition-colors" title="Siguiente (N)">
              <SkipForward size={22} fill="currentColor" />
            </button>
            <button onClick={cycleRepeat}
              className={`p-2 rounded-full transition-colors relative ${repeat > 0 ? 'text-[#e91e63]' : 'text-[#666666] hover:text-[#1a1a1a]'}`} title="Repetir">
              {repeat === 2 ? <Repeat1 size={18} /> : <Repeat size={18} />}
              {repeat > 0 && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#e91e63] rounded-full" />}
            </button>
          </div>
          <div className="w-full flex items-center gap-2">
            <span className="text-[#666666] text-xs w-10 text-right tabular-nums">{formatDuration(currentTime)}</span>
            <div className="flex-1 relative group">
              <input type="range" min={0} max={duration || 0} value={currentTime} onChange={handleSeek} disabled={!currentTrack}
                className="w-full h-1 appearance-none bg-[#e0e0e0] rounded-full cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#e91e63] [&::-webkit-slider-thumb]:opacity-0
                  group-hover:[&::-webkit-slider-thumb]:opacity-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: `linear-gradient(to right, ${currentTrack ? '#e91e63' : '#e0e0e0'} ${progress}%, #e0e0e0 ${progress}%)` }} />
            </div>
            <span className="text-[#666666] text-xs w-10 tabular-nums">{formatDuration(duration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 w-[25%] justify-end">
          <button onClick={() => setShowQueue(!showQueue)}
            className={`p-2 rounded-full transition-colors ${showQueue ? 'text-[#e91e63]' : 'text-[#666666] hover:text-[#1a1a1a]'}`} title="Cola de reproducción">
            <ListMusic size={18} />
          </button>
        </div>
      </div>

      {/* MOBILE COLLAPSED */}
      <div className="md:hidden h-14 bg-white relative flex items-center px-3 gap-2 flex-shrink-0 rounded-2xl overflow-hidden mx-4 mb-[5px] shadow-lg shadow-black/10 border border-black/5">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#e0e0e0]">
          <div className="h-full bg-[#e91e63] transition-all" style={{ width: `${progress}%` }} />
        </div>
        {currentTrack ? (
          <>
            <div className="flex-shrink-0 w-10 h-10 rounded overflow-hidden shadow-lg">{coverArt(16)}</div>
            <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setExpanded(true)}>
              <p className="text-[#1a1a1a] text-xs font-semibold truncate leading-tight">{currentTrack.title}</p>
              <p className="text-[#666666] text-[10px] truncate leading-tight">{currentTrack.artist}</p>
            </div>
            <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} disabled={!currentTrack}
              className="w-11 h-11 bg-[#e91e63] rounded-full flex items-center justify-center flex-shrink-0 shadow-lg disabled:opacity-40">
              {isPlaying ? <Pause size={16} fill="white" className="text-white" /> : <Play size={16} fill="white" className="text-white ml-0.5" />}
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2 px-1">
            <div className="w-9 h-9 rounded bg-[#f5f5f5] flex items-center justify-center flex-shrink-0">
              <Music2 size={16} className="text-[#999999]" />
            </div>
            <p className="text-[#999999] text-xs">Sin reproducción</p>
          </div>
        )}
      </div>

      {/* MOBILE EXPANDED */}
      {expanded && (
        <div className="fixed inset-0 z-[100] md:hidden" onClick={() => setExpanded(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute left-4 right-4 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))]">
            <div className="bg-white rounded-2xl animate-[slideUp_0.25s_ease-out] px-4 pt-3 pb-6 shadow-lg shadow-black/10 border border-black/5" onClick={(e) => e.stopPropagation()}>
              <div className="w-9 h-1 bg-black/20 rounded-full mx-auto mb-4" />
              {currentTrack ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex-shrink-0 w-14 h-14 rounded overflow-hidden shadow-lg">{coverArt(20)}</div>
                      <div className="min-w-0">
                        <p className="text-[#1a1a1a] text-sm font-semibold truncate">{currentTrack.title}</p>
                        <p className="text-[#666666] text-xs truncate">{currentTrack.artist}</p>
                      </div>
                    </div>
                    <button onClick={() => toggleLike(currentTrack.id)} className="flex-shrink-0 p-2 ml-2">
                      <Heart size={18} fill={currentTrack.isLiked ? 'currentColor' : 'none'}
                        className={currentTrack.isLiked ? 'text-[#e91e63]' : 'text-[#666666]'} />
                    </button>
                  </div>
                  <div className="w-full flex items-center gap-2 mb-4">
                    <span className="text-[#666666] text-xs w-10 text-right tabular-nums">{formatDuration(currentTime)}</span>
                    <div className="flex-1 relative">
                      <input type="range" min={0} max={duration || 0} value={currentTime} onChange={handleSeek} disabled={!currentTrack}
                        className="w-full h-1 appearance-none bg-[#e0e0e0] rounded-full cursor-pointer
                          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#e91e63] disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ background: `linear-gradient(to right, ${currentTrack ? '#e91e63' : '#e0e0e0'} ${progress}%, #e0e0e0 ${progress}%)` }} />
                    </div>
                    <span className="text-[#666666] text-xs w-10 tabular-nums">{formatDuration(duration)}</span>
                  </div>
                  <div className="flex items-center justify-center gap-4 mb-3">
                    <button onClick={toggleShuffle} className={`p-1.5 rounded-full transition-colors ${shuffle ? 'text-[#e91e63]' : 'text-[#666666]'}`}>
                      <Shuffle size={18} />
                    </button>
                    <button onClick={previous} className="p-1.5 text-[#666666] transition-colors">
                      <SkipBack size={22} fill="currentColor" />
                    </button>
                    <button onClick={togglePlay} disabled={!currentTrack}
                      className="w-11 h-11 bg-[#e91e63] rounded-full flex items-center justify-center shadow-lg disabled:opacity-40">
                      {isPlaying ? <Pause size={20} fill="white" className="text-white" /> : <Play size={20} fill="white" className="text-white ml-0.5" />}
                    </button>
                    <button onClick={next} className="p-1.5 text-[#666666] transition-colors">
                      <SkipForward size={22} fill="currentColor" />
                    </button>
                    <button onClick={cycleRepeat} className={`p-1.5 rounded-full transition-colors ${repeat > 0 ? 'text-[#e91e63]' : 'text-[#666666]'}`}>
                      {repeat === 2 ? <Repeat1 size={18} /> : <Repeat size={18} />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div />
                    <button onClick={() => { setShowQueue(!showQueue); setExpanded(false); }}
                      className={`p-2 rounded-full transition-colors ${showQueue ? 'text-[#e91e63]' : 'text-[#666666]'}`}>
                      <ListMusic size={18} />
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center py-6">
                  <Music2 size={32} className="text-[#999999] mb-3" />
                  <p className="text-[#999999] text-sm">Sin reproducción</p>
                  <p className="text-[#bbbbbb] text-xs">Selecciona una canción</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
