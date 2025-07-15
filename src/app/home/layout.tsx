"use client";

import { useState } from "react";
import Navbar from "../_components/Navbar";
import Sidebar from "../_components/Sidebar";

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  return (
    <div className="flex h-screen flex-col">
      <Navbar isExpanded={isExpanded} setIsExpanded={setIsExpanded} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isExpanded={isExpanded} />
        <main className="flex-1 overflow-y-auto bg-white">{children}</main>
      </div>
    </div>
  );
}
