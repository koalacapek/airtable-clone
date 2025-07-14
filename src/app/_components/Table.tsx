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

const Table = ({
  activeTab,
  viewConditions,
  searchValue,
  matchingCells = [],
  currentMatchIndex = 0,
}: ITableProps) => {
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnType, setNewColumnType] = useState<"TEXT" | "NUMBER">("TEXT");

  const utils = api.useUtils();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get table metadata (columns)
  const { data: tableMetadata } = api.table.getTableMetadata.useQuery(
    {
      tableId: activeTab!,
      hiddenColumns: viewConditions?.hiddenColumns ?? [],
    },
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
      limit: 1000,
      filters: viewConditions?.filters ?? {},
      sort: viewConditions?.sort ?? {},
      hiddenColumns: viewConditions?.hiddenColumns ?? [],
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

    return allRows.map((row, globalIndex) => {
      const rowData = {} as TableRow;
      rowData.id = row.id;

      // Create a map of existing cells for quick lookup
      const cellMap = new Map(row.cells.map((cell) => [cell.columnId, cell]));

      // Ensure all columns have entries
      tableMetadata.columns.forEach((col) => {
        const existingCell = cellMap.get(col.id);

        if (col.name === "#") {
          rowData[col.name] = {
            value: (globalIndex + 1).toString(),
            cellId: existingCell?.id ?? "",
          };
        } else {
          rowData[col.name] = {
            value: existingCell?.value ?? "",
            cellId: existingCell?.id ?? "",
          };
        }
      });

      return rowData;
    });
  }, [tableMetadata, allRows]);

  // Virtualizer setup
  const virtualizer = useVirtualizer({
    count: data.length,
    estimateSize: () => 32,
    getScrollElement: () => scrollRef.current,
    overscan: 5,
  });

  // When scrolling to near bottom and has nextpage, fetch next page
  const handleScroll = useCallback(
    (containerRefElement?: HTMLDivElement | null) => {
      if (containerRefElement) {
        const { scrollTop, scrollHeight, clientHeight } = containerRefElement;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 500;

        if (isNearBottom && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      }
    },
    [hasNextPage, fetchNextPage, isFetchingNextPage],
  );

  useEffect(() => {
    handleScroll(scrollRef.current);
  }, [handleScroll]);

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
      // Only if table has some kind of sort, it will refresh the table
      if (viewConditions?.sort && Object.keys(viewConditions.sort).length > 0) {
        void utils.table.getTableWithDataInfinite.invalidate({
          tableId: _input.tableId,
        });
      } else {
        void utils.cell.getAll.invalidate({
          tableId: _input.tableId,
        });
      }
    },
  });

  // Create new row
  const { mutate: createRow, isPending: isCreatingRow } =
    api.row.createRow.useMutation({
      onSuccess: () => {
        void utils.table.getTableWithDataInfinite.invalidate({
          tableId: activeTab!,
        });
      },
    });

  // Create new column
  const { mutate: createColumn, isPending: isCreatingColumn } =
    api.column.createColumn.useMutation({
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

  // For navigation, flatten the matches in row/col order
  const matchPositions = useMemo(() => {
    if (!matchingCells?.length || !tableMetadata) return [];
    // Map: rowId+columnId => index
    const colOrder = tableMetadata.columns.map((col) => col.id);
    return matchingCells
      .map((cell) => {
        const rowIdx = allRows.findIndex((row) => row.id === cell.rowId);
        const colIdx = colOrder.indexOf(cell.columnId);
        return { ...cell, rowIdx, colIdx };
      })
      .filter((pos) => pos.rowIdx !== -1 && pos.colIdx !== -1)
      .sort((a, b) =>
        a.rowIdx !== b.rowIdx ? a.rowIdx - b.rowIdx : a.colIdx - b.colIdx,
      );
  }, [matchingCells, allRows, tableMetadata]);

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
              searchValue={searchValue}
            />
          );
        },
      };
    });
  }, [tableMetadata, handleUpdate, searchValue]);

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
    <div className="flex h-full flex-col">
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto"
        onScroll={(e) => handleScroll(e.currentTarget)}
      >
        <table className="w-max border border-gray-200 text-sm">
          <thead className="sticky z-40 border">
            {tableInstance.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isRowNumberColumn = header.column.id === "#";
                  const isNameColumn = header.column.id === "Name";
                  const isAgeColumn = header.column.id === "Age";
                  const column = tableMetadata.columns.find(
                    (c) => c.name === header.column.id,
                  );

                  // If name column is found, then its not hidden
                  const isNameHidden = tableMetadata.columns.find(
                    (c) => c.name === "Name",
                  )
                    ? false
                    : true;

                  // Check if this column is sorted
                  const isSorted =
                    viewConditions?.sort &&
                    Object.keys(viewConditions.sort).includes(
                      column?.name ?? "",
                    );

                  // Check if this column is filtered
                  const isFiltered =
                    viewConditions?.filters &&
                    Object.keys(viewConditions.filters).includes(
                      column?.name ?? "",
                    );

                  return (
                    <th
                      key={header.id}
                      className={`sticky top-0 z-0 border p-2 text-left ${
                        isRowNumberColumn
                          ? "left-0 z-50 w-16"
                          : isNameColumn
                            ? "left-16 z-50 w-48"
                            : isAgeColumn && !isNameHidden
                              ? "left-64 z-50 w-32"
                              : isNameHidden
                                ? "left-16"
                                : "w-32"
                      } ${isSorted ? "bg-blue-100" : "bg-gray-100"} ${
                        isFiltered ? "bg-yellow-100" : ""
                      } ${isSorted && isFiltered ? "bg-green-100" : ""}`}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    </th>
                  );
                })}
                <th className="sticky top-0 w-12 border-b bg-gray-100 p-2 text-left">
                  <AddColumnPopover
                    newColumnName={newColumnName}
                    setNewColumnName={setNewColumnName}
                    newColumnType={newColumnType}
                    setNewColumnType={setNewColumnType}
                    onSubmit={handleCreateColumn}
                    isCreating={isCreatingColumn}
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
                    const isNameColumn = cell.column.id === "Name";
                    const isAgeColumn = cell.column.id === "Age";
                    const cellData: Cell = row.getValue(cell.column.id);
                    const column = tableMetadata.columns.find(
                      (c) => c.name === cell.column.id,
                    );

                    // If name column is found, then its not hidden
                    const isNameHidden = tableMetadata.columns.find(
                      (c) => c.name === "Name",
                    )
                      ? false
                      : true;

                    const isDefaultColumn =
                      isRowNumberColumn || isNameColumn || isAgeColumn;

                    // Check if this column is sorted or filtered
                    const isSorted =
                      viewConditions?.sort &&
                      Object.keys(viewConditions.sort).includes(
                        column?.name ?? "",
                      );
                    const isFiltered =
                      viewConditions?.filters &&
                      Object.keys(viewConditions.filters).includes(
                        column?.name ?? "",
                      );

                    // Find if this cell is a match
                    const isMatch = matchingCells?.some(
                      (mc) => mc.id === cellData.cellId,
                    );
                    // Find the index in matchPositions
                    const matchIdx = matchPositions.findIndex(
                      (mc) => mc.id === cellData.cellId,
                    );

                    const isCurrent = isMatch && matchIdx === currentMatchIndex;

                    return (
                      <td
                        key={cell.id}
                        className={`z-0 overflow-hidden border p-2 focus-within:border-blue-500 ${
                          isRowNumberColumn
                            ? "sticky left-0 z-30"
                            : isNameColumn
                              ? "sticky left-16 z-30"
                              : isAgeColumn && !isNameHidden
                                ? "sticky left-64 z-30"
                                : isNameHidden
                                  ? "sticky left-16"
                                  : "w-32"
                        } ${
                          isCurrent && isMatch
                            ? "bg-orange-400 hover:bg-orange-400"
                            : isMatch && !isCurrent
                              ? "bg-yellow-200 hover:bg-yellow-200"
                              : isSorted
                                ? "bg-blue-50"
                                : isFiltered
                                  ? "bg-green-50"
                                  : isDefaultColumn
                                    ? "bg-gray-50"
                                    : "bg-white"
                        } `}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {paddingBottom > 0 && (
              <tr>
                <td style={{ height: `${paddingBottom}px` }} />
              </tr>
            )}
            {isFetchingNextPage && (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="border bg-gray-50 p-4 text-center"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Spinner size={16} />
                    <span className="text-sm text-gray-600">
                      Loading more rows...
                    </span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Sticky Add Row Button */}
      <div className="border-t border-gray-200 bg-white">
        <button
          onClick={handleAddRow}
          disabled={isCreatingRow}
          className="w-full p-3 text-left text-sm hover:cursor-pointer hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isCreatingRow ? (
            <div className="flex items-center gap-2">
              <Spinner size={16} />
              <span>Adding row...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Plus strokeWidth={1.5} size={16} />
              <span>Add row</span>
            </div>
          )}
        </button>
      </div>
    </div>
  );
};

export default Table;
