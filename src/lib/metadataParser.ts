import { Track } from '../types';

function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Native ID3v2 parser (browser-compatible, no external deps)
interface ID3Tags {
  title?: string;
  artist?: string;
  album?: string;
  year?: string;
  genre?: string;
  track?: string;
  cover?: { data: Uint8Array; mime: string };
}

function decodeString(bytes: Uint8Array, encoding: number): string {
  try {
    if (encoding === 0) {
      // Muchos archivos marcan encoding=0 (ISO-8859-1) pero usan UTF-8
      try {
        return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      } catch {
        return new TextDecoder('iso-8859-1').decode(bytes);
      }
    }
    if (encoding === 1 || encoding === 2) {
      // UTF-16 with BOM
      return new TextDecoder('utf-16').decode(bytes);
    }
    if (encoding === 3) return new TextDecoder('utf-8').decode(bytes);
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  }
}

function readSyncsafeInt(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] & 0x7f) << 21) |
    ((bytes[offset + 1] & 0x7f) << 14) |
    ((bytes[offset + 2] & 0x7f) << 7) |
    (bytes[offset + 3] & 0x7f);
}

function parseID3v2(buffer: ArrayBuffer): ID3Tags {
  const tags: ID3Tags = {};
  const bytes = new Uint8Array(buffer);

  // Check ID3v2 header
  if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) return tags; // 'ID3'

  const version = bytes[3];
  const tagSize = readSyncsafeInt(bytes, 6);
  let offset = 10;
  const end = offset + tagSize;

  while (offset < end && offset < bytes.length - 10) {
    // Read frame header
    let frameId: string;
    let frameSize: number;

    if (version < 3) {
      // ID3v2.2: 3-byte frame IDs
      frameId = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2]);
      frameSize = (bytes[offset + 3] << 16) | (bytes[offset + 4] << 8) | bytes[offset + 5];
      offset += 6;
    } else {
      // ID3v2.3/v2.4: 4-byte frame IDs
      frameId = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
      frameSize = version === 4
        ? readSyncsafeInt(bytes, offset + 4)
        : (bytes[offset + 4] << 24) | (bytes[offset + 5] << 16) | (bytes[offset + 6] << 8) | bytes[offset + 7];
      offset += 10;
    }

    if (frameSize <= 0 || frameId === '\0\0\0\0') break;
    if (offset + frameSize > bytes.length) break;

    const frameData = bytes.slice(offset, offset + frameSize);

    // Text frames
    if (frameId === 'TIT2' || frameId === 'TT2') {
      tags.title = decodeString(frameData.slice(1), frameData[0]).replace(/\0/g, '').trim();
    } else if (frameId === 'TPE1' || frameId === 'TP1') {
      tags.artist = decodeString(frameData.slice(1), frameData[0]).replace(/\0/g, '').trim();
    } else if (frameId === 'TALB' || frameId === 'TAL') {
      tags.album = decodeString(frameData.slice(1), frameData[0]).replace(/\0/g, '').trim();
    } else if (frameId === 'TYER' || frameId === 'TYE' || frameId === 'TDRC') {
      tags.year = decodeString(frameData.slice(1), frameData[0]).replace(/\0/g, '').trim().slice(0, 4);
    } else if (frameId === 'TCON' || frameId === 'TCO') {
      let genre = decodeString(frameData.slice(1), frameData[0]).replace(/\0/g, '').trim();
      // Strip ID3v1 genre number like "(17)"
      genre = genre.replace(/^\((\d+)\).*/, '$1');
      tags.genre = genre;
    } else if (frameId === 'TRCK' || frameId === 'TRK') {
      tags.track = decodeString(frameData.slice(1), frameData[0]).replace(/\0/g, '').split('/')[0].trim();
    } else if (frameId === 'APIC' || frameId === 'PIC') {
      // Picture frame
      try {
        let i = 1; // skip encoding byte
        // MIME type (null-terminated)
        let mimeEnd = i;
        while (mimeEnd < frameData.length && frameData[mimeEnd] !== 0) mimeEnd++;
        const mime = new TextDecoder('ascii').decode(frameData.slice(i, mimeEnd)) || 'image/jpeg';
        i = mimeEnd + 1;
        i++; // skip picture type byte
        // Description (null-terminated, may be double-null for UTF-16)
        while (i < frameData.length && frameData[i] !== 0) i++;
        i++; // skip null
        // Extra null for UTF-16
        if (i < frameData.length && frameData[i] === 0) i++;
        const imageData = frameData.slice(i);
        if (imageData.length > 0) {
          tags.cover = { data: imageData, mime };
        }
      } catch { /* ignore */ }
    }

    offset += frameSize;
  }

  return tags;
}

// --- FLAC / Vorbis Comments Parser ---

function readUint32LE(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24);
}

function readUint32BE(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
}

function findByte(bytes: Uint8Array, b: number): number {
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === b) return i;
  }
  return -1;
}

function parsePictureBlock(data: Uint8Array): { data: Uint8Array; mime: string } | null {
  if (data.length < 8) return null;
  let pos = 0;

  // picture_type (uint32 BE) — skip
  pos += 4;

  const mimeLen = readUint32BE(data, pos); pos += 4;
  if (pos + mimeLen > data.length) return null;
  const mime = new TextDecoder('ascii').decode(data.slice(pos, pos + mimeLen));
  pos += mimeLen;

  const descLen = readUint32BE(data, pos); pos += 4;
  pos += descLen; // skip description

  pos += 4; // skip width
  pos += 4; // skip height
  pos += 4; // skip color_depth
  pos += 4; // skip colors_used

  const picLen = readUint32BE(data, pos); pos += 4;
  if (pos + picLen > data.length) return null;
  const picData = data.slice(pos, pos + picLen);
  if (picData.length === 0) return null;

  return { data: picData, mime };
}

function parseFLACTags(buffer: ArrayBuffer): ID3Tags {
  const tags: ID3Tags = {};
  const bytes = new Uint8Array(buffer);

  // FLAC marker: 'fLaC'
  if (bytes[0] !== 0x66 || bytes[1] !== 0x4C || bytes[2] !== 0x61 || bytes[3] !== 0x43) return tags;

  let offset = 4;

  while (offset < bytes.length - 4) {
    const header = bytes[offset];
    const isLast = (header & 0x80) !== 0;
    const blockType = header & 0x7F;
    const blockLength = (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
    offset += 4;

    if (offset + blockLength > bytes.length) break;
    const blockData = bytes.slice(offset, offset + blockLength);

    if (blockType === 4) {
      // VORBIS_COMMENT
      let pos = 0;

      const vendorLen = readUint32LE(blockData, pos); pos += 4;
      pos += vendorLen; // skip vendor string

      const numComments = readUint32LE(blockData, pos); pos += 4;

      for (let i = 0; i < numComments && pos + 4 <= blockData.length; i++) {
        const commentLen = readUint32LE(blockData, pos); pos += 4;
        if (pos + commentLen > blockData.length) break;

        const commentBytes = blockData.slice(pos, pos + commentLen);
        pos += commentLen;

        const eqIdx = findByte(commentBytes, 0x3D); // '='
        if (eqIdx === -1) continue;

        const keyBytes = commentBytes.slice(0, eqIdx);
        const valueBytes = commentBytes.slice(eqIdx + 1);
        const key = new TextDecoder('ascii').decode(keyBytes).toUpperCase();

        if (key === 'METADATA_BLOCK_PICTURE') {
          // Picture stored as binary inside Vorbis comment
          const pic = parsePictureBlock(valueBytes);
          if (pic) tags.cover = pic;
        } else {
          const value = new TextDecoder('utf-8').decode(valueBytes);
          switch (key) {
            case 'TITLE': tags.title = value; break;
            case 'ARTIST': tags.artist = value; break;
            case 'ALBUM': tags.album = value; break;
            case 'DATE': tags.year = value.slice(0, 4); break;
            case 'GENRE': tags.genre = value; break;
            case 'TRACKNUMBER': tags.track = value.split('/')[0].trim(); break;
          }
        }
      }
    } else if (blockType === 6) {
      // METADATA_BLOCK_PICTURE (FLAC native picture block)
      const pic = parsePictureBlock(blockData);
      if (pic) tags.cover = pic;
    }

    offset += blockLength;
    if (isLast) break;
  }

  return tags;
}

async function readFileTags(file: File): Promise<ID3Tags> {
  try {
    const blob = file.slice(0, 512 * 1024);
    const buffer = await blob.arrayBuffer();

    // Try ID3v2 first (MP3 and other formats with ID3 headers)
    const id3 = parseID3v2(buffer);
    if (id3.title || id3.artist || id3.album) return id3;

    // Try FLAC Vorbis comments
    const flac = parseFLACTags(buffer);
    if (flac.title || flac.artist || flac.album) return flac;

    return id3;
  } catch {
    return {};
  }
}

function imageToDataUrl(data: Uint8Array, mime: string): string {
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

async function readID3Tags(file: File): Promise<ID3Tags> {
  try {
    // Read first 512KB which should be enough for headers
    const blob = file.slice(0, 512 * 1024);
    const buffer = await blob.arrayBuffer();
    return parseID3v2(buffer);
  } catch {
    return {};
  }
}

function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.addEventListener('loadedmetadata', () => {
      resolve(isFinite(audio.duration) ? audio.duration : 0);
      URL.revokeObjectURL(url);
    });
    audio.addEventListener('error', () => {
      resolve(0);
      URL.revokeObjectURL(url);
    });
    audio.preload = 'metadata';
    audio.src = url;
  });
}

export function cleanFileName(name: string): string {
  return name.replace(/\.[^/.]+$/, '').replace(/^\d+[\s.\-_]+/, '').trim();
}

const PLAYLIST_COLORS = [
  '#1db954', '#e91e63', '#9c27b0', '#2196f3', '#ff5722',
  '#ff9800', '#00bcd4', '#4caf50', '#f44336', '#673ab7',
];

export function getPlaylistColor(index: number): string {
  return PLAYLIST_COLORS[index % PLAYLIST_COLORS.length];
}

export async function parseAudioFile(
  file: File,
  playlistId?: string
): Promise<{ track: Track; blob: Blob }> {
  const [tags, duration] = await Promise.all([
    readFileTags(file),
    getAudioDuration(file),
  ]);

  const cleanedName = cleanFileName(file.name);
  const coverUrl = tags.cover ? imageToDataUrl(tags.cover.data, tags.cover.mime) : undefined;

  const track: Track = {
    id: generateId(),
    title: tags.title || cleanedName,
    artist: tags.artist || 'Artista Desconocido',
    album: tags.album || 'Álbum Desconocido',
    duration,
    year: tags.year ? parseInt(tags.year, 10) : undefined,
    genre: tags.genre,
    trackNumber: tags.track ? parseInt(tags.track, 10) : undefined,
    coverUrl,
    fileSize: file.size,
    playCount: 0,
    isLiked: false,
    addedAt: Date.now(),
    playlistId,
  };

  return { track, blob: file };
}

export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
