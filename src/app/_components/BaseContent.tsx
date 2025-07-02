"use client";

import { useEffect, useState } from "react";
import TableTabs from "./TableTabs";
import type { ColumnDef } from "@tanstack/react-table";
import Table from "./Table";
import { api } from "~/trpc/react";
import type { TableRow } from "~/type";
import Spinner from "./Spinner";

const BaseContent = ({ baseId }: { baseId: string }) => {
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const { data: table } = api.table.getTableWithData.useQuery(
    { tableId: activeTab! },
    {
      enabled: !!activeTab,
    },
  );

  // Fetch tables
  const { data: tables } = api.table.getAllByBase.useQuery({
    baseId,
  });

  useEffect(() => {
    // Only set if activeTab hasn't been set yet
    if (!activeTab && tables?.[0]) {
      setActiveTab(tables[0].id);
    }
  }, [tables, activeTab]);

  if (!table) {
    return (
      <div className="flex h-full items-center justify-center p-10">
        <Spinner size={24} />
      </div>
    );
  }

  const data: TableRow[] = table.rows.map((row) => {
    const rowData: TableRow = { id: row.id };
    row.cells.forEach((cell) => {
      const col = table.columns.find((c) => c.id === cell.columnId);
      if (col) rowData[col.name] = cell.value;
    });
    return rowData;
  });

  const columns: ColumnDef<TableRow>[] = table.columns.map((col) => ({
    accessorKey: col.name,
    header: col.name,
    cell: ({ getValue }) => (
      <input
        className="w-full border-none bg-transparent outline-none"
        defaultValue={getValue() as string}
        onChange={(e) => {
          // TODO
          console.log("Name changed:", e.target.value);
        }}
      />
    ),
  }));

  return (
    <div className="h-full w-full">
      <TableTabs baseId={baseId} active={activeTab} setActive={setActiveTab} />
      <Table columns={columns} data={data} />
    </div>
  );
};

export default BaseContent;
