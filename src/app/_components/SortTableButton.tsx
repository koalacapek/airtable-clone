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

const SortTableButton = ({ activeTab }: { activeTab: string }) => {
  const utils = api.useUtils();
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [open, setOpen] = useState(false);
  const [columns, setColumns] = useState<{ name: string; id: string }[]>([]);

  const { data: columnsData } = api.table.getTableMetadata.useQuery({
    tableId: activeTab,
  });

  useEffect(() => {
    if (columnsData) {
      setColumns(columnsData.columns);
      setSortBy(columnsData.columns[1]?.name ?? "");
    }
  }, [columnsData]);

  const handleSort = async () => {
    void utils.table.getTableWithDataInfinite.refetch({
      tableId: activeTab,
      limit: 50,
      sortBy,
      sortOrder,
    });
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <div className="flex items-center gap-x-1 rounded-sm p-2 hover:cursor-pointer hover:bg-gray-200/80">
          <SortAsc strokeWidth={1.5} size={16} />
          <p className="text-xs">Sort</p>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-90 space-y-2">
        <label className="text-sm font-medium">Sort By</label>
        <div className="flex w-full gap-x-2 pt-3 pb-2">
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
                {sortOrder === "asc" ? "Ascending" : "Descending"}
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="asc">Text</SelectItem>
                  <SelectItem value="NUMBER">Number</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-x-1 rounded-sm p-2 hover:cursor-pointer hover:bg-gray-200/80">
            <X strokeWidth={1.5} size={16} />
          </div>
        </div>

        <button
          onClick={async () => {
            await handleSort();
            setOpen(false);
          }}
          className="w-full rounded bg-blue-600 py-1 text-sm text-white hover:bg-blue-700"
        >
          Add Condition
        </button>
      </PopoverContent>
    </Popover>
  );
};

export default SortTableButton;
