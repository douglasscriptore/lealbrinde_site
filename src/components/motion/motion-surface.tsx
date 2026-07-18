"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

type MotionSurfaceProps = {
  children: ReactNode;
  className?: string;
  lift?: number;
};

export function MotionSurface({
  children,
  className,
  lift = 4,
}: MotionSurfaceProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      whileHover={shouldReduceMotion ? undefined : { y: -lift }}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.99 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
    >
      {children}
    </motion.div>
  );
}
