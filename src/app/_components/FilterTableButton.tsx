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
    {
      filterBy?: string;
      filterOperator?: string;
      filterValue?: string;
    }[]
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

  // Update filterInputs when filters prop changes (e.g., when switching views)
  useEffect(() => {
    if (filters && Object.keys(filters).length > 0) {
      const newFilterInputs: {
        filterBy?: string;
        filterOperator?: string;
        filterValue?: string;
      }[] = [];

      Object.entries(filters).forEach(([columnName, config]) => {
        // Each column can now store an array of filter configs
        const filterConfigs = Array.isArray(config) ? config : [config];
        filterConfigs.forEach((fc) => {
          const filterConfig = fc as { op: string; value?: string };
          newFilterInputs.push({
            filterBy: columnName,
            filterOperator: filterConfig.op,
            filterValue: filterConfig.value ?? "",
          });
        });
      });
      setFilterInputs(newFilterInputs);
    } else {
      // Reset to empty state when no filters
      setFilterInputs([
        { filterBy: undefined, filterOperator: "", filterValue: "" },
      ]);
    }
  }, [filters]);

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
    newInputs.splice(index, 1);
    // If no filters remain, provide a blank input row so the UI isn't empty
    if (newInputs.length === 0) {
      newInputs.push({
        filterBy: undefined,
        filterOperator: "",
        filterValue: "",
      });
      // Immediately clear all filters in parent state
      onUpdate({});
    }
    setFilterInputs(newInputs);
  };

  // Debounce update for all filters
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!filterInputs.length) return;
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      const newFilters: Record<string, { op: string; value?: string }[]> = {};
      filterInputs.forEach((input) => {
        if (!input.filterBy || !input.filterOperator) return;
        if (
          input.filterOperator === "is_empty" ||
          input.filterOperator === "is_not_empty" ||
          input.filterValue // only apply if value is not empty for value-based ops
        ) {
          let filterObj: { op: string; value?: string };
          if (input.filterOperator === "is_empty") {
            filterObj = { op: "is_empty" };
          } else if (input.filterOperator === "is_not_empty") {
            filterObj = { op: "is_not_empty" };
          } else {
            filterObj = {
              op: input.filterOperator,
              value: input.filterValue,
            };
          }

          if (newFilters[input.filterBy ?? ""]) {
            newFilters[input.filterBy ?? ""]?.push(filterObj);
          } else {
            newFilters[input.filterBy ?? ""] = [filterObj];
          }
        }
      });
      onUpdate(newFilters);
      console.log(newFilters);
    }, 400);
    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [filterInputs, onUpdate]);

  return (
    <Popover>
      <PopoverTrigger>
        {(() => {
          const activeCount = filterInputs.filter(
            (f) =>
              f.filterBy &&
              f.filterOperator &&
              (f.filterOperator === "is_empty" ||
                f.filterOperator === "is_not_empty" ||
                f.filterValue),
          ).length;
          return (
            <div
              className={`flex items-center gap-x-1 rounded-sm p-2 hover:cursor-pointer ${
                activeCount > 0 ? "bg-green-200/80" : "hover:bg-gray-200/80"
              }`}
            >
              <Filter strokeWidth={1.5} size={16} />
              <p className="text-xs">
                {activeCount > 0
                  ? `Filtered by ${activeCount} ${
                      activeCount === 1 ? "field" : "fields"
                    }`
                  : "Filter"}
              </p>
            </div>
          );
        })()}
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
