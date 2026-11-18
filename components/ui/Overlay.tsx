"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/** Full-screen layer portaled to <body> so it sits above the nav regardless of page stacking contexts. */
export function Overlay({ children, className = "", ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- portals need document.body (client only)
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  if (!mounted) return null;
  return createPortal(
    <div className={`fixed inset-0 z-[60] grid place-items-center bg-night-0/95 animate-fade-in ${className}`} {...rest}>
      {children}
    </div>,
    document.body,
  );
}
