import { EyeOff } from "lucide-react";
import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Switch } from "~/components/ui/switch";
import { api } from "~/trpc/react";
import type { IHideFieldsButtonProps } from "~/type";

const HideFieldsButton = ({
  activeTab,
  hiddenFields,
  onUpdate,
}: IHideFieldsButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>(hiddenFields);

  const { data: columnsData } = api.table.getTableMetadata.useQuery(
    {
      tableId: activeTab,
    },
    {
      enabled: !!activeTab,
    },
  );
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger>
        <div
          className={`flex items-center gap-x-1 rounded-sm p-2 hover:cursor-pointer ${
            hiddenColumns.length > 0 ? "bg-blue-200/80" : "hover:bg-gray-200/80"
          }`}
        >
          <EyeOff strokeWidth={1.5} size={16} />
          <p className="text-xs">
            {hiddenColumns.length > 0
              ? `Hidden ${hiddenColumns.length} ${
                  hiddenColumns.length === 1 ? "field" : "fields"
                }`
              : "Hide fields"}
          </p>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-90 space-y-4">
        {/* List all columns */}
        {columnsData?.columns.map(
          (column) =>
            column.name !== "#" && (
              <div key={column.id} className="flex items-center gap-x-2">
                <Switch
                  checked={!hiddenColumns.includes(column.id)}
                  onCheckedChange={(checked) => {
                    const newHiddenColumns = !checked
                      ? [...hiddenColumns, column.id]
                      : hiddenColumns.filter((id) => id !== column.id);
                    setHiddenColumns(newHiddenColumns);
                    onUpdate(newHiddenColumns);
                  }}
                />
                <p className="text-sm">{column.name}</p>
              </div>
            ),
        )}
      </PopoverContent>
    </Popover>
  );
};

export default HideFieldsButton;
