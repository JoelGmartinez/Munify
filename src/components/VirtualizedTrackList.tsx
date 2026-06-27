import { useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Track } from '../types';

interface Props {
  tracks: Track[];
  scrollRef: React.RefObject<HTMLDivElement | null>;
  renderRow: (track: Track, index: number) => React.ReactNode;
  rowHeight?: number;
  overscan?: number;
}

export default function VirtualizedTrackList({ tracks, scrollRef, renderRow, rowHeight = 64, overscan = 5 }: Props) {
  const virtualizer = useVirtualizer({
    count: tracks.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan,
  });

  useEffect(() => {
    virtualizer.measure();
  }, [tracks.length]);

  return (
    <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
      {virtualizer.getVirtualItems().map((virtualItem) => {
        const track = tracks[virtualItem.index];
        if (!track) return null;
        return (
          <div
            key={track.id}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: virtualItem.size,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderRow(track, virtualItem.index)}
          </div>
        );
      })}
    </div>
  );
}
