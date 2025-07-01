"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { api } from "~/trpc/react";

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
        <div className="flex flex-col gap-4 p-10">
          {data.map((base) => (
            <div
              key={base.id}
              className="rounded-lg bg-white p-5 shadow transition-shadow hover:shadow-lg"
            >
              <h2 className="text-xl font-semibold">{base.name}</h2>
            </div>
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
