"use client";

import { useEffect, useState } from "react";
import TableTabs from "./TableTabs";
import type { ColumnDef } from "@tanstack/react-table";
import Table from "./Table";
import { api } from "~/trpc/react";
import type { Cell, TableRow } from "~/type";
import Spinner from "./Spinner";
import CellComponent from "./Cell";

const BaseContent = ({ baseId }: { baseId: string }) => {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<Record<string, string>>({});

  const utils = api.useUtils();

  // Get table data
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

  const { mutate: updateCell } = api.cell.updateCell.useMutation({
    onMutate: async ({ cellId, value, tableId }) => {
      // Cancel outgoing queries for table
      await utils.cell.getAll.cancel({ tableId });

      const previousCells = utils.cell.getAll.getData({ tableId });

      utils.cell.getAll.setData({ tableId }, (old) =>
        old?.map((cell) =>
          cell.id === cellId ? { ...cell, value: value?.trim() ?? "" } : cell,
        ),
      );

      return { previousCells };
    },

    onError: (err, _input, context) => {
      if (context?.previousCells) {
        utils.cell.getAll.setData(
          { tableId: _input.tableId },
          context.previousCells,
        );
      }
    },

    onSettled: (_data, _err, _input) => {
      void utils.cell.getAll.invalidate({ tableId: _input.tableId });
    },
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

  const handleUpdate = (
    newValue: string,
    cellId: string,
    rowId: string,
    columnName: string,
  ) => {
    const key = `${rowId}-${columnName}`;
    setEditedData((prev) => ({ ...prev, [key]: newValue }));

    updateCell({
      cellId: cellId,
      value: newValue || "",
      tableId: table.id,
    });
  };

  const data: TableRow[] = table.rows.map((row) => {
    const rowData = {} as TableRow;
    rowData.id = row.id;
    row.cells.forEach((cell) => {
      const col = table.columns.find((c) => c.id === cell.columnId);
      if (col) {
        const key = `${row.id}-${col.name}`;
        rowData[col.name] = {
          value: editedData[key] ?? cell.value,
          cellId: cell.id,
        };
      }
    });
    return rowData;
  });

  const columns: ColumnDef<TableRow>[] = table.columns.map((col) => ({
    accessorKey: col.name,
    header: col.name,
    cell: ({ row }) => {
      const cellData: Cell = row.getValue(col.name);
      return (
        <CellComponent
          cellData={cellData}
          onUpdate={(newValue) =>
            handleUpdate(newValue, cellData.cellId, row.original.id, col.name)
          }
        />
      );
    },
  }));

  return (
    <div className="h-full w-full">
      <TableTabs baseId={baseId} active={activeTab} setActive={setActiveTab} />
      <Table columns={columns} data={data} />
    </div>
  );
};

export default BaseContent;
