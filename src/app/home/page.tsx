"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { api } from "~/trpc/react";
import BaseCard from "../_components/BaseCard";

const HomePage = () => {
  const session = useSession();
  if (!session) redirect("/");

  const { data, isLoading } = api.base.getAll.useQuery(undefined, {
    enabled: !!session.data?.user,
    refetchOnWindowFocus: false,
  });

  return (
    <main className="flex h-full flex-col bg-gray-100">
      <div className="text-gray-4 p-10 text-3xl font-bold">
        <h1>Home</h1>
      </div>

      {data && data.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 p-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {data.map((base) => (
            <BaseCard
              id={base.id}
              userId={base.userId}
              name={base.name}
              createdAt={base.createdAt}
              key={base.id}
            />
          ))}
        </div>
      ) : isLoading ? (
        <div className="flex h-full items-center justify-center">
          <p>Loading...</p>
        </div>
      ) : (
        <div className="flex h-full items-center justify-center">
          <p>No bases found. Create a new base to get started!</p>
        </div>
      )}
    </main>
  );
};

export default HomePage;
