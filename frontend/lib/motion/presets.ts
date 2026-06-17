import type { Transition, Variants } from "motion/react";

export const easeOutExpo: Transition["ease"] = [0.22, 1, 0.36, 1];

export const transitionBase: Transition = {
  duration: 0.45,
  ease: easeOutExpo,
};

export const transitionPage: Transition = {
  duration: 0.38,
  ease: easeOutExpo,
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.06,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitionBase,
  },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitionBase,
  },
};

export const marketingPageVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: transitionPage,
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.28, ease: easeOutExpo },
  },
};

export const authPageVariants: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: {
    opacity: 1,
    x: 0,
    transition: transitionPage,
  },
  exit: {
    opacity: 0,
    x: -16,
    transition: { duration: 0.26, ease: easeOutExpo },
  },
};

export const brandPanelVariants: Variants = {
  hidden: { opacity: 0, x: -28 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.55, ease: easeOutExpo },
  },
};

export const navbarVariants: Variants = {
  hidden: { opacity: 0, y: -14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: easeOutExpo, delay: 0.04 },
  },
};
