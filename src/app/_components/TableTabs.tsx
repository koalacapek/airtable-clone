"use client";

import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { api } from "~/trpc/react";
import { ChevronDown, Plus, Trash } from "lucide-react";
import type { ITableTabProps } from "~/type";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

const TableTabs = ({ baseId, active, setActive }: ITableTabProps) => {
  const [open, setOpen] = useState(false);
  const utils = api.useUtils();

  // Fetch tables
  const { data: tables } = api.table.getAllByBase.useQuery({
    baseId,
  });

  // Create new table
  const { mutate: createTable } = api.table.createTable.useMutation({
    onMutate: async ({ baseId }) => {
      await utils.table.getAllByBase.cancel({ baseId });

      const previousTables = utils.table.getAllByBase.getData({ baseId });

      utils.table.getAllByBase.setData({ baseId }, (old) => [
        ...(old ?? []),
        {
          id: "temp-id",
          name: "Creating new table...",
          baseId,
          createdAt: new Date(),
        },
      ]);
      return { previousTables };
    },

    onError: (err, _input, context) => {
      if (context?.previousTables) {
        utils.table.getAllByBase.setData({ baseId }, context.previousTables);
      }
    },

    onSettled: async () =>
      await utils.table.getAllByBase.invalidate({ baseId }),
  });

  // Delete table
  const { mutate: deleteTable } = api.table.deleteTable.useMutation({
    onMutate: async ({ id }) => {
      await utils.table.getAllByBase.cancel({ baseId });
    },
    onSettled: async () =>
      await utils.table.getAllByBase.invalidate({ baseId }),
  });

  const handleAddTable = () => {
    createTable({ baseId });
  };

  return (
    <div className="w-full">
      <Tabs value={active ?? tables?.[0]?.id} onValueChange={setActive}>
        <TabsList className="bg-orange-1 flex w-full justify-start overflow-x-auto rounded-none p-0">
          {tables?.map((table, index) => (
            <TabsTrigger
              key={table.id}
              value={table.id}
              className="text-gray-2 h-full max-w-fit rounded-none px-4 pt-3 pb-2 text-xs font-medium hover:cursor-pointer hover:bg-black/10 data-[state=active]:rounded-t-sm data-[state=active]:text-black"
            >
              <div className="flex items-center justify-center gap-2">
                <span>Table {index + 1}</span>

                {/* Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <ChevronDown
                      size={16}
                      strokeWidth={1.5}
                      onClick={() => setOpen(!open)}
                    />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem asChild>
                      <button
                        disabled={tables?.length === 1}
                        className={`flex w-full items-center gap-x-3 ${
                          tables?.length === 1
                            ? "cursor-not-allowed opacity-50"
                            : "hover:cursor-pointer"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTable({ id: table.id });
                        }}
                      >
                        <Trash
                          size={12}
                          strokeWidth={1.5}
                          color={tables?.length === 1 ? "#9ca3af" : "red"}
                        />
                        <p
                          className={`text-xs ${
                            tables?.length === 1
                              ? "text-gray-400"
                              : "text-red-500"
                          }`}
                        >
                          Delete
                        </p>
                      </button>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </TabsTrigger>
          ))}

          <button
            onClick={handleAddTable}
            className="text-gray-2 ml-2 flex gap-1 px-3 text-sm whitespace-nowrap hover:cursor-pointer hover:text-black disabled:opacity-50"
          >
            <Plus size={19} />
          </button>
        </TabsList>
      </Tabs>
    </div>
  );
};

export default TableTabs;
