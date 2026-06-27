import { useRef, useState, useCallback } from 'react';
import { X, Upload, Music, CheckCircle, AlertCircle, Loader, FolderOpen, Folder } from 'lucide-react';
import { usePlayerStore } from '../store/playerStore';
import { parseAudioFile } from '../lib/metadataParser';

const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aac', '.opus', '.wma'];

function isAudioFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return AUDIO_EXTENSIONS.some(ext => name.endsWith(ext));
}

interface UploadState {
  status: 'idle' | 'processing' | 'done' | 'error';
  total: number;
  current: number;
  currentFile: string;
  error?: string;
}

const FILE_PICKER_ACCEPT: FilePickerAcceptType[] = [{
  description: 'Archivos de audio',
  accept: { 'audio/*': ['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aac', '.opus', '.wma'] },
}];

export default function FileSelectorModal() {
  const { setShowUploadModal, addLocalTracks } = usePlayerStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    total: 0,
    current: 0,
    currentFile: '',
  });

  const processFiles = useCallback(async (files: File[], handles?: FileSystemFileHandle[]) => {
    const audioFiles = files.filter(isAudioFile);
    if (audioFiles.length === 0) {
      setUploadState({ status: 'error', total: 0, current: 0, currentFile: '', error: 'No se encontraron archivos de audio válidos.' });
      return;
    }

    setUploadState({ status: 'processing', total: audioFiles.length, current: 0, currentFile: '' });

    const items: { track: import('../types').Track; file: File; handle?: FileSystemFileHandle }[] = [];

    for (let i = 0; i < audioFiles.length; i++) {
      const file = audioFiles[i];
      setUploadState(s => ({ ...s, current: i + 1, currentFile: file.name }));
      try {
        const { track } = await parseAudioFile(file);
        const localTrack = { ...track, isLocal: true };
        items.push({
          track: localTrack,
          file,
          handle: handles?.[i],
        });
      } catch (err) {
        console.error('Error parsing file:', file.name, err);
      }
    }

    if (items.length === 0) {
      setUploadState({ status: 'error', total: 0, current: 0, currentFile: '', error: 'No se pudieron leer los archivos de audio.' });
      return;
    }

    try {
      await addLocalTracks(items);
    } catch (err) {
      console.error('Error saving tracks:', err);
      setUploadState({ status: 'error', total: 0, current: 0, currentFile: '', error: 'Error al guardar las canciones en la biblioteca.' });
      return;
    }

    setUploadState(s => ({ ...s, status: 'done', current: audioFiles.length }));
    setTimeout(() => setShowUploadModal(false), 1500);
  }, [addLocalTracks, setShowUploadModal]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  };

  const handleFilePickerAPI = async () => {
    try {
      if (!('showOpenFilePicker' in window)) {
        fileInputRef.current?.click();
        return;
      }
      const pickerHandles = await (window as any).showOpenFilePicker({
        multiple: true,
        types: FILE_PICKER_ACCEPT,
      });
      const files: File[] = [];
      for (const handle of pickerHandles) {
        const file = await handle.getFile();
        files.push(file);
      }
      await processFiles(files, pickerHandles);
    } catch (err: any) {
      if (err.name === 'AbortError' || err.name === 'SecurityError') return;
      console.error('File picker API error:', err);
      fileInputRef.current?.click();
    }
  };

  const progress = uploadState.total > 0 ? (uploadState.current / uploadState.total) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-black/10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-black/10">
          <h2 className="text-main font-bold text-xl">Añadir Música Local</h2>
          <button
            onClick={() => setShowUploadModal(false)}
            className="p-2 rounded-full hover:bg-black/5 transition-colors text-muted hover:text-main"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {uploadState.status === 'idle' || uploadState.status === 'error' ? (
            <>
              {/* Current folder indicator */}
              {usePlayerStore.getState().directoryPath && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent-surface text-sm text-main border border-accent/20">
                  <Folder size={16} className="text-accent flex-shrink-0" />
                  <span className="flex-1 truncate">{usePlayerStore.getState().directoryPath}</span>
                  <span className="text-accent text-xs font-semibold flex-shrink-0">Sincronizada</span>
                </div>
              )}

              {/* Folder Picker (Android Chrome) */}
              <button
                onClick={() => { usePlayerStore.getState().pickMusicFolder(); setShowUploadModal(false); }}
                className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-accent to-accent-light transition-all text-white font-bold text-lg flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
              >
                <Folder size={24} />
                Seleccionar carpeta de música
              </button>

              <p className="text-xs text-subtle text-center -mt-2">
                Android pedirá permiso para acceder a los archivos. Solo se guardan los metadatos, la música se reproduce directamente desde tu disco.
              </p>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-black/10" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-subtle">o elige archivos individuales</span>
                </div>
              </div>

              {/* File System API Button */}
              <button
                onClick={handleFilePickerAPI}
                className="w-full py-3 px-6 rounded-xl bg-surface hover:bg-accent-surface transition-colors text-main font-semibold text-base flex items-center justify-center gap-3 border border-black/10"
              >
                <FolderOpen size={20} />
                Seleccionar archivos
              </button>

              {/* Drop Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`
                  relative border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer
                  ${isDragging
                    ? 'border-accent bg-accent/10'
                    : 'border-black/20 hover:border-black/40 hover:bg-black/5'
                  }
                `}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className={`p-4 rounded-full transition-colors ${isDragging ? 'bg-accent/20' : 'bg-black/5'}`}>
                    <Upload size={32} className={isDragging ? 'text-accent' : 'text-muted'} />
                  </div>
                  <div>
                    <p className="text-main font-semibold text-lg">Arrastra tus archivos aquí</p>
                    <p className="text-muted text-sm mt-1">o haz clic para seleccionar</p>
                  </div>
                  <p className="text-xs text-subtle">MP3, FLAC, WAV, M4A, OGG, AAC y más</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="audio/*,.mp3,.flac,.wav,.m4a,.ogg,.aac,.opus"
                  className="hidden"
                  onChange={handleFileInput}
                />
              </div>

              {uploadState.status === 'error' && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
                  <p className="text-red-400 text-sm">{uploadState.error}</p>
                </div>
              )}

              <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/10 border border-accent/20">
                <Music size={16} className="text-accent flex-shrink-0 mt-0.5" />
                <div className="text-xs text-muted">
                  <p className="font-medium text-accent mb-1">Sin copia al navegador</p>
                  <p>La música se reproduce directamente desde tu disco. Solo se guardan los metadatos (título, artista, carátula) para organizar tus playlists.</p>
                  <p className="mt-1">Al elegir una carpeta, la app se sincroniza automáticamente: las canciones nuevas aparecen solas y las eliminadas desaparecen.</p>
                </div>
              </div>
            </>
          ) : uploadState.status === 'processing' ? (
            <div className="py-8 space-y-6">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <Loader size={48} className="text-accent animate-spin" />
                </div>
                <p className="text-main font-semibold text-lg">Procesando música...</p>
                <p className="text-muted text-sm text-center truncate max-w-xs">{uploadState.currentFile}</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted">
                  <span>{uploadState.current} de {uploadState.total} canciones</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-black/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 flex flex-col items-center gap-4">
              <CheckCircle size={56} className="text-accent" />
              <p className="text-main font-bold text-xl">¡Música añadida!</p>
              <p className="text-muted text-sm">{uploadState.total} canciones importadas correctamente</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
