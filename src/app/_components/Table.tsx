"use client";

import { ColumnType, type Cell } from "@prisma/client";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";

import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { api } from "~/trpc/react";

import type { TableRow } from "~/type";
import Spinner from "./Spinner";
import CellComponent from "./Cell";

type TableProps = {
  activeTab?: string | null;
};

const Table = ({ activeTab }: TableProps) => {
  const [editedData, setEditedData] = useState<Record<string, string>>({});

  const utils = api.useUtils();

  // Get table data
  const { data: table } = api.table.getTableWithData.useQuery(
    { tableId: activeTab! },
    {
      enabled: !!activeTab,
    },
  );

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

  const handleUpdate = (
    newValue: string,
    cellId: string,
    rowId: string,
    columnName: string,
  ) => {
    const key = `${rowId}-${columnName}`;
    setEditedData((prev) => ({ ...prev, [key]: newValue }));

    if (!table) return;

    updateCell({
      cellId: cellId,
      value: newValue || "",
      tableId: table.id,
    });
  };

  const data: TableRow[] =
    table?.rows.map((row) => {
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
    }) ?? [];

  const columns: ColumnDef<TableRow>[] =
    table?.columns.map((col) => ({
      accessorKey: col.name,
      header: col.name,
      cell: ({ row }) => {
        const cellData: Cell = row.getValue(col.name);
        const column = table.columns.find((c) => c.name === col.name);
        return (
          <CellComponent
            colType={column?.type ?? ColumnType.TEXT}
            cellData={{ cellId: cellData.id, value: cellData.value }}
            onUpdate={(newValue) =>
              handleUpdate(newValue, cellData.id, row.original.id, col.name)
            }
          />
        );
      },
    })) ?? [];

  const tableInstance = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (!table) {
    return (
      <div className="flex h-full items-center justify-center p-10">
        <Spinner size={24} />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-gray-200 text-sm">
        <thead>
          {tableInstance.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="bg-gray-100">
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="border-b p-2 text-left">
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {tableInstance.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="border p-2 hover:bg-gray-100">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <button
              onClick={() => {
                console.log("Add row clicked");
              }}
              className="w-full py-2 text-sm"
            >
              + Add Row
            </button>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default Table;
