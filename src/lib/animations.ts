export const panelVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: [0.32, 0.72, 0, 1] as const },
  },
  exit: { opacity: 0, y: 16, transition: { duration: 0.15 } },
};

export const cardSpring = {
  type: "spring" as const,
  stiffness: 400,
  damping: 28,
};
