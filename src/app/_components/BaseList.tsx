"use client";

import { api } from "~/trpc/react";
import BaseCard from "./BaseCard";
import Spinner from "./Spinner";
import { LayoutGrid, List } from "lucide-react";
import { useState } from "react";

const BaseList = () => {
  const { data: bases, isLoading } = api.base.getAll.useQuery();

  // Toggle between grid and list view
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-10">
        <Spinner size={24} />
      </div>
    );
  }

  if (bases?.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-10">
        <p className="text-lg font-medium text-gray-500">
          No bases found. Create a new base to get started.
        </p>
      </div>
    );
  }

  const containerClass =
    viewMode === "grid"
      ? "grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
      : "flex flex-col";

  return (
    <>
      {/* Toggle Buttons */}
      <div className="mb-3 flex justify-end gap-2">
        <button
          onClick={() => setViewMode("grid")}
          className={`rounded-md border p-2 transition-colors hover:bg-gray-200 ${viewMode === "grid" ? "bg-gray-200" : "bg-white"}`}
        >
          <LayoutGrid size={16} />
        </button>
        <button
          onClick={() => setViewMode("list")}
          className={`rounded-md border p-2 transition-colors hover:bg-gray-200 ${viewMode === "list" ? "bg-gray-200" : "bg-white"}`}
        >
          <List size={16} />
        </button>
      </div>

      <div className={containerClass}>
        {bases?.map((base) => (
          <BaseCard key={base.id} {...base} variant={viewMode} />
        ))}
      </div>
    </>
  );
};

export default BaseList;
