"use client";

import * as React from "react";
import { SIDEBAR_MODE_KEY } from "@/components/admin/admin-sidebar";

export function AdminContentShell({ children }: { children: React.ReactNode }) {
  const [paddingMode, setPaddingMode] = React.useState<"expanded" | "collapsed">("expanded");
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    // Init from localStorage
    const stored = localStorage.getItem(SIDEBAR_MODE_KEY);
    if (stored === "collapsed" || stored === "hover") {
      setPaddingMode("collapsed");
    }

    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);

    // Listen for changes
    const onStorage = (e: StorageEvent) => {
      if (e.key === SIDEBAR_MODE_KEY && e.newValue) {
        setPaddingMode(
          (e.newValue === "collapsed" || e.newValue === "hover") ? "collapsed" : "expanded"
        );
      }
    };
    
    // Custom event dispatch for intra-window updates
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  return (
    <main
      className="flex-1 transition-all duration-300 ease-in-out"
      style={{ paddingLeft: isMobile ? 0 : (paddingMode === "collapsed" ? "4.5rem" : "16rem") }}
    >
      <div className="h-full relative z-10">{children}</div>
    </main>
  );
}
