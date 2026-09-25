"use client";

import { Microphone, Stop } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

import { formatDuration } from "../../../cms/media";
import Sheet from "./Sheet";

/*
 * Record a voice note without leaving the post: the microphone's level as
 * live bars, a running time, then listen back before adding it. The take is
 * handed on as recorded; the uploader compresses it to AAC like any audio.
 */

const MIME = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"].find(
  (t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)
);

export default function VoiceRecorder({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (blob: Blob) => void }) {
  const [state, setState] = useState<"idle" | "recording" | "done" | "error">("idle");
  const [seconds, setSeconds] = useState(0);
  const [take, setTake] = useState<Blob | null>(null);
  const [error, setError] = useState("");
  const levels = useRef<HTMLDivElement>(null);
  const rec = useRef<{ recorder: MediaRecorder; stream: MediaStream; ctx: AudioContext; frame: number; timer: number } | null>(null);

  const stopAll = () => {
    const r = rec.current;
    if (!r) return;
    cancelAnimationFrame(r.frame);
    window.clearInterval(r.timer);
    r.stream.getTracks().forEach((t) => t.stop());
    void r.ctx.close();
    rec.current = null;
  };
  useEffect(() => () => stopAll(), []);

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setState("idle");
      setSeconds(0);
      setTake(null);
    }
  }

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const recorder = new MediaRecorder(stream, MIME ? { mimeType: MIME } : undefined);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      recorder.onstop = () => {
        setTake(new Blob(chunks, { type: recorder.mimeType || MIME || "audio/webm" }));
        setState("done");
      };
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const draw = () => {
        analyser.getByteTimeDomainData(data);
        let peak = 0;
        for (const v of data) peak = Math.max(peak, Math.abs(v - 128) / 128);
        const bars = levels.current?.children;
        if (bars) {
          // Scroll the bars left, newest level on the right.
          for (let i = 0; i < bars.length - 1; i++) (bars[i] as HTMLElement).style.height = (bars[i + 1] as HTMLElement).style.height;
          (bars[bars.length - 1] as HTMLElement).style.height = `${Math.max(6, Math.min(100, peak * 180))}%`;
        }
        if (rec.current) rec.current.frame = requestAnimationFrame(draw);
      };
      const began = Date.now();
      const timer = window.setInterval(() => setSeconds((Date.now() - began) / 1000), 200);
      rec.current = { recorder, stream, ctx, frame: requestAnimationFrame(draw), timer };
      recorder.start(250);
      setState("recording");
    } catch {
      setError("The microphone isn't available. Allow it for this site in the browser's settings.");
      setState("error");
    }
  };

  const stop = () => {
    rec.current?.recorder.stop();
    stopAll();
  };

  return (
    <Sheet
      open={open}
      onClose={() => {
        stop();
        onClose();
      }}
      title="Voice note"
      description="Recorded here, compressed before it uploads."
      variant="center"
    >
      <div className="recorder" data-state={state}>
        <div ref={levels} className="recorder-levels" aria-hidden="true">
          {Array.from({ length: 40 }, (_, i) => (
            <span key={i} style={{ height: "6%" }} />
          ))}
        </div>
        <p className="recorder-time" aria-live="polite">
          {formatDuration(seconds)}
        </p>
        {state === "error" ? <p className="field-help" data-tone="warn">{error}</p> : null}
        {state === "done" && take ? <audio className="recorder-preview" src={URL.createObjectURL(take)} controls /> : null}
        <div className="publish-actions">
          {state === "recording" ? (
            <button type="button" className="admin-button admin-button-primary recorder-stop" onClick={stop}>
              <Stop size={14} weight="fill" /> Stop
            </button>
          ) : (
            <button type="button" className="admin-button recorder-start" onClick={start}>
              <Microphone size={14} weight="fill" /> {state === "done" ? "Record again" : "Record"}
            </button>
          )}
          <button
            type="button"
            className="admin-button admin-button-primary"
            disabled={state !== "done" || !take}
            onClick={() => {
              if (take) onDone(take);
              onClose();
            }}
          >
            Add to post
          </button>
        </div>
      </div>
    </Sheet>
  );
}
