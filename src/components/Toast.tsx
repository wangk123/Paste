import { AnimatePresence, motion } from "framer-motion";
import { create } from "zustand";

interface ToastState {
  message: string | null;
  show: (msg: string) => void;
  hide: () => void;
}

export const useToast = create<ToastState>((set) => ({
  message: null,
  show: (message) => {
    set({ message });
    setTimeout(() => set({ message: null }), 2500);
  },
  hide: () => set({ message: null }),
}));

export function Toast() {
  const message = useToast((s) => s.message);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-full glass-panel text-[13px] text-[var(--ink)] shadow-[var(--shadow-lift)] flex items-center gap-2"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
