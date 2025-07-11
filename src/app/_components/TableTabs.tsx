"use client";

import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { api } from "~/trpc/react";
import { Plus } from "lucide-react";
import type { ITableTabProps } from "~/type";

const TableTabs = ({ baseId, active, setActive }: ITableTabProps) => {
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

  const handleAddTable = () => {
    createTable({ baseId });
  };

  return (
    <div className="w-full">
      <Tabs value={active ?? tables?.[0]?.id} onValueChange={setActive}>
        <TabsList className="bg-orange-1 flex w-full justify-start overflow-x-auto rounded-none p-0">
          {tables?.map((table) => (
            <TabsTrigger
              key={table.id}
              value={table.id}
              className="text-gray-2 h-full max-w-fit rounded-none px-4 pt-3 pb-2 text-xs font-medium hover:cursor-pointer hover:bg-black/10 data-[state=active]:rounded-t-sm data-[state=active]:text-black"
            >
              {table.name}
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
