import { Plus } from "lucide-react";
import { useState } from "react";
import { Input } from "~/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "~/components/ui/select";

const AddColumnPopover = ({
  newColumnName,
  newColumnType,
  setNewColumnName,
  setNewColumnType,
  onSubmit,
}: {
  newColumnName: string;
  newColumnType: "TEXT" | "NUMBER";
  setNewColumnName: (s: string) => void;
  setNewColumnType: (s: "TEXT" | "NUMBER") => void;
  onSubmit: () => void;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={() => setOpen(true)}
          className="w-full p-2 text-left text-sm hover:cursor-pointer hover:bg-gray-100"
        >
          <Plus strokeWidth={1.5} size={16} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-2">
        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium">Column Name</label>
          <Input
            type="text"
            className="border p-1 text-sm"
            value={newColumnName}
            onChange={(e) => setNewColumnName(e.target.value)}
            placeholder="Enter name"
          />
        </div>
        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium">Type</label>
          <Select
            value={newColumnType}
            onValueChange={(val) => setNewColumnType(val as "TEXT" | "NUMBER")}
          >
            <SelectTrigger className="w-full border p-1 text-sm">
              {newColumnType === "TEXT" ? "Text" : "Number"}
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="TEXT">Text</SelectItem>
                <SelectItem value="NUMBER">Number</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <button
          onClick={() => {
            onSubmit();
            setOpen(false);
          }}
          className="w-full rounded bg-blue-600 py-1 text-sm text-white hover:bg-blue-700"
        >
          Add Column
        </button>
      </PopoverContent>
    </Popover>
  );
};

export default AddColumnPopover;
