import { Search, X, ChevronUp, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { Input } from "~/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Button } from "~/components/ui/button";
import type { ISearchTableButtonProps } from "~/type";

const SearchTableButton = ({
  onUpdate,
  totalMatches = 0,
  currentMatchIndex = 0,
  onNextMatch,
  onPrevMatch,
  activeTab,
  activeView,
}: ISearchTableButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localSearchValue, setLocalSearchValue] = useState("");

  // Update search value when debounced value changes
  useEffect(() => {
    onUpdate(localSearchValue.trim());
  }, [localSearchValue, onUpdate]);

  // reset search value when active tab changes
  useEffect(() => {
    setLocalSearchValue("");
  }, [activeTab, activeView]);

  const handleClearSearch = () => {
    setLocalSearchValue("");
    setIsOpen(false);
  };

  const handleNextMatch = () => {
    if (onNextMatch) onNextMatch();
  };

  const handlePrevMatch = () => {
    if (onPrevMatch) onPrevMatch();
  };

  const hasSearchValue = localSearchValue.trim() !== "";

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger>
        <div className="flex items-center gap-x-1 rounded-sm p-2 hover:cursor-pointer hover:bg-gray-200/80">
          <Search strokeWidth={1.5} size={16} />
          <p className="text-xs">Search</p>
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 space-y-4"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="space-y-2">
          <label className="text-sm font-medium">Search all fields</label>
          <div className="relative">
            <Input
              className="w-full pr-8"
              placeholder="Search in all cells..."
              value={localSearchValue}
              onChange={(e) => setLocalSearchValue(e.target.value)}
              autoFocus
            />
            {hasSearchValue && (
              <button
                onClick={handleClearSearch}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 hover:bg-gray-100"
              >
                <X size={14} className="text-gray-500" />
              </button>
            )}
          </div>

          {hasSearchValue && totalMatches > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                {currentMatchIndex + 1} of {totalMatches}
              </p>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePrevMatch}
                  className="h-6 w-6 p-0"
                >
                  <ChevronUp size={12} />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleNextMatch}
                  className="h-6 w-6 p-0"
                >
                  <ChevronDown size={12} />
                </Button>
              </div>
            </div>
          )}

          <p className="text-xs text-gray-500">
            Search across all columns and rows. Results are case-insensitive.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default SearchTableButton;
