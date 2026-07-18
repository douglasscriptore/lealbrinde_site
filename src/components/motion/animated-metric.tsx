"use client";

import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
} from "motion/react";
import { useEffect, useRef, useState } from "react";

type AnimatedMetricProps = {
  value: number;
  className?: string;
  duration?: number;
};

export function AnimatedMetric({
  value,
  className,
  duration = 1.1,
}: AnimatedMetricProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.6 });
  const shouldReduceMotion = useReducedMotion();
  const motionValue = useMotionValue(value);
  const [displayValue, setDisplayValue] = useState(value);

  useMotionValueEvent(motionValue, "change", (latest) => {
    setDisplayValue(Math.round(latest));
  });

  useEffect(() => {
    if (!isInView || shouldReduceMotion) return;

    motionValue.set(0);
    const controls = animate(motionValue, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
    });

    return () => controls.stop();
  }, [duration, isInView, motionValue, shouldReduceMotion, value]);

  return (
    <span ref={ref} className={className}>
      <span className="sr-only">{value}</span>
      <motion.span aria-hidden="true">{displayValue}</motion.span>
    </span>
  );
}
