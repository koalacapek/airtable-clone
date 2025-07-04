"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { ColumnType } from "@prisma/client";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";

import type { ColumnDef, Row } from "@tanstack/react-table";
import { api } from "~/trpc/react";

import { useVirtualizer } from "@tanstack/react-virtual";

import type { Cell, ITableProps, TableRow } from "~/type";
import Spinner from "./Spinner";
import CellComponent from "./Cell";
import { Plus } from "lucide-react";

import AddColumnPopover from "./AddColumnPopover";

const Table = ({ activeTab }: ITableProps) => {
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnType, setNewColumnType] = useState<"TEXT" | "NUMBER">("TEXT");
  const utils = api.useUtils();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get table metadata (columns)
  const { data: tableMetadata } = api.table.getTableMetadata.useQuery(
    { tableId: activeTab! },
    {
      enabled: !!activeTab,
    },
  );

  // Get table data with infinite scrolling
  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = api.table.getTableWithDataInfinite.useInfiniteQuery(
    {
      tableId: activeTab!,
      limit: 50,
    },
    {
      enabled: !!activeTab,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    },
  );

  // Flatten all rows from all pages
  const allRows = useMemo(() => {
    if (!infiniteData?.pages) return [];
    return infiniteData.pages.flatMap((page) => page.rows);
  }, [infiniteData]);

  // Transform rows into table data format
  const data: TableRow[] = useMemo(() => {
    if (!tableMetadata || !allRows.length) return [];

    return allRows.map((row, index) => {
      const rowData = {} as TableRow;
      rowData.id = row.id;

      row.cells.forEach((cell) => {
        const col = tableMetadata.columns.find((c) => c.id === cell.columnId);
        if (col) {
          // For the # column, use the frontend index + 1
          // This ensures row numbers are always sequential and work with filtering
          if (col.name === "#") {
            rowData[col.name] = {
              value: (index + 1).toString(),
              cellId: cell.id,
            };
          } else {
            rowData[col.name] = {
              value: cell.value,
              cellId: cell.id,
            };
          }
        }
      });

      return rowData;
    });
  }, [tableMetadata, allRows]);

  // Virtualizer setup
  const virtualizer = useVirtualizer({
    count: data.length,
    estimateSize: () => 40,
    getScrollElement: () => scrollRef.current,
    overscan: 5,
  });

  // Load more data when scrolling near the end
  useEffect(() => {
    const [lastItem] = [...virtualizer.getVirtualItems()].reverse();

    if (!lastItem) {
      return;
    }

    if (
      lastItem.index >= data.length - 1 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      void fetchNextPage();
    }
  }, [hasNextPage, fetchNextPage, data, isFetchingNextPage, virtualizer]);

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
      void utils.table.getTableWithDataInfinite.invalidate({
        tableId: activeTab!,
      });
    },
  });

  // Create new column
  const { mutate: createColumn } = api.column.createColumn.useMutation({
    onSuccess: () => {
      void utils.table.getTableMetadata.invalidate({ tableId: activeTab! });
      void utils.table.getTableWithDataInfinite.invalidate({
        tableId: activeTab!,
      });
    },
  });

  const handleUpdate = useCallback(
    (newValue: string, cellId: string) => {
      if (!activeTab) return;
      updateCell({
        cellId,
        value: newValue || "",
        tableId: activeTab,
      });
    },
    [activeTab, updateCell],
  );

  const handleCreateColumn = useCallback(() => {
    if (!activeTab || !newColumnName.trim()) return;

    createColumn({
      tableId: activeTab,
      type: newColumnType,
      name: newColumnName.trim(),
    });

    setNewColumnName("");
    setNewColumnType("TEXT");
  }, [activeTab, newColumnName, newColumnType, createColumn]);

  const columns: ColumnDef<TableRow>[] = useMemo(() => {
    if (!tableMetadata) return [];

    return tableMetadata.columns.map((col) => {
      const isReadOnly = col.name === "#";

      return {
        accessorKey: col.name,
        header: () => <div>{col.name || "Unnamed"}</div>,
        cell: ({ row }: { row: Row<TableRow> }) => {
          const cellData: Cell = row.getValue(col.name);
          const column = tableMetadata.columns.find((c) => c.name === col.name);

          return (
            <CellComponent
              readOnly={isReadOnly}
              colType={column?.type ?? ColumnType.TEXT}
              cellData={{
                cellId: cellData.cellId,
                value: cellData.value,
              }}
              onUpdate={(newValue: string, cellId: string) =>
                handleUpdate(newValue, cellId)
              }
            />
          );
        },
      };
    });
  }, [tableMetadata, handleUpdate]);

  const tableInstance = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleAddRow = () => {
    if (!activeTab) return;
    createRow({ tableId: activeTab });
  };

  if (isLoading || !tableMetadata) {
    return (
      <div className="flex h-full items-center justify-center p-10">
        <Spinner size={24} />
      </div>
    );
  }

  const virtualRows = virtualizer.getVirtualItems();
  const totalHeight = virtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? (virtualRows[0]?.start ?? 0) : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? totalHeight - (virtualRows[virtualRows.length - 1]?.end ?? 0)
      : 0;

  return (
    <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-auto">
      <table className="w-full border border-gray-200 text-sm">
        <thead className="sticky top-0 z-10 bg-white">
          {tableInstance.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="bg-gray-100">
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="border-b p-2 text-left">
                  <span>
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                  </span>
                </th>
              ))}
              <th className="border-b p-2 text-left">
                <AddColumnPopover
                  newColumnName={newColumnName}
                  setNewColumnName={setNewColumnName}
                  newColumnType={newColumnType}
                  setNewColumnType={setNewColumnType}
                  onSubmit={handleCreateColumn}
                />
              </th>
            </tr>
          ))}
        </thead>
        <tbody>
          {paddingTop > 0 && (
            <tr>
              <td style={{ height: `${paddingTop}px` }} />
            </tr>
          )}
          {virtualRows.map((virtualRow) => {
            const row = tableInstance.getRowModel().rows[virtualRow.index];
            if (!row) return null;

            return (
              <tr key={row.id} data-index={virtualRow.index}>
                {row.getVisibleCells().map((cell) => {
                  const isRowNumberColumn = cell.column.id === "#";

                  return (
                    <td
                      key={cell.id}
                      className={`w-fit border p-2 focus-within:border-2 focus-within:border-blue-500 ${
                        isRowNumberColumn ? "" : "hover:bg-gray-100"
                      }`}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  );
                })}
                <td className="border p-2" />
              </tr>
            );
          })}
          {paddingBottom > 0 && (
            <tr>
              <td style={{ height: `${paddingBottom}px` }} />
            </tr>
          )}
          <tr>
            <td colSpan={columns.length + 1} className="border">
              <button
                onClick={handleAddRow}
                className="w-full p-2 text-left text-sm hover:cursor-pointer hover:bg-gray-100"
              >
                <Plus strokeWidth={1.5} size={16} />
              </button>
            </td>
          </tr>
          {isFetchingNextPage && (
            <tr>
              <td
                colSpan={columns.length + 1}
                className="border p-2 text-center"
              >
                <Spinner size={16} />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
