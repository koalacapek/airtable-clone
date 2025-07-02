"use client";

import Image from "next/image";
import { signOut, useSession } from "next-auth/react";
import { Search, Menu, CircleQuestionMark, Bell } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useState } from "react";

const BaseNavbar = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState("data");

  const searchParams = useSearchParams();
  const name = searchParams.get("name");

  const handleLogout = async () => {
    await signOut();
    router.push("/sign-in");
  };

  return (
    <div>
      <div className="border-gray-1 flex w-screen items-center justify-between border px-3 py-2">
        <div className="flex flex-2 items-center gap-x-2 pl-1">
          <div className="rounded-lg border border-black p-1.5">
            <Image
              src="/airtable.svg"
              alt="Airtable logo"
              width={22}
              height={22}
            />
          </div>
          <h1 className="font-bold">{name}</h1>
        </div>

        {/* Middle Area  */}
        <div>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="text-muted-foreground inline-flex h-9 w-full items-center justify-start rounded-none bg-transparent p-0">
              {["data", "automations", "interfaces", "forms"].map(
                (tabValue) => (
                  <TabsTrigger
                    key={tabValue}
                    value={tabValue}
                    className="ring-offset-background focus-visible:ring-ring data-[state=active]:bg-background text-muted-foreground data-[state=active]:border-b-primary data-[state=active]:text-foreground relative inline-flex h-9 items-center justify-center rounded-none border-b-2 border-b-transparent bg-transparent px-4 py-1 pt-2 pb-3 text-sm font-semibold whitespace-nowrap shadow-none transition-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-none"
                  >
                    {tabValue[0]!.toUpperCase() + tabValue.slice(1)}
                  </TabsTrigger>
                ),
              )}
            </TabsList>
          </Tabs>
        </div>
        {/* <div className="border-gray-1 flex flex-1 items-center justify-between rounded-full border px-4 py-2 shadow-sm">
          <div className="flex items-center gap-x-2">
            <Search size={16} strokeWidth={1} />

            <p className="text-gray-2 text-xs font-light">Search...</p>
          </div>

          <p className="text-gray-2 text-sm opacity-80">ctrl K</p>
        </div> */}

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
                <button onClick={handleLogout}>Sign Out</button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

export default BaseNavbar;
