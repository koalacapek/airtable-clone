"use client";

import Image from "next/image";
import { useSession } from "next-auth/react";
import { Search, Menu, CircleQuestionMark, Bell } from "lucide-react";

const Navbar = () => {
  const { data: session } = useSession();

  return (
    <div>
      <div className="border-gray-1 flex w-screen items-center justify-between border px-3 py-2">
        <div className="flex flex-2 items-center gap-x-5">
          <Menu
            size={20}
            className="text-gray-2 ursor-pointer opacity-50 hover:text-black hover:opacity-70"
          />
          <Image src="/logo.png" alt="Airtable logo" width={102} height={60} />
        </div>

        {/* Search bar  */}
        <div className="border-gray-1 flex flex-1 items-center justify-between rounded-full border px-4 py-2 shadow-sm">
          <div className="flex items-center gap-x-2">
            <Search size={16} strokeWidth={1} />
            <p className="text-gray-2 text-xs">Search...</p>
          </div>

          <p className="text-gray-2 text-sm">ctrl K</p>
        </div>

        {/* The rest */}
        <div className="flex flex-2 items-center justify-end gap-x-5">
          <div className="hover:bg-gray-1 flex gap-x-1 rounded-full px-4 py-2 text-xs">
            <CircleQuestionMark size={15} strokeWidth={1.5} />
            <p>Help</p>
          </div>
          <div className="border-gray-1 hover:bg-gray-1 rounded-full border p-2 shadow-sm">
            <Bell size={15} strokeWidth={1.5} />
          </div>
          <div>
            {session?.user?.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name ?? "User"}
                width={40}
                height={40}
                className="rounded-full object-cover"
                style={{ borderRadius: "9999px" }}
              />
            ) : (
              <div className="h-7 w-7 rounded-full bg-gray-300" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
