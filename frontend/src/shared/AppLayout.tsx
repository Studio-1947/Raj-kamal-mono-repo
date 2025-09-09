import React from "react";
import Sidebar from "./Sidebar";

type Props = {
  children: React.ReactNode;
};

export default function AppLayout({ children }: Props) {
  return (
    <div className="flex h-screen bg-[var(--app-bg)]">
      {/* Sidebar wrapper to provide left and vertical padding */}
      <div className="shrink-0 h-screen pl-3 py-3">
        <Sidebar />
      </div>
      <div className="flex-1 min-w-0 overflow-y-auto bg-[var(--app-bg)]">
        <div className="px-6 py-10">
          {children}
        </div>
      </div>
    </div>
  );
}
