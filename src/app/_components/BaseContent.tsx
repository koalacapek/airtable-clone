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

  // Fetch tables
  const { data: tables } = api.table.getAllByBase.useQuery({
    baseId,
  });

  const { data: cells } = api.table.getMatchingCellIds.useQuery(
    activeTab && searchValue && searchValue.trim() !== ""
      ? { tableId: activeTab, searchValue }
      : { tableId: "", searchValue: "" },
    { enabled: !!activeTab && !!searchValue && searchValue.trim() !== "" },
  );

  console.log(cells);

  useEffect(() => {
    setMatchingCells(cells ?? []);
  }, [cells]);

  useEffect(() => {
    // Only set if activeTab hasn't been set yet
    if (!activeTab && tables?.[0]) {
      setActiveTab(tables[0].id);
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
        baseId={baseId}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        matchingCells={matchingCells}
        currentMatchIndex={currentMatchIndex}
        onNextMatch={handleNextMatch}
        onPrevMatch={handlePrevMatch}
      />
      <div className="flex flex-1 overflow-hidden">
        <ViewsSidebar
          baseId={baseId}
          activeView={activeView}
          setActiveView={setActiveView}
          onViewChange={handleViewChange}
        />
        <div className="flex-1 overflow-auto">
          <Table
            activeTab={activeTab}
            viewConditions={viewConditions}
            searchValue={searchValue}
            matchingCells={matchingCells}
            currentMatchIndex={currentMatchIndex}
            onMatchInfoChange={(totalMatches, currentIndex) => {
              setCurrentMatchIndex(currentIndex);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default BaseContent;
