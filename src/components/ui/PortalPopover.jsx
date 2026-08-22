import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

import { useRef } from 'react';
export default function PortalPopover({ anchorEl, open, onClose, widthMatch = true, children, className = '' }) {
  const popoverRef = useRef(null);
  const [style, setStyle] = useState({});

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (anchorEl && anchorEl.contains(e.target)) return;
      if (popoverRef.current && popoverRef.current.contains(e.target)) return;
      if (onClose) onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, anchorEl, onClose]);

  useEffect(() => {
    if (!open || !anchorEl) return;

    const updatePosition = () => {
      if (!popoverRef.current) return;
      
      const rect = anchorEl.getBoundingClientRect();
      const popoverRect = popoverRef.current.getBoundingClientRect();
      
      // If the popover hasn't fully rendered its content, use a fallback estimated size
      const contentHeight = popoverRect.height > 50 ? popoverRect.height : 450;
      const contentWidth = popoverRect.width > 50 ? popoverRect.width : 300;

      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const spaceRight = window.innerWidth - rect.left;

      let newStyle = {
        position: 'fixed',
        width: widthMatch ? rect.width : 'auto',
        zIndex: 99999,
      };

      const PADDING = 10;
      // Vertical positioning
      if (spaceBelow < contentHeight) {
        if (spaceAbove > contentHeight || spaceAbove > spaceBelow) {
          // Render above the anchor
          newStyle.bottom = window.innerHeight - rect.top + 4;
          newStyle.top = 'auto';
        } else {
          // Not enough space above or below, align to bottom of screen
          newStyle.bottom = PADDING;
          newStyle.top = 'auto';
        }
      } else {
        // Render below the anchor
        newStyle.top = rect.bottom + 4;
        newStyle.bottom = 'auto';
      }

      // Horizontal positioning (only if we don't force widthMatch)
      if (!widthMatch) {
        const screenW = window.innerWidth;
        if (screenW <= 640 || contentWidth >= screenW - 24) {
          // Mobile: Center or pin to screen margins
          newStyle.left = 12;
          newStyle.right = 12;
          newStyle.width = 'auto';
        } else {
          // Desktop / Tablet: check if anchor is on the right side of the screen
          const spaceRight = screenW - rect.left;
          if (spaceRight < contentWidth) {
            // Align with right edge of anchor, or clamp to right margin
            const rightAlignedLeft = rect.right - contentWidth;
            newStyle.left = Math.max(12, Math.min(rightAlignedLeft, screenW - contentWidth - 12));
            newStyle.right = 'auto';
          } else {
            // Default: align with left edge of anchor, but ensure it doesn't overflow right
            newStyle.left = Math.max(12, Math.min(rect.left, screenW - contentWidth - 12));
            newStyle.right = 'auto';
          }
        }
      } else {
        newStyle.left = rect.left;
        newStyle.right = 'auto';
      }

      setStyle(newStyle);
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    let observer;
    if (popoverRef.current) {
      observer = new ResizeObserver(() => {
        updatePosition();
      });
      observer.observe(popoverRef.current);
    }

    // Force an update shortly after mount to catch any delayed render sizes
    const timeoutId = setTimeout(updatePosition, 50);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      if (observer) observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, [open, anchorEl, widthMatch]);

  if (!open) return null;

  return createPortal(
    <div style={style} className={className} ref={popoverRef}>
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
