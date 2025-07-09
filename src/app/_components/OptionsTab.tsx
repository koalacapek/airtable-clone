import {
  ArrowUpNarrowWide,
  ChevronDown,
  LayoutGrid,
  LayoutPanelTop,
  Menu,
  Palette,
  Search,
  Share,
} from "lucide-react";
import type { IOptionsTabProps } from "~/type";
import SortTableButton from "./SortTableButton";
import { api } from "~/trpc/react";
import FilterTableButton from "./FilterTableButton";
import { useCallback } from "react";
import HideFieldsButton from "./HideFieldsButton";
import SearchTableButton from "./SearchTableButton";

const OptionsTab = ({
  activeTab,
  viewConditions,
  activeView,
  baseId,
  searchValue,
  onSearchChange,
  matchingCells,
}: IOptionsTabProps) => {
  const utils = api.useUtils();
  const { mutate: updateView } = api.view.update.useMutation({
    onSuccess: async () => {
      // Invalidate all table data queries for this table to ensure UI updates
      // We need to invalidate all possible parameter combinations
      await utils.table.getTableWithDataInfinite.invalidate();
      await utils.table.getTableMetadata.invalidate({ tableId: activeTab! });
      // Also invalidate the view queries to ensure the sidebar updates
      if (baseId) {
        await utils.view.getAllByBase.invalidate({ baseId });
      }
    },
  });

  const handleUpdateFilter = useCallback(
    (filters: Record<string, unknown>) => {
      if (activeView) {
        updateView({
          id: activeView,
          filters,
        });
      }
    },
    [activeView, updateView],
  );

  // For hidden fields update, getTableMetada excluding hidden columns
  const handleUpdateHiddenFields = useCallback(
    (hiddenFields: string[]) => {
      if (activeView) {
        updateView({
          id: activeView,
          hiddenColumns: hiddenFields,
        });
      }
    },
    [activeView, updateView],
  );

  return (
    <div className="flex w-full justify-between p-2 pe-4 pl-5">
      {/* Grid */}
      <div className="flex items-center gap-x-6">
        <div>
          <Menu strokeWidth={1.5} size={16} />
        </div>

        <div className="flex items-center justify-center gap-x-1.5 rounded-sm p-2 hover:cursor-pointer hover:bg-gray-200/80">
          <LayoutPanelTop strokeWidth={1.5} size={16} />
          <p className="text-xs font-semibold text-black">Grid View</p>
          <ChevronDown strokeWidth={1.5} size={16} />
        </div>
      </div>

      {/* Filter, Sort, etc. */}
      <div className="flex items-center gap-x-3">
        {/* Visibility */}
        {/* <div className="flex items-center gap-x-1 rounded-sm p-2 hover:cursor-pointer hover:bg-gray-200/80">
          <EyeOff strokeWidth={1.5} size={16} />
          <p className="text-xs">Hide fields</p>
        </div> */}
        <HideFieldsButton
          activeTab={activeTab!}
          hiddenFields={viewConditions?.hiddenColumns ?? []}
          onUpdate={handleUpdateHiddenFields}
        />

        {/* Filter */}
        <FilterTableButton
          activeTab={activeTab!}
          filters={viewConditions?.filters}
          onUpdate={handleUpdateFilter}
        />
        {/* <div className="flex items-center gap-x-1 rounded-sm p-2 hover:cursor-pointer hover:bg-gray-200/80">
          <Filter strokeWidth={1.5} size={16} />
          <p className="text-xs">Filter</p>
        </div> */}

        {/* Group */}
        <div className="flex items-center gap-x-1 rounded-sm p-2 hover:cursor-pointer hover:bg-gray-200/80">
          <LayoutGrid strokeWidth={1.5} size={16} />
          <p className="text-xs">Group</p>
        </div>

        {/* Sort */}
        <SortTableButton
          activeTab={activeTab!}
          sortConditions={viewConditions?.sort}
          onUpdate={(sortConditions) => {
            if (activeView) {
              updateView({
                id: activeView,
                sort: sortConditions,
              });
            }
          }}
        />

        {/* Color */}
        <div className="flex items-center gap-x-1 rounded-sm p-2 hover:cursor-pointer hover:bg-gray-200/80">
          <Palette strokeWidth={1.5} size={16} />
          <p className="text-xs">Color</p>
        </div>

        {/* Row Height */}
        <div className="flex items-center gap-x-1 rounded-sm p-2 hover:cursor-pointer hover:bg-gray-200/80">
          <ArrowUpNarrowWide strokeWidth={1.5} size={16} />
        </div>

        {/* Share and sync */}
        <div className="flex items-center gap-x-1 rounded-sm p-2 hover:cursor-pointer hover:bg-gray-200/80">
          <Share strokeWidth={1.5} size={16} />
          <p className="text-xs">Share and sync</p>
        </div>

        {/* Search */}
        <SearchTableButton
          activeTab={activeTab!}
          searchValue={searchValue}
          onUpdate={onSearchChange!}
          totalMatches={matchingCells?.length ?? 0}
          currentMatchIndex={0}
          onNextMatch={() => {
            console.log("next match");
          }}
          onPrevMatch={() => {
            console.log("prev match");
          }}
        />
      </div>
    </div>
  );
};
export default OptionsTab;
