"use client";

import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useState } from "react";
import { api } from "~/trpc/react"; // tRPC hook
import { Loader2, Plus } from "lucide-react";

type TableTabProps = {
  baseId: string;
};

const TableView = ({ baseId }: TableTabProps) => {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const utils = api.useUtils();

  // Fetch tables
  const { data: tables, isLoading } = api.table.getAllByBase.useQuery({
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
          createdAt: new Date(), // ✅ fixes type error
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

  if (isLoading) return <div>Loading tables...</div>;

  return (
    <Tabs value={activeTab ?? tables?.[0]?.id} onValueChange={setActiveTab}>
      <TabsList className="flex space-x-4 overflow-x-auto border-b bg-transparent px-2">
        {tables?.map((table) => (
          <TabsTrigger
            key={table.id}
            value={table.id}
            className="rounded-none border-b-2 border-transparent px-4 pt-3 pb-2 text-sm font-medium data-[state=active]:border-[#8B3C2C] data-[state=active]:text-black"
          >
            {table.name}
          </TabsTrigger>
        ))}

        <button
          onClick={handleAddTable}
          className="ml-2 flex items-center gap-1 px-3 text-sm whitespace-nowrap text-gray-500 hover:text-black disabled:opacity-50"
        >
          <Plus size={14} />
          Add Table
        </button>
      </TabsList>
    </Tabs>
  );
};

export default TableView;
