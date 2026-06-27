import { useRef, useCallback } from 'react';

export function useLongPress(
  onLongPress: (e: React.TouchEvent | React.MouseEvent) => void,
  onClick?: (e: React.TouchEvent | React.MouseEvent) => void,
  delay = 500
) {
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const start = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    timer.current = setTimeout(() => {
      onLongPress(e);
    }, delay);
  }, [onLongPress, delay]);

  const end = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = undefined;
    }
  }, []);

  const handlers = {
    onTouchStart: start,
    onTouchEnd: end,
    onTouchMove: end,
    onClick,
  };

  return handlers;
}
