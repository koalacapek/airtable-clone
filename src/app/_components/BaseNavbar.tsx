"use client";

import Image from "next/image";

import { useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useState } from "react";

const BaseNavbar = () => {
  const [tab, setTab] = useState("data");

  const searchParams = useSearchParams();
  const name = searchParams.get("name");

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
                    className="ring-offset-background focus-visible:ring-ring data-[state=active]:bg-background text-muted-foreground data-[state=active]:border-b-primary data-[state=active]:text-foreground relative inline-flex h-9 items-center justify-center rounded-none border-b-2 border-b-transparent bg-transparent px-4 py-1 pt-2 pb-3 text-xs whitespace-nowrap shadow-none transition-none hover:cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-none"
                  >
                    {tabValue[0]!.toUpperCase() + tabValue.slice(1)}
                  </TabsTrigger>
                ),
              )}
            </TabsList>
          </Tabs>
        </div>

        {/* The rest */}
        <div className="flex flex-2 items-center justify-end gap-x-5"></div>
      </div>
    </div>
  );
};

export default BaseNavbar;
