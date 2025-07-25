"use client";

import { useEffect, useState, useCallback } from "react";
import TableTabs from "./TableTabs";
import { api } from "~/trpc/react";
import Table from "./Table";
import OptionsTab from "./OptionsTab";
import ViewsSidebar from "./ViewsSidebar";
import Spinner from "./Spinner";

const BaseContent = ({ baseId }: { baseId: string }) => {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<string | null>(null);
  const [viewConditions, setViewConditions] = useState<{
    filters: Record<string, unknown>;
    sort: Record<string, unknown>;
    hiddenColumns: string[];
  } | null>(null);
  const [searchValue, setSearchValue] = useState<string>("");
  const [matchingCells, setMatchingCells] = useState<
    {
      id: string;
      rowId: string;
      columnId: string;
    }[]
  >([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [openView, setOpenView] = useState(true);
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

  // Load persisted state from localStorage on mount
  useEffect(() => {
    try {
      const persistedActiveTab = localStorage.getItem(`activeTab_${baseId}`);
      if (persistedActiveTab) {
        setActiveTab(persistedActiveTab);
      }
    } catch (error) {
      console.error("Error loading persisted state:", error);
    }
  }, [baseId]);

  // Persist activeTab to localStorage whenever it changes
  useEffect(() => {
    if (activeTab) {
      try {
        localStorage.setItem(`activeTab_${baseId}`, activeTab);
      } catch (error) {
        console.error("Error persisting activeTab:", error);
      }
    }
  }, [activeTab, baseId]);

  // Fetch tables
  const { data: tables } = api.table.getAllByBase.useQuery({
    baseId,
  });

  const { data: cells } = api.table.getMatchingCellIds.useQuery(
    activeTab && searchValue && searchValue.trim() !== ""
      ? {
          tableId: activeTab,
          searchValue,
          hiddenColumns: viewConditions?.hiddenColumns ?? [],
          filters: viewConditions?.filters ?? {},
        }
      : {
          tableId: "",
          searchValue: "",
          hiddenColumns: [],
          filters: {},
        },
    { enabled: !!activeTab && !!searchValue && searchValue.trim() !== "" },
  );

  // {"conditions":[{"value":"ro","column":"fsdf","operator":"contains"},{"value":"300","column":"Age","operator":"smaller","logicalOperator":"AND"},{"value":"Mrs. Sherry Denesik-Grady","column":"sdfdsf","operator":"contains","logicalOperator":"AND"}],"logicalType":"AND"}
  useEffect(() => {
    setMatchingCells(cells ?? []);
    const handleRefetchMatchingCells = async () => {
      updateView({
        id: activeView!,
        filters: {
          conditions: [
            { value: `${searchValue}`, column: "Name", operator: "contains" },
          ],
          logicalType: "AND",
        },
      });

      // try {
      //   await util.table.getTableWithDataInfinite.invalidate({
      //     tableId: activeTab!,
      //     filters: {
      //       condition: [
      //         { value: `${searchValue}`, column: "Name", operator: "contains" },
      //       ],
      //     },
      //   });
      // } catch {
      //   console.error("Erorr while refetching");
      // } finally {
      //   console.log("done");
      // }
    };

    handleRefetchMatchingCells().catch(console.error);
  }, [cells, activeTab, searchValue, updateView, activeView]);

  useEffect(() => {
    // Reset current match index when search changes or no matches
    setCurrentMatchIndex(0);
  }, [searchValue, matchingCells.length]);

  useEffect(() => {
    // Only set if activeTab hasn't been set yet
    if (!activeTab && tables?.[0]) {
      setActiveTab(tables[0].id);
    }
  }, [tables, activeTab]);

  // Validate persisted activeTab exists
  useEffect(() => {
    if (tables && activeTab) {
      const tableExists = tables.some((table) => table.id === activeTab);
      if (!tableExists) {
        // If persisted table doesn't exist, fall back to first table
        setActiveTab(tables[0]?.id ?? null);
      }
    }
  }, [tables, activeTab]);

  const handleViewChange = useCallback(
    (
      conditions: {
        filters: Record<string, unknown>;
        sort: Record<string, unknown>;
        hiddenColumns: string[];
      } | null,
    ) => {
      setViewConditions(conditions);
    },
    [],
  );

  const handleNextMatch = () => {
    if (matchingCells.length > 0) {
      setCurrentMatchIndex((prev) => (prev + 1) % matchingCells.length);
    }
  };

  const handlePrevMatch = () => {
    if (matchingCells.length > 0) {
      setCurrentMatchIndex(
        (prev) => (prev - 1 + matchingCells.length) % matchingCells.length,
      );
    }
  };

  if (!tables) {
    return (
      <div className="flex h-full items-center justify-center p-10">
        <Spinner size={24} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <TableTabs baseId={baseId} active={activeTab} setActive={setActiveTab} />
      <OptionsTab
        activeTab={activeTab}
        viewConditions={viewConditions}
        activeView={activeView}
        onSearchChange={setSearchValue}
        matchingCells={matchingCells}
        currentMatchIndex={currentMatchIndex}
        onNextMatch={handleNextMatch}
        onPrevMatch={handlePrevMatch}
        openView={openView}
        setOpenView={setOpenView}
      />
      <div className="flex flex-1 overflow-hidden">
        <ViewsSidebar
          tableId={activeTab}
          activeView={activeView}
          setActiveView={setActiveView}
          onViewChange={handleViewChange}
          openView={openView}
        />
        <div className="flex-1 overflow-auto">
          <Table
            activeTab={activeTab}
            viewConditions={viewConditions}
            searchValue={searchValue}
            matchingCells={matchingCells}
            currentMatchIndex={currentMatchIndex}
          />
        </div>
      </div>
    </div>
  );
};

export default BaseContent;
