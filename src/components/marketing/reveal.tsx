"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  amount?: number;
  variant?: "fade-up" | "fade" | "scale";
};

const variants = {
  "fade-up": {
    initial: { opacity: 0, y: 18 },
    visible: { opacity: 1, y: 0 },
  },
  fade: {
    initial: { opacity: 0 },
    visible: { opacity: 1 },
  },
  scale: {
    initial: { opacity: 0, scale: 1.02 },
    visible: { opacity: 1, scale: 1 },
  },
} as const;

export function Reveal({
  children,
  className,
  delay = 0,
  amount = 0.2,
  variant = "fade-up",
}: RevealProps) {
  const shouldReduceMotion = useReducedMotion();
  const selectedVariant = variants[variant];

  return (
    <motion.div
      className={className}
      initial={shouldReduceMotion ? false : selectedVariant.initial}
      whileInView={shouldReduceMotion ? undefined : selectedVariant.visible}
      viewport={{ once: true, amount }}
      transition={{
        duration: 0.56,
        delay: Math.min(Math.max(delay, 0), 0.18),
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
