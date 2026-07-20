"use client";

import { motion } from "motion/react";
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
    visible: { opacity: 1, y: 0 },
  },
  fade: {
    visible: { opacity: 1 },
  },
  scale: {
    visible: { opacity: 1, scale: 1 },
  },
} as const;

export function Reveal({
  children,
  className,
  delay = 0,
  variant = "fade-up",
}: RevealProps) {
  const selectedVariant = variants[variant];

  return (
    <motion.div
      className={className}
      initial={false}
      animate={selectedVariant.visible}
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
