
import { useState, useEffect, useRef } from "react";

type SwipeDirection = "left" | "right" | "up" | "down" | null;
type TouchPosition = { x: number; y: number };

interface TouchGestureOptions {
  threshold?: number;
  onSwipe?: (direction: SwipeDirection) => void;
  onTap?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  doubleTapDelay?: number;
  longPressDelay?: number;
}

export function useTouchGestures({
  threshold = 50,
  onSwipe,
  onTap,
  onDoubleTap,
  onLongPress,
  doubleTapDelay = 300,
  longPressDelay = 500,
}: TouchGestureOptions = {}) {
  const [touchStart, setTouchStart] = useState<TouchPosition | null>(null);
  const [lastTap, setLastTap] = useState<number>(0);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const position = { x: touch.clientX, y: touch.clientY };
    setTouchStart(position);

    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        onLongPress();
        // Cancella il timer per evitare che venga attivato anche il tap
        longPressTimer.current = null;
      }, longPressDelay);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Se c'è un movimento, non si tratta di un longPress
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (!touchStart) return;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (!touchStart) return;

    const touch = e.changedTouches[0];
    const endPosition = { x: touch.clientX, y: touch.clientY };
    
    const deltaX = endPosition.x - touchStart.x;
    const deltaY = endPosition.y - touchStart.y;
    
    // Controllo se è un tap o uno swipe
    if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
      // È un tap
      const now = Date.now();
      if (onDoubleTap && now - lastTap < doubleTapDelay) {
        // Double tap detected
        onDoubleTap();
        setLastTap(0); // Reset after double tap
      } else {
        setLastTap(now);
        if (onTap) {
          onTap();
        }
      }
    } else if (onSwipe) {
      // Determina la direzione dello swipe
      let direction: SwipeDirection = null;
      
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Movimento orizzontale
        if (Math.abs(deltaX) >= threshold) {
          direction = deltaX > 0 ? "right" : "left";
        }
      } else {
        // Movimento verticale
        if (Math.abs(deltaY) >= threshold) {
          direction = deltaY > 0 ? "down" : "up";
        }
      }
      
      if (direction) {
        onSwipe(direction);
      }
    }
    
    setTouchStart(null);
  };

  const gestureHandlers = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onTouchCancel: () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      setTouchStart(null);
    }
  };

  return {
    gestureHandlers,
  };
}
