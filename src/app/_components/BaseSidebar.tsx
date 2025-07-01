"use client";

import { HelpCircle, Bell } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

export default function BaseSidebar() {
  const { data: session } = useSession();

  return (
    <div className="border-gray-1 flex flex-col justify-between border-r px-3 pt-4 pb-5">
      {/* Top section */}
      <div className="flex items-center justify-center">
        <Image src="/airtable.svg" alt="Airtable logo" width={22} height={22} />
      </div>

      {/* Bottom section */}
      <div className="text-gray-4 flex flex-col gap-y-3 pt-4 text-xs">
        <Link
          href="#"
          className="hover:bg-gray-1 flex items-center gap-x-1 rounded-full px-2 py-2"
        >
          <HelpCircle size={16} strokeWidth={1.5} />
        </Link>
        <Link
          href="#"
          className="hover:bg-gray-1 flex items-center gap-x-1 rounded-full px-2 py-2"
        >
          <Bell size={16} strokeWidth={1.5} />
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger className="cursor-pointer">
            {session?.user?.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name ?? "User"}
                width={30}
                height={30}
                className="rounded-full object-cover"
                style={{ borderRadius: "9999px" }}
              />
            ) : (
              <div className="h-7 w-7 rounded-full bg-gray-300" />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>
              <button onClick={() => signOut()}>Sign Out</button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
