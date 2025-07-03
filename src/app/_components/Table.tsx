"use client";

import { useMemo } from "react";
import { ColumnType } from "@prisma/client";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";

import type { ColumnDef } from "@tanstack/react-table";
import { api } from "~/trpc/react";

import type { Cell, ITableProps, TableRow } from "~/type";
import Spinner from "./Spinner";
import CellComponent from "./Cell";
import { Plus } from "lucide-react";

const Table = ({ activeTab }: ITableProps) => {
  const utils = api.useUtils();

  // Get table data
  const { data: table } = api.table.getTableWithData.useQuery(
    { tableId: activeTab! },
    {
      enabled: !!activeTab,
    },
  );

  // Update cell value
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

  // Create new row
  const { mutate: createRow } = api.row.createRow.useMutation({
    onSuccess: () => {
      void utils.table.getTableWithData.invalidate({ tableId: table!.id });
    },
  });

  const data: TableRow[] = useMemo(() => {
    if (!table) return [];

    return table.rows.map((row) => {
      const rowData = {} as TableRow;
      rowData.id = row.id;

      row.cells.forEach((cell) => {
        const col = table.columns.find((c) => c.id === cell.columnId);
        if (col) {
          rowData[col.name] = {
            value: cell.value,
            cellId: cell.id,
          };
        }
      });

      return rowData;
    });
  }, [table]);

  const columns: ColumnDef<TableRow>[] = useMemo(() => {
    const handleUpdate = (newValue: string, cellId: string) => {
      // setEditedData((prev) => ({ ...prev, [cellId]: newValue }));

      if (!table) {
        console.error("Table data is not available");
        return;
      }
      updateCell({
        cellId: cellId,
        value: newValue || "",
        tableId: table.id,
      });
    };

    if (!table) return [];

    return table.columns.map((col) => ({
      accessorKey: col.name,
      header: col.name,
      cell: ({ row }) => {
        const cellData: Cell = row.getValue(col.name);
        const column = table.columns.find((c) => c.name === col.name);
        console.log("cellData is", cellData, cellData.cellId);
        return (
          <CellComponent
            colType={column?.type ?? ColumnType.TEXT}
            cellData={{ cellId: cellData.cellId, value: cellData.value }}
            onUpdate={(newValue: string, cellId: string) =>
              handleUpdate(newValue, cellId)
            }
          />
        );
      },
    }));
  }, [table, updateCell]);

  const tableInstance = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleAddRow = () => {
    if (!table) return;
    createRow({ tableId: table.id });
  };

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
            <td colSpan={columns.length} className="border">
              <button
                onClick={handleAddRow}
                className="w-full p-2 text-left text-sm hover:cursor-pointer hover:bg-gray-100"
              >
                <Plus strokeWidth={1.5} size={16} />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default Table;
