import { Filter, X } from "lucide-react";
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
import type { IFilterTableButtonProps } from "~/type";

const FilterTableButton = ({
  activeTab,
  filters,
  onUpdate,
}: IFilterTableButtonProps) => {
  const [filterBy, setFilterBy] = useState<string | undefined>(undefined);
  const [filterOperator, setFilterOperator] = useState<string>("");
  const [filterValue, setFilterValue] = useState<string>("");
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
      setFilterBy(columnsData.columns[1]?.name ?? "");
    }
  }, [columnsData, filters]);

  // Parse existing filters
  const existingFilters = filters
    ? Object.entries(filters).map(([columnName, config]) => {
        const filterConfig = config as { op: string; value?: string };
        return {
          columnName,
          op: filterConfig.op,
          value: filterConfig.value ?? undefined,
        };
      })
    : [];

  const handleRemoveFilter = (columnNameToRemove: string) => {
    if (filters) {
      const newfilters = { ...filters };
      delete newfilters[columnNameToRemove];
      onUpdate(newfilters);
    }
  };

  // Find the selected column object
  const selectedColumn = columns.find((col) => col.name === filterBy);
  const isTextColumn = selectedColumn?.type === "TEXT";

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
  const operatorOptions = isTextColumn ? textOperators : numberOperators;

  const handleAddFilter = () => {
    if (filterBy && filterOperator) {
      const newFilter: Record<string, { op: string; value?: string }> = {};
      if (filterOperator === "is_empty") {
        newFilter[filterBy] = { op: "is_empty" };
      } else if (filterOperator === "is_not_empty") {
        newFilter[filterBy] = { op: "is_not_empty" };
      } else {
        newFilter[filterBy] = { op: filterOperator, value: filterValue };
      }
      console.log(filters, newFilter);
      onUpdate({ ...filters, ...newFilter });
      setOpen(false);
      setFilterValue("");
      setFilterOperator("");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <div
          className={`flex items-center gap-x-1 rounded-sm p-2 hover:cursor-pointer ${
            existingFilters.length > 0
              ? "bg-orange-1/80"
              : "hover:bg-gray-200/80"
          }`}
        >
          <Filter strokeWidth={1.5} size={16} />
          <p className="text-xs">
            {existingFilters.length > 0
              ? `Filtered by ${existingFilters.length} ${
                  existingFilters.length === 1 ? "field" : "fields"
                }`
              : "Filter"}
          </p>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-90 space-y-4">
        {/* Existing Filters Conditions */}
        {existingFilters.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Current Filters</label>
            <div className="space-y-2">
              {existingFilters.map((filter) => (
                <div
                  key={filter.columnName}
                  className="flex items-center justify-between rounded border p-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{filter.columnName}</span>
                    {filter.op}
                    {filter.value && (
                      <span className="text-gray-500">{filter.value}</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveFilter(filter.columnName)}
                    className="rounded p-1 hover:cursor-pointer hover:bg-gray-100"
                  >
                    <X size={14} className="text-gray-500" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add New Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Add Filter</label>
          <div className="flex w-full gap-x-2">
            <div className="flex flex-1 flex-col space-y-1">
              <Select
                value={filterBy}
                onValueChange={(val) => setFilterBy(val)}
              >
                <SelectTrigger className="w-full p-1 text-sm">
                  {filterBy}
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
              <Select value={filterOperator} onValueChange={setFilterOperator}>
                <SelectTrigger className="w-full border p-1 text-sm">
                  {operatorOptions.find((op) => op.value === filterOperator)
                    ?.label ?? "Select operator"}
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
            {filterOperator !== "is_empty" &&
              filterOperator !== "is_not_empty" && (
                <div className="flex flex-1 flex-col space-y-1">
                  <input
                    className="w-full rounded border p-1 text-sm"
                    type={isTextColumn ? "text" : "number"}
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    placeholder={isTextColumn ? "Enter value" : "Enter number"}
                  />
                </div>
              )}
          </div>

          <button
            onClick={handleAddFilter}
            className="mt-2 w-full rounded bg-blue-600 py-1 text-sm text-white hover:bg-blue-700"
          >
            Add Filter
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default FilterTableButton;
