"use client";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { adjustBlock, snapMinute, type TimeBlock } from '@/lib/seneca/utils/horizon';
import { playSound } from '@/app/components/ui/sound';

type Mode = 'move' | 'start' | 'end' | 'new' | 'place';
type Session = { block: TimeBlock; mode: Mode; x: number; y: number; pointer: number };

/** Pointer capture keeps mouse, pen, and touch on the same commit/cancel path. */
export function useHorizonDrag(
  axis: RefObject<HTMLDivElement | null>,
  chart: RefObject<HTMLDivElement | null>,
  scroll: RefObject<HTMLDivElement | null>,
  onCommit: (block: TimeBlock) => void,
) {
  const [session, setSession] = useState<Session | null>(null);
  const [preview, setPreview] = useState<TimeBlock | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number; title: string } | null>(null);
  const suppressClick = useRef(false);
  const commit = useRef(onCommit);
  useEffect(() => { commit.current = onCommit; }, [onCommit]);

  useEffect(() => {
    if (!session) return;
    const initialRect = axis.current?.getBoundingClientRect();
    if (!initialRect) return;
    const initialScroll = scroll.current?.scrollLeft || 0;
    let lastX = session.x, lastY = session.y;
    let moved = false;
    let candidate: TimeBlock | null = null;
    const update = () => {
      const rect = axis.current?.getBoundingClientRect();
      const area = chart.current?.getBoundingClientRect();
      if (!rect || !area || !moved) return;
      let block: TimeBlock | null = null;
      if (session.mode === 'new' || session.mode === 'place') {
        if (lastX >= Math.max(rect.left, area.left) && lastX <= Math.min(rect.right, area.right) && lastY >= area.top && lastY <= area.bottom) {
          const start = Math.max(0, Math.min(1410, snapMinute((lastX - rect.left) / rect.width * 1440)));
          block = session.mode === 'place' ? adjustBlock(session.block, 'move', start - session.block.start) : { ...session.block, start, end: start + 30 };
        }
        setGhost({ x: lastX, y: lastY, title: session.block.title });
      } else {
        const delta = (lastX - session.x + (scroll.current?.scrollLeft || 0) - initialScroll) / initialRect.width * 1440;
        block = adjustBlock(session.block, session.mode, delta);
      }
      candidate = block;
      setPreview(block);
    };
    const move = (event: PointerEvent) => {
      if (event.pointerId !== session.pointer) return;
      lastX = event.clientX; lastY = event.clientY;
      if (Math.hypot(lastX - session.x, lastY - session.y) > 5) moved = true;
      if (moved) { event.preventDefault(); update(); }
    };
    const finish = (save: boolean) => {
      suppressClick.current = moved;
      if (save && moved && candidate) {
        commit.current(candidate);
        playSound('pop', { velocity: 0.5 });
      }
      setSession(null); setPreview(null); setGhost(null);
    };
    const up = (e: PointerEvent) => { if (e.pointerId === session.pointer) finish(true); };
    const cancel = () => finish(false);
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); cancel(); } };
    // Autoscroll continues while holding near an edge, even with a stationary pointer.
    const timer = window.setInterval(() => {
      if (!moved) return;
      const el = scroll.current, rect = el?.getBoundingClientRect();
      if (el && rect && lastY >= rect.top && lastY <= rect.bottom) {
        if (lastX > rect.right - 35) el.scrollLeft += 14;
        else if (lastX < rect.left + 165) el.scrollLeft -= 14;
      }
      if (lastY < 70) window.scrollBy(0, -12);
      else if (lastY > window.innerHeight - 80) window.scrollBy(0, 12);
      update();
    }, 32);
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('keydown', key);
    window.addEventListener('blur', cancel);
    return () => {
      clearInterval(timer);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('keydown', key);
      window.removeEventListener('blur', cancel);
    };
  }, [session, axis, chart, scroll]);

  function start(e: ReactPointerEvent<HTMLElement>, block: TimeBlock, mode: Mode) {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    suppressClick.current = false;
    setSession({ block, mode, x: e.clientX, y: e.clientY, pointer: e.pointerId });
  }
  return { start, preview, ghost, dragging: !!session, suppressClick };
}

