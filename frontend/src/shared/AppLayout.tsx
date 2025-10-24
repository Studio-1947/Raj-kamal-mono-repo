import React from "react";
import Sidebar from "./Sidebar";

type Props = {
  children: React.ReactNode;
};

export default function AppLayout({ children }: Props) {
  return (
    <div className="flex h-screen bg-[var(--app-bg)]">
      {/* Sidebar wrapper - fixed position on large screens */}
      <div className="shrink-0 h-screen pl-3 py-3">
        <Sidebar />
      </div>
      {/* Main content area - scrollable independently */}
      <div className="flex-1 min-w-0 h-screen overflow-y-auto bg-[var(--app-bg)]">
        <div className="px-6">{children}</div>
      </div>
    </div>
  );
}
