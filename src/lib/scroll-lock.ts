'use client';

import { useEffect } from 'react';

let activeLocks = 0;
let prevBodyOverflow = '';
let prevHtmlOverflow = '';
let prevPaddingRight = '';

export function lockBodyScroll(): void {
  if (typeof document === 'undefined') return;

  if (activeLocks === 0) {
    prevBodyOverflow = document.body.style.overflow;
    prevHtmlOverflow = document.documentElement.style.overflow;
    prevPaddingRight = document.body.style.paddingRight;

    // Prevent desktop layout shift when scrollbar vanishes
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  }

  activeLocks++;
}

export function unlockBodyScroll(): void {
  if (typeof document === 'undefined') return;

  activeLocks = Math.max(0, activeLocks - 1);

  if (activeLocks === 0) {
    document.body.style.overflow = prevBodyOverflow;
    document.documentElement.style.overflow = prevHtmlOverflow;
    document.body.style.paddingRight = prevPaddingRight;
  }
}

export function getActiveScrollLocks(): number {
  return activeLocks;
}

export function resetScrollLocks(): void {
  activeLocks = 0;
  if (typeof document !== 'undefined') {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    document.body.style.paddingRight = '';
  }
}

export function useBodyScrollLock(isLocked: boolean = true): void {
  useEffect(() => {
    if (!isLocked) return;
    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, [isLocked]);
}
