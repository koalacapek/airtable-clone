import {
  ArrowUpNarrowWide,
  ChevronDown,
  LayoutGrid,
  LayoutPanelTop,
  Menu,
  Palette,
  Plus,
  Share,
} from "lucide-react";
import type { IOptionsTabProps } from "~/type";
import SortTableButton from "./SortTableButton";
import { api } from "~/trpc/react";
import FilterTableButton from "./FilterTableButton";
import { useCallback } from "react";
import HideFieldsButton from "./HideFieldsButton";
import SearchTableButton from "./SearchTableButton";
import Spinner from "./Spinner";

const OptionsTab = ({
  activeTab,
  viewConditions,
  activeView,
  onSearchChange,
  matchingCells,
  currentMatchIndex,
  onNextMatch,
  onPrevMatch,
  openView,
  setOpenView,
}: IOptionsTabProps) => {
  const utils = api.useUtils();
  const { mutate: updateView } = api.view.update.useMutation({
    onSuccess: async () => {
      // Invalidate all table data queries for this table to ensure UI updates
      // We need to invalidate all possible parameter combinations
      await utils.table.getTableWithDataInfinite.invalidate();
      await utils.table.getTableMetadata.invalidate({ tableId: activeTab! });
      // Also invalidate the view queries to ensure the sidebar updates
      if (activeTab) {
        await utils.view.getAllByTable.invalidate({ tableId: activeTab });
      }
    },
  });

  const { data: viewDetails } = api.view.getDetails.useQuery(
    {
      id: activeView!,
    },
    {
      enabled: !!activeView,
    },
  );

  // Create bulk rows mutation
  const { mutate: createBulkRows, isPending: isCreatingBulkRows } =
    api.row.createBulkRows.useMutation({
      onSuccess: () => {
        void utils.table.getTableWithDataInfinite.invalidate({
          tableId: activeTab!,
        });
      },
    });

  const handleCreate100kRows = useCallback(() => {
    if (!activeTab) return;
    createBulkRows({ tableId: activeTab, count: 100000 });
  }, [activeTab, createBulkRows]);

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
    <div className="flex w-full justify-between border-b border-gray-200 p-2 pe-4 pl-5">
      {/* Grid */}
      <div className="flex items-center gap-x-4">
        <div
          className="flex items-center gap-x-1 rounded-sm p-2 hover:cursor-pointer hover:bg-gray-200/80"
          onClick={() => setOpenView?.(!openView)}
        >
          <Menu strokeWidth={1.5} size={16} />
        </div>

        <div className="flex items-center justify-center gap-x-1.5 rounded-sm p-2 hover:cursor-pointer hover:bg-gray-200/80">
          <LayoutPanelTop size={16} color="#176ee0" />
          <p className="text-xs font-semibold text-black">
            {viewDetails?.name ?? "View"}
          </p>
          <ChevronDown strokeWidth={1.5} size={16} />
        </div>
      </div>

      {/* Filter, Sort, etc. */}
      <div className="flex items-center gap-x-3">
        {/* Visibility */}

        <button
          onClick={handleCreate100kRows}
          disabled={isCreatingBulkRows}
          className="flex items-center gap-x-1 rounded-sm p-2 hover:cursor-pointer hover:bg-gray-200/80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isCreatingBulkRows ? (
            <Spinner size={16} />
          ) : (
            <Plus strokeWidth={1.5} size={16} />
          )}
          <p className="text-xs">
            {isCreatingBulkRows ? "Adding rows..." : "Add 100k row"}
          </p>
        </button>

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
          onUpdate={onSearchChange!}
          totalMatches={matchingCells?.length ?? 0}
          currentMatchIndex={currentMatchIndex}
          onNextMatch={onNextMatch}
          onPrevMatch={onPrevMatch}
          activeView={activeView}
        />
      </div>
    </div>
  );
};
export default OptionsTab;
