"use client";

import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="h-full w-64 bg-gray-100 p-4 shadow-inner">
      <ul className="space-y-2">
        <li>
          <Link href="/">Dashboard</Link>
        </li>
        <li>
          <Link href="/settings">Settings</Link>
        </li>
        <li>
          <Link href="/profile">Profile</Link>
        </li>
      </ul>
    </aside>
  );
}
