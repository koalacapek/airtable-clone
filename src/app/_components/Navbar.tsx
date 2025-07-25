"use client";

import Image from "next/image";
import { signOut, useSession } from "next-auth/react";
import { Search, Menu, CircleQuestionMark, Bell, LogOut } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";

const Navbar = ({
  isExpanded,
  setIsExpanded,
}: {
  isExpanded: boolean;
  setIsExpanded: (isExpanded: boolean) => void;
}) => {
  const { data: session } = useSession();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.push("/sign-in");
  };

  return (
    <div>
      <div className="border-gray-1 flex w-screen items-center justify-between border px-3 py-2">
        <div className="flex flex-2 items-center gap-x-5">
          <Menu
            size={20}
            className="text-gray-2 opacity-50 hover:cursor-pointer hover:text-black hover:opacity-70"
            onClick={() => setIsExpanded(!isExpanded)}
          />

          <Image src="/logo.png" alt="Airtable logo" width={102} height={60} />
        </div>

        {/* Search bar  */}
        <div className="border-gray-1 flex flex-1 items-center justify-between rounded-full border px-4 py-2 shadow-sm">
          <div className="flex items-center gap-x-2">
            <Search size={16} strokeWidth={1} />

            <p className="text-gray-2 text-xs font-light">Search...</p>
          </div>

          <p className="text-gray-2 text-sm opacity-80">ctrl K</p>
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
                  className="flex w-full items-center gap-x-3 hover:cursor-pointer"
                  onClick={handleLogout}
                >
                  <LogOut size={12} strokeWidth={1.5} />
                  <p className="text-xs">Log Out</p>
                </button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
