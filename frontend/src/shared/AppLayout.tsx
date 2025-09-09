import React from "react";
import Sidebar from "./Sidebar";

type Props = {
  children: React.ReactNode;
};

export default function AppLayout({ children }: Props) {
  return (
    <div className="flex h-screen bg-white">
      <Sidebar />
      <div className="flex-1 min-w-0 overflow-y-auto bg-gray-50">
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
