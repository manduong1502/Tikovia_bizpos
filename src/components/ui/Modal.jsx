import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  const ref = useRef(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      const handleEsc = (e) => { if (e.key === 'Escape') onClose?.(); };
      window.addEventListener('keydown', handleEsc);
      return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', handleEsc); };
    }
    return () => { document.body.style.overflow = ''; };
  }, [open, onClose]);

  const sizeClass = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[90vw]',
  }[size] || 'max-w-lg';

  const modalContent = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[999990] flex items-center justify-center p-3 sm:p-6 overflow-y-auto custom-scrollbar"
          onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
        >
          {/* Backdrop (Darkens and blurs entire screen including top header & all sidebars) */}
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999991]" onClick={onClose} />

          {/* Panel */}
          <motion.div
            ref={ref}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className={`relative z-[999999] bg-white rounded-2xl shadow-2xl w-full ${sizeClass} max-h-[88vh] flex flex-col my-auto border border-gray-100/80`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0 bg-gray-50/50 rounded-t-2xl">
              <h2 className="text-lg font-bold text-gray-800 m-0">{title}</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-200/70 hover:text-gray-700 transition-colors cursor-pointer border-none bg-transparent"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 shrink-0 bg-gray-50/30 rounded-b-2xl">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
