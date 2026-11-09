"use client";

import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Minus, Plus, X, ArrowsIn, CaretLeft, CaretRight } from "@phosphor-icons/react";
import { MiniMap, TransformComponent, TransformWrapper, useControls, useTransformComponent } from "react-zoom-pan-pinch";

function Controls({ onClose, next, previous, multiple, viewport }: { onClose: () => void; next: () => void; previous: () => void; multiple: boolean; viewport: Window }) {
  const { zoomIn, zoomOut, resetTransform, setTransform, instance } = useControls();
  const duration = viewport.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 180;
  const percentage = useTransformComponent(({ state }) => <span className="image-viewer-scale">{Math.round(state.scale * 100)}%</span>);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const { scale, positionX, positionY } = instance.state;
      if (event.key === "+" || event.key === "=") zoomIn(.3, 0);
      else if (event.key === "-") zoomOut(.3, 0);
      else if (event.key === "0") resetTransform(0);
      else if (event.key.startsWith("Arrow")) {
        if (scale > 1) setTransform(positionX + (event.key === "ArrowLeft" ? 80 : event.key === "ArrowRight" ? -80 : 0), positionY + (event.key === "ArrowUp" ? 80 : event.key === "ArrowDown" ? -80 : 0), scale, 0);
        else if (event.key === "ArrowLeft") previous();
        else if (event.key === "ArrowRight") next();
      } else return;
      event.preventDefault();
    };
    viewport.addEventListener("keydown", keydown);
    return () => viewport.removeEventListener("keydown", keydown);
  }, [duration, instance, next, previous, resetTransform, setTransform, viewport, zoomIn, zoomOut]);
  return <div className="image-viewer-controls" aria-label="Image controls">
    {multiple && <button type="button" aria-label="Previous image" onClick={previous} data-sound="select"><CaretLeft size={19} /></button>}
    <button type="button" aria-label="Zoom out" onClick={() => zoomOut(.3, duration)} data-sound="click"><Minus size={19} /></button>
    {percentage}
    <button type="button" aria-label="Zoom in" onClick={() => zoomIn(.3, duration)} data-sound="click"><Plus size={19} /></button>
    <button type="button" aria-label="Fit image" onClick={() => resetTransform(duration)} data-sound="click"><ArrowsIn size={19} /></button>
    {multiple && <button type="button" aria-label="Next image" onClick={next} data-sound="select"><CaretRight size={19} /></button>}
    <button type="button" aria-label="Close image viewer" onClick={onClose} data-sound="click"><X size={19} /></button>
  </div>;
}

function Viewer({ images, start, dialog, onClose }: { images: HTMLImageElement[]; start: number; dialog: HTMLDialogElement; onClose: () => void }) {
  const [index, setIndex] = useState(start);
  const [size, setSize] = useState({ width: 1, height: 1 });
  const [failed, setFailed] = useState(false);
  const viewport = dialog.ownerDocument.defaultView!;
  const image = images[index];
  const stage = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const resize = () => {
      const width = image.naturalWidth || image.width || 1;
      const height = image.naturalHeight || image.height || 1;
      const fit = Math.min((stage.current?.clientWidth || viewport.innerWidth) / width, (stage.current?.clientHeight || viewport.innerHeight - 160) / height, 1);
      const next = { width: Math.max(1, width * fit), height: Math.max(1, height * fit) };
      setSize(previous => previous.width === next.width && previous.height === next.height ? previous : next);
    };
    resize();
    const observer = new ResizeObserver(resize);
    if (stage.current) observer.observe(stage.current);
    image.addEventListener("load", resize);
    return () => { observer.disconnect(); image.removeEventListener("load", resize); };
  }, [image, viewport, size.width, size.height]);
  const next = () => { setFailed(false); setIndex(i => (i + 1) % images.length); };
  const previous = () => { setFailed(false); setIndex(i => (i + images.length - 1) % images.length); };
  return <>
    <div className="image-viewer-heading"><p id="image-viewer-title">{image.alt || "Image"}</p><span aria-live="polite">{index + 1} / {images.length}</span></div>
    <TransformWrapper key={`${index}-${size.width}-${size.height}`} minScale={1} maxScale={8} centerOnInit centerZoomedOut wheel={{ step: .12 }} doubleClick={{ mode: "toggle", step: .8 }} zoomAnimation={{ disabled: viewport.matchMedia("(prefers-reduced-motion: reduce)").matches }}>
      <div ref={stage} className="image-viewer-stage">
        <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: size.width, height: size.height }}>
          {/* Full source loads only when this viewer opens. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.src} alt={image.alt} width={size.width} height={size.height} draggable={false} decoding="async" onError={() => setFailed(true)} />
        </TransformComponent>
        {failed && <p className="image-viewer-error" role="alert">This image couldn’t load. Close the viewer and try again.</p>}
      </div>
      <div className="image-viewer-map" aria-label="Image overview. The outline shows the visible area.">
        <MiniMap width={128} height={84} borderColor="var(--blue)" panning>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.currentSrc || image.src} alt="" style={{ width: size.width, height: size.height }} draggable={false} />
        </MiniMap>
      </div>
      <Controls onClose={onClose} next={next} previous={previous} multiple={images.length > 1} viewport={viewport} />
    </TransformWrapper>
    <p className="image-viewer-hint">Scroll or pinch to zoom · drag to explore · 0 to fit</p>
  </>;
}

/** Lazy loaded by both public pages and the iframe preview, in their own document. */
export function openImageViewer(image: HTMLImageElement, images: HTMLImageElement[], onClosed?: () => void) {
  const doc = image.ownerDocument;
  const dialog = doc.createElement("dialog");
  dialog.className = "image-viewer";
  dialog.setAttribute("aria-label", "Image viewer");
  dialog.setAttribute("aria-labelledby", "image-viewer-title");
  doc.body.append(dialog);
  const root = createRoot(dialog);
  const previousOverflow = doc.documentElement.style.overflow;
  doc.documentElement.style.overflow = "hidden";
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    const finish = () => {
      doc.documentElement.style.overflow = previousOverflow;
      dialog.close();
      root.unmount();
      dialog.remove();
      onClosed?.();
      if (image.isConnected) image.focus({ preventScroll: true });
    };
    if (doc.defaultView?.matchMedia("(prefers-reduced-motion: reduce)").matches) finish();
    else dialog.animate([{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(.99)" }], { duration: 140, easing: "ease-out", fill: "forwards" }).finished.then(finish, finish);
  };
  dialog.addEventListener("cancel", event => { event.preventDefault(); close(); });
  dialog.addEventListener("click", event => { if (event.target === dialog) close(); });
  root.render(<Viewer images={images} start={Math.max(0, images.indexOf(image))} dialog={dialog} onClose={close} />);
  dialog.showModal();
  return close;
}
