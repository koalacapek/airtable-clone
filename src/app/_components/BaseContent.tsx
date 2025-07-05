"use client";

import { useEffect, useState } from "react";
import TableTabs from "./TableTabs";
import { api } from "~/trpc/react";
import Table from "./Table";

const BaseContent = ({ baseId }: { baseId: string }) => {
  const [activeTab, setActiveTab] = useState<string | null>(null);

  // Fetch tables
  const { data: tables } = api.table.getAllByBase.useQuery({
    baseId,
  });

  useEffect(() => {
    // Only set if activeTab hasn't been set yet
    if (!activeTab && tables?.[0]) {
      setActiveTab(tables[0].id);
    }
  }, [tables, activeTab]);

  return (
    <div className="flex h-full flex-col">
      <TableTabs baseId={baseId} active={activeTab} setActive={setActiveTab} />
      <Table activeTab={activeTab} />
    </div>
  );
};

export default BaseContent;
