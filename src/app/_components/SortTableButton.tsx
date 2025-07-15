import { SortAsc, X } from "lucide-react";
import { useEffect, useState } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Select,
  SelectItem,
  SelectGroup,
  SelectContent,
  SelectTrigger,
} from "~/components/ui/select";
import { api } from "~/trpc/react";
import type { ISortTableButtonProps } from "~/type";

const SortTableButton = ({
  activeTab,
  sortConditions,
  onUpdate,
}: ISortTableButtonProps) => {
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [open, setOpen] = useState(false);
  const [columns, setColumns] = useState<
    { name: string; id: string; type: string }[]
  >([]);

  const { data: columnsData } = api.table.getTableMetadata.useQuery(
    {
      tableId: activeTab,
    },
    {
      enabled: !!activeTab,
    },
  );

  useEffect(() => {
    if (columnsData) {
      setColumns(columnsData.columns);
      setSortBy(columnsData.columns[1]?.name ?? "");
    }
  }, [columnsData, sortConditions]);

  // Parse existing sort conditions
  const existingSorts = sortConditions
    ? Object.entries(sortConditions)
        .sort(
          ([, a], [, b]) =>
            ((a as { order?: number }).order ?? 0) -
            ((b as { order?: number }).order ?? 0),
        )
        .map(([columnName, config]) => {
          const sortConfig = config as { direction: "asc" | "desc" };
          return {
            columnName,
            direction: sortConfig.direction,
          };
        })
    : [];

  const handleRemoveSort = (columnNameToRemove: string) => {
    if (!sortConditions) return;

    // Rebuild the object without the removed column and re-index the `order` fields
    const remaining = Object.entries(sortConditions)
      .filter(([col]) => col !== columnNameToRemove)
      .sort(
        ([, a], [, b]) =>
          ((a as { order?: number }).order ?? 0) -
          ((b as { order?: number }).order ?? 0),
      );

    const reordered: Record<string, unknown> = {};
    remaining.forEach(([col, cfg], idx) => {
      reordered[col] = {
        ...(cfg as { direction: "asc" | "desc" }),
        order: idx,
      };
    });

    onUpdate(reordered);
  };

  const handleAddSort = () => {
    if (!sortBy) return;

    // Determine next order index
    const existingEntries = sortConditions
      ? Object.entries(sortConditions)
      : [];
    const nextOrder = existingEntries.length;
    let isExisting = false;

    const newSortConditions: Record<string, unknown> = {};

    existingEntries.forEach(([col, cfg], idx) => {
      const currentOrder = (cfg as { order?: number }).order ?? idx;
      if (col === sortBy) {
        // Update direction, keep current order
        newSortConditions[col] = { direction: sortOrder, order: currentOrder };
        isExisting = true;
      } else {
        newSortConditions[col] = {
          ...(cfg as { direction: "asc" | "desc" }),
          order: currentOrder,
        };
      }
    });

    // If it's a completely new column, append at the end
    if (!isExisting) {
      newSortConditions[sortBy] = { direction: sortOrder, order: nextOrder };
    }

    onUpdate(newSortConditions);
    setOpen(false);
  };

  // Find the selected column object
  const selectedColumn = columns.find((col) => col.name === sortBy);
  const isTextColumn = selectedColumn?.type === "TEXT";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <div
          className={`flex items-center gap-x-1 rounded-sm p-2 hover:cursor-pointer ${
            existingSorts.length > 0 ? "bg-orange-1/80" : "hover:bg-gray-200/80"
          }`}
        >
          <SortAsc strokeWidth={1.5} size={16} />
          <p className="text-xs">
            {existingSorts.length > 0
              ? `Sorted by ${existingSorts.length} ${
                  existingSorts.length === 1 ? "field" : "fields"
                }`
              : "Sort"}
          </p>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-90 space-y-4">
        {/* Existing Sort Conditions */}
        {existingSorts.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Current Sorts</label>
            <div className="space-y-2">
              {existingSorts.map((sort) => (
                <div
                  key={sort.columnName}
                  className="flex items-center justify-between rounded border p-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{sort.columnName}</span>
                    <span className="text-gray-500">
                      ({sort.direction === "asc" ? "Ascending" : "Descending"})
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveSort(sort.columnName)}
                    className="rounded p-1 hover:cursor-pointer hover:bg-gray-100"
                  >
                    <X size={14} className="text-gray-500" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add New Sort Condition */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Add Sort</label>
          <div className="flex w-full gap-x-2">
            <div className="flex flex-1 flex-col space-y-1">
              <Select value={sortBy} onValueChange={(val) => setSortBy(val)}>
                <SelectTrigger className="w-full p-1 text-sm">
                  {sortBy}
                </SelectTrigger>
                <SelectContent>
                  {columns.map(
                    (column) =>
                      column.name !== "#" && (
                        <SelectItem key={column.id} value={column.name}>
                          {column.name}
                        </SelectItem>
                      ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-1 flex-col space-y-1">
              <Select
                value={sortOrder}
                onValueChange={(val) => setSortOrder(val as "asc" | "desc")}
              >
                <SelectTrigger className="w-full border p-1 text-sm">
                  {isTextColumn
                    ? sortOrder === "asc"
                      ? "A-Z"
                      : "Z-A"
                    : sortOrder === "asc"
                      ? "Ascending"
                      : "Descending"}
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="asc">
                      {isTextColumn ? "A-Z" : "Ascending"}
                    </SelectItem>
                    <SelectItem value="desc">
                      {isTextColumn ? "Z-A" : "Descending"}
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <button
            onClick={handleAddSort}
            className="w-full rounded bg-blue-600 py-1 text-sm text-white hover:bg-blue-700"
          >
            Add Condition
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default SortTableButton;
