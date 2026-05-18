import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function PortalPopover({ anchorEl, open, widthMatch = true, children, className = '' }) {
  const [style, setStyle] = useState({});

  useEffect(() => {
    if (!open || !anchorEl) return;

    const updatePosition = () => {
      const rect = anchorEl.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      let top = rect.bottom + 4;
      let left = rect.left;
      
      // If there's very little space below but a lot above, we might want to flip it
      // But for simplicity, we just stick to bottom unless explicitly needed
      if (spaceBelow < 250 && spaceAbove > spaceBelow) {
        // We can't know exact height easily, so we just use bottom for now.
        // A robust solution uses ResizeObserver on the popover content.
      }

      setStyle({
        position: 'fixed',
        top: top,
        left: left,
        width: widthMatch ? rect.width : 'auto',
        zIndex: 99999,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, anchorEl, widthMatch]);

  if (!open) return null;

  return createPortal(
    <div style={style} className={className}>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="w-full"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
}
