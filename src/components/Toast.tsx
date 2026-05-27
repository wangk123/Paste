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
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-full glass-panel text-sm shadow-lg"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
