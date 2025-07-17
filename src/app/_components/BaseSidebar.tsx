"use client";

import { HelpCircle, Bell, LogOut, ArrowLeft } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

const BaseSidebar = () => {
  const { data: session } = useSession();

  const router = useRouter();

  return (
    <div className="border-gray-1 flex flex-col justify-between border-r px-3 pb-5">
      {/* Top section */}
      <div className="group relative flex items-center justify-center border">
        {/* Default Airtable Logo */}
        <Image
          src="/airtable.svg"
          alt="Airtable logo"
          width={22}
          height={22}
          className="absolute top-4 transition-all duration-150 group-hover:scale-0"
        />

        <ArrowLeft
          size={20}
          className="absolute top-4 scale-0 transition-all duration-150 group-hover:scale-100 hover:cursor-pointer"
          onClick={() => router.push("/home")}
        />
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
              <button
                className="flex w-full items-center gap-x-3"
                onClick={() => signOut()}
              >
                <LogOut size={12} strokeWidth={1.5} />
                <p className="text-xs">Log Out</p>
              </button>{" "}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default BaseSidebar;
