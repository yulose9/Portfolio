"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import type { Entry } from "../../site-content";

type Card = NonNullable<Entry["card"]>;

export const loadTiltedCard = () => import("./TiltedCard");
const TiltedCard = dynamic(loadTiltedCard, { ssr: false });

/**
 * A business card that materialises beside the column.
 *
 * Same strip and same hover rules as the ID badge (see ShowcaseProvider), but
 * a different entrance: no fall, it condenses out of thin air (blur to sharp,
 * a little small to full size, rising a few pixels) and then floats. Once up
 * it is Tilted Card proper: it leans toward the pointer with a moving glare,
 * and a click flips it to the back. Every appearance starts on the front,
 * because the card is remounted fresh each time it comes up.
 *
 * Sized by --card-w (globals.css), 7:4 like a real 3.5×2 in card.
 */
export default function BusinessCardStage({
  card,
  shown,
  onEnter,
  onLeave,
}: {
  card: Card;
  shown: boolean;
  onEnter: () => void;
  onLeave: () => void;
}) {
  // Always paint the hidden state first, so even the first hover dissolves in.
  const [painted, setPainted] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => setPainted(true))
    );
    return () => cancelAnimationFrame(frame);
  }, []);

  const up = shown && painted;
  const [appearance, setAppearance] = useState(0);
  const [wasUp, setWasUp] = useState(false);
  if (up !== wasUp) {
    setWasUp(up);
    if (up) setAppearance(appearance + 1);
  }

  // Portalled to <body> for the same reason as the badge: the tab panels
  // animate with transforms, which would trap a fixed element inside them.
  return createPortal(
    <div
      aria-hidden={!up}
      className={`card-stage fixed right-0 top-0 z-30 flex h-dvh items-center justify-center ${
        up ? "is-shown" : ""
      }`}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
    >
      <div className="card-stage__body">
        <TiltedCard
          key={appearance}
          imageSrc={card.front}
          altText="Archicoders business card"
          showTooltip={false}
          containerWidth="calc(var(--card-w) + 3rem)"
          containerHeight="calc(var(--card-w) * 4 / 7 + 3rem)"
          imageWidth="var(--card-w)"
          imageHeight="calc(var(--card-w) * 4 / 7)"
          radius={12}
          rotateAmplitude={12}
          scaleOnHover={1.05}
          glare={0.35}
          shadow={0.45}
          floating={up}
          gyroscope={false}
          intro={false}
          backContent={
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.back}
              alt=""
              draggable={false}
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            />
          }
        />
      </div>
    </div>,
    document.body
  );
}
