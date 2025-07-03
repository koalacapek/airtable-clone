// _components/BaseList.tsx
"use client";

import { api } from "~/trpc/react";
import BaseCard from "./BaseCard";
import Spinner from "./Spinner";

const BaseList = () => {
  const utils = api.useUtils();

  const { data: bases, isLoading } = api.base.getAll.useQuery();

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

  return (
    <div className="grid grid-cols-1 gap-4 p-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {bases?.map((base) => (
        <BaseCard key={base.id} {...base} />
      ))}
    </div>
  );
};

export default BaseList;
