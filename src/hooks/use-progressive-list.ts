"use client";

import { useState, useEffect, useTransition, useRef } from "react";

/**
 * Progressive rendering hook for large lists.
 *
 * Renders the first `initialBatch` items immediately, then progressively
 * adds more items using React's `startTransition` to keep the UI responsive.
 *
 * @param items - Full list of items
 * @param initialBatch - How many to render immediately (default: 20)
 * @param batchSize - How many to add per frame (default: 20)
 */
export function useProgressiveList<T>(
  items: T[],
  initialBatch = 20,
  batchSize = 20,
): { visibleItems: T[]; isComplete: boolean } {
  const [visibleCount, setVisibleCount] = useState(initialBatch);
  const [, startTransition] = useTransition();
  const prevLengthRef = useRef(items.length);

  // Reset when items change significantly (e.g., filter applied)
  useEffect(() => {
    if (items.length !== prevLengthRef.current) {
      prevLengthRef.current = items.length;
      setVisibleCount(Math.min(initialBatch, items.length));
    }
  }, [items.length, initialBatch]);

  // Progressively reveal more items
  useEffect(() => {
    if (visibleCount >= items.length) return;

    const timer = setTimeout(() => {
      startTransition(() => {
        setVisibleCount((prev) => Math.min(prev + batchSize, items.length));
      });
    }, 50); // Small delay to let the UI settle between batches

    return () => clearTimeout(timer);
  }, [visibleCount, items.length, batchSize]);

  const visibleItems = items.slice(0, visibleCount);
  const isComplete = visibleCount >= items.length;

  return { visibleItems, isComplete };
}
