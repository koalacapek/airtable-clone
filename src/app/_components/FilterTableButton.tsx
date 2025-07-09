import { Filter, X } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { Input } from "~/components/ui/input";

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
import type { IFilterTableButtonProps } from "~/type";

const FilterTableButton = ({
  activeTab,
  filters,
  onUpdate,
}: IFilterTableButtonProps) => {
  const [columns, setColumns] = useState<
    { name: string; id: string; type: string }[]
  >([]);

  // Array of filter input states
  const [filterInputs, setFilterInputs] = useState<
    { filterBy?: string; filterOperator: string; filterValue: string }[]
  >([{ filterBy: undefined, filterOperator: "", filterValue: "" }]);

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

  // Operator options
  const textOperators = [
    { value: "is_empty", label: "is empty" },
    { value: "is_not_empty", label: "is not empty" },
    { value: "contains", label: "contains" },
    { value: "not_contains", label: "does not contain" },
    { value: "equal", label: "equal to" },
  ];
  const numberOperators = [
    { value: "is_empty", label: "is empty" },
    { value: "is_not_empty", label: "is not empty" },
    { value: "equal", label: "equal to" },
    { value: "greater", label: "greater than" },
    { value: "smaller", label: "less than" },
  ];

  // Handle filter input changes
  const handleFilterInputChange = (
    index: number,
    field: string,
    value: string,
  ) => {
    const newInputs = [...filterInputs];
    const input = newInputs[index];
    if (!input) return;

    if (
      field === "filterBy" ||
      field === "filterOperator" ||
      field === "filterValue"
    ) {
      input[field] = value;
      setFilterInputs(newInputs);
    }
  };

  // Add a new filter input set
  const handleAddFilterInput = () => {
    setFilterInputs([
      ...filterInputs,
      { filterBy: undefined, filterOperator: "", filterValue: "" },
    ]);
  };

  // Remove a filter input set
  const handleRemoveFilterInput = (index: number) => {
    const newInputs = [...filterInputs];
    const removed = newInputs.splice(index, 1);
    setFilterInputs(newInputs);
    // Remove from filters and call onUpdate
    if (removed[0]?.filterBy) {
      const newFilters = { ...filters };
      delete newFilters[removed[0].filterBy];
      onUpdate(newFilters);
    }
  };

  // Debounce update for all filters
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!filterInputs.length) return;
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      const newFilters: Record<string, { op: string; value?: string }> = {};
      filterInputs.forEach((input) => {
        if (!input.filterBy || !input.filterOperator) return;
        if (
          input.filterOperator === "is_empty" ||
          input.filterOperator === "is_not_empty" ||
          input.filterValue // only apply if value is not empty for value-based ops
        ) {
          if (input.filterOperator === "is_empty") {
            newFilters[input.filterBy] = { op: "is_empty" };
          } else if (input.filterOperator === "is_not_empty") {
            newFilters[input.filterBy] = { op: "is_not_empty" };
          } else {
            newFilters[input.filterBy] = {
              op: input.filterOperator,
              value: input.filterValue,
            };
          }
          onUpdate(newFilters);
        }
      });
    }, 400);
    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [filterInputs, onUpdate]);

  return (
    <Popover>
      <PopoverTrigger>
        <div
          className={`flex items-center gap-x-1 rounded-sm p-2 hover:cursor-pointer ${
            Object.keys(filters ?? {}).length > 0
              ? "bg-green-200/80"
              : "hover:bg-gray-200/80"
          }`}
        >
          <Filter strokeWidth={1.5} size={16} />
          <p className="text-xs">
            {Object.keys(filters ?? {}).length > 0
              ? `Filtered by ${Object.keys(filters ?? {}).length} ${
                  Object.keys(filters ?? {}).length === 1 ? "field" : "fields"
                }`
              : "Filter"}
          </p>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-90 space-y-4">
        {/* Render all filter input sets */}
        {filterInputs.map((input, idx) => {
          const selectedColumn = columns.find(
            (col) => col.name === input.filterBy,
          );
          const isTextColumn = selectedColumn?.type === "TEXT";
          const operatorOptions = isTextColumn
            ? textOperators
            : numberOperators;
          return (
            <div
              key={idx}
              className="mb-2 flex w-full items-center justify-center gap-x-2"
            >
              <div className="flex flex-1 flex-col space-y-1">
                <Select
                  value={input.filterBy}
                  onValueChange={(val) =>
                    handleFilterInputChange(idx, "filterBy", val)
                  }
                >
                  <SelectTrigger className="w-full p-1 text-sm">
                    {input.filterBy ?? "Column"}
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
                  value={input.filterOperator}
                  onValueChange={(val) =>
                    handleFilterInputChange(idx, "filterOperator", val)
                  }
                >
                  <SelectTrigger className="w-full border p-1 text-sm">
                    {operatorOptions.find(
                      (op) => op.value === input.filterOperator,
                    )?.label ?? "Operator"}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {operatorOptions.map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              {/* Show value input only if operator is not is_empty/is_not_empty */}
              {input.filterOperator !== "is_empty" &&
                input.filterOperator !== "is_not_empty" && (
                  <div className="flex flex-1 flex-col space-y-1">
                    <Input
                      className="w-full rounded-sm border p-1 text-sm"
                      type={isTextColumn ? "text" : "number"}
                      value={input.filterValue}
                      onChange={(e) =>
                        handleFilterInputChange(
                          idx,
                          "filterValue",
                          e.target.value,
                        )
                      }
                      placeholder={
                        isTextColumn ? "Enter value" : "Enter number"
                      }
                    />
                  </div>
                )}
              <button
                onClick={() => handleRemoveFilterInput(idx)}
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
          onClick={handleAddFilterInput}
        >
          Add Filter
        </button>
      </PopoverContent>
    </Popover>
  );
};

export default FilterTableButton;
