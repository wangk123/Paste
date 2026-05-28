export const panelVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.22, ease: [0.32, 0.72, 0, 1] as const },
  },
  exit: {
    opacity: 0,
    y: 14,
    scale: 0.985,
    transition: { duration: 0.14 },
  },
};

export const cardSpring = {
  type: "spring" as const,
  stiffness: 380,
  damping: 26,
  mass: 0.6,
};
