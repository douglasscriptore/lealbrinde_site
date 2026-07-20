"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

type AmbientProductionVideoProps = {
  className: string;
  label: string;
  poster: string;
  src: string;
};

export function AmbientProductionVideo({
  className,
  label,
  poster,
  src,
}: AmbientProductionVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    if (shouldReduceMotion) {
      video.pause();
      video.currentTime = 0;
      return;
    }

    void video.play().catch(() => {
      // O pôster continua visível quando o navegador bloqueia a reprodução automática.
    });
  }, [shouldReduceMotion]);

  return (
    <video
      ref={videoRef}
      aria-label={label}
      autoPlay={!shouldReduceMotion}
      className={className}
      disablePictureInPicture
      loop={!shouldReduceMotion}
      muted
      playsInline
      poster={poster}
      preload="metadata"
      tabIndex={-1}
    >
      <source src={src} type="video/mp4" />
      Seu navegador não consegue reproduzir este vídeo.
    </video>
  );
}
