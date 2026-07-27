"use client";

import React, { useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import NavigationSidebar from "./NavigationSidebar";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NavigationDrawer({ isOpen, onClose }: NavigationDrawerProps) {
  const drawerRef = useFocusTrap<HTMLDivElement>({
    isActive: isOpen,
    onEscape: onClose,
  });

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={drawerRef}
      className="fixed inset-0 z-50 lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Navigation drawer"
      data-testid="navigation-drawer"
    >
      <NavigationSidebar isOpen={isOpen} onClose={onClose} />
    </div>,
    document.body
  );
}