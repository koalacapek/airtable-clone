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
  // Rows of sort inputs [{ sortBy, sortOrder }]
  const [sortInputs, setSortInputs] = useState<
    { sortBy?: string; sortOrder?: "asc" | "desc" }[]
  >([{ sortBy: undefined, sortOrder: undefined }]);
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
    }
  }, [columnsData]);

  // Sync sortInputs when sortConditions prop changes
  useEffect(() => {
    if (sortConditions && Object.keys(sortConditions).length > 0) {
      const newInputs: { sortBy?: string; sortOrder?: "asc" | "desc" }[] = [];
      Object.entries(sortConditions)
        .sort(
          ([, a], [, b]) =>
            ((a as { order?: number }).order ?? 0) -
            ((b as { order?: number }).order ?? 0),
        )
        .forEach(([col, cfg]) => {
          const c = cfg as { direction: "asc" | "desc" };
          newInputs.push({ sortBy: col, sortOrder: c.direction });
        });
      setSortInputs(newInputs);
    } else {
      setSortInputs([{ sortBy: undefined, sortOrder: undefined }]);
    }
  }, [sortConditions]);

  // Handle changes in a sort input row
  const handleSortInputChange = (
    index: number,
    field: "sortBy" | "sortOrder",
    value: string,
  ) => {
    const newInputs = [...sortInputs];
    const input = newInputs[index];
    if (!input) return;
    if (field === "sortBy") input.sortBy = value;
    else input.sortOrder = value as "asc" | "desc";
    setSortInputs(newInputs);
  };

  // Remove a row
  const handleRemoveSortInput = (index: number) => {
    const newInputs = [...sortInputs];
    newInputs.splice(index, 1);
    if (newInputs.length === 0) {
      newInputs.push({ sortBy: undefined, sortOrder: undefined });
      onUpdate({});
    }
    setSortInputs(newInputs);
  };

  // Add new row
  const handleAddSortInput = () => {
    setSortInputs([...sortInputs, { sortBy: undefined, sortOrder: undefined }]);
  };

  // Whenever sortInputs change, rebuild sortConditions immediately
  useEffect(() => {
    const newConditions: Record<string, unknown> = {};
    sortInputs.forEach((s, idx) => {
      if (s.sortBy && s.sortOrder) {
        newConditions[s.sortBy] = { direction: s.sortOrder, order: idx };
      }
    });
    // Only emit when actually different to avoid infinite loops
    if (
      JSON.stringify(newConditions) !== JSON.stringify(sortConditions ?? {})
    ) {
      onUpdate(newConditions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortInputs, sortConditions]);

  const isTextColumn = (colName?: string) =>
    columns.find((col) => col.name === colName)?.type === "TEXT";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        {(() => {
          const activeCount = sortInputs.filter((s) => s.sortBy).length;
          return (
            <div
              className={`flex items-center gap-x-1 rounded-sm p-2 hover:cursor-pointer ${
                activeCount > 0 ? "bg-orange-1/80" : "hover:bg-gray-200/80"
              }`}
            >
              <SortAsc strokeWidth={1.5} size={16} />
              <p className="text-xs">
                {activeCount > 0
                  ? `Sorted by ${activeCount} ${
                      activeCount === 1 ? "field" : "fields"
                    }`
                  : "Sort"}
              </p>
            </div>
          );
        })()}
      </PopoverTrigger>
      <PopoverContent className="w-full space-y-4">
        {sortInputs.map((input, idx) => {
          const textCol = isTextColumn(input.sortBy);
          return (
            <div key={idx} className="flex w-full items-center space-x-2">
              {/* Column select */}
              <div className="flex flex-1 flex-col">
                <Select
                  value={input.sortBy}
                  onValueChange={(val) =>
                    handleSortInputChange(idx, "sortBy", val)
                  }
                >
                  <SelectTrigger className="w-30 p-1 text-sm">
                    {input.sortBy ?? "Column"}
                  </SelectTrigger>
                  <SelectContent>
                    {(() => {
                      // Exclude columns already selected in other sort inputs
                      const usedColumns = sortInputs
                        .filter((_, i) => i !== idx) // other rows only
                        .map((s) => s.sortBy)
                        .filter(Boolean) as string[];

                      return columns
                        .filter(
                          (column) =>
                            column.name !== "#" &&
                            // keep the column if not used elsewhere or it's the one currently selected in this row
                            (input.sortBy === column.name ||
                              !usedColumns.includes(column.name)),
                        )
                        .map((column) => (
                          <SelectItem key={column.id} value={column.name}>
                            {column.name}
                          </SelectItem>
                        ));
                    })()}
                  </SelectContent>
                </Select>
              </div>

              {/* Order select */}
              <div className="flex flex-1 flex-col space-y-1">
                <Select
                  value={input.sortOrder}
                  onValueChange={(val) =>
                    handleSortInputChange(idx, "sortOrder", val)
                  }
                >
                  <SelectTrigger className="w-30 border p-1 text-sm">
                    {input.sortOrder
                      ? textCol
                        ? input.sortOrder === "asc"
                          ? "A-Z"
                          : "Z-A"
                        : input.sortOrder === "asc"
                          ? "Ascending"
                          : "Descending"
                      : "Order"}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="asc">
                        {textCol ? "A-Z" : "Ascending"}
                      </SelectItem>
                      <SelectItem value="desc">
                        {textCol ? "Z-A" : "Descending"}
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {/* Remove button */}
              <button
                onClick={() => handleRemoveSortInput(idx)}
                className="rounded p-1 hover:cursor-pointer hover:bg-gray-100"
              >
                <X size={14} className="text-gray-500" />
              </button>
            </div>
          );
        })}
        <button
          type="button"
          className="w-full rounded bg-blue-600 py-1 text-sm text-white hover:bg-blue-700"
          onClick={handleAddSortInput}
        >
          Add Sort
        </button>
      </PopoverContent>
    </Popover>
  );
};

export default SortTableButton;
