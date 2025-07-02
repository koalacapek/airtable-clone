// _components/BaseList.tsx
"use client";

import { api } from "~/trpc/react";
import BaseCard from "./BaseCard";
import Spinner from "./Spinner";

const BaseList = () => {
  const utils = api.useUtils();

  const { data: bases, isLoading } = api.base.getAll.useQuery();

  const { mutate: deleteBase } = api.base.delete.useMutation({
    onMutate: async ({ id }) => {
      await utils.base.getAll.cancel();

      const previousData = utils.base.getAll.getData();
      utils.base.getAll.setData(undefined, (old) =>
        old?.filter((base) => base.id !== id),
      );

      return { previousData };
    },

    onError: (_err, _input, context) => {
      if (context?.previousData) {
        utils.base.getAll.setData(undefined, context.previousData);
      }
    },

    onSettled: () => {
      void utils.base.getAll.invalidate();
    },
  });

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
        <BaseCard
          key={base.id}
          {...base}
          handleDelete={(id) => deleteBase({ id })}
        />
      ))}
    </div>
  );
};

export default BaseList;
