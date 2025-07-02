"use client";

import { useState } from "react";
import TableTabs from "./TableTabs";
import type { ColumnDef } from "@tanstack/react-table";
import Table from "./Table";

export type Person = {
  id: string;
  name: string;
  age: number;
  email: string;
};
const BaseContent = ({ baseId }: { baseId: string }) => {
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const data: Person[] = [
    { id: "1", name: "Alice", age: 25, email: "alice@example.com" },
    { id: "2", name: "Bob", age: 30, email: "bob@example.com" },
    { id: "3", name: "Charlie", age: 28, email: "charlie@example.com" },
  ];

  const columns: ColumnDef<Person>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ getValue }) => (
        <input
          className="w-full border-none bg-transparent outline-none"
          defaultValue={getValue() as string}
          onChange={(e) => {
            // No-op for now — eventually update state/db here
            console.log("Name changed:", e.target.value);
          }}
        />
      ),
    },
    {
      accessorKey: "age",
      header: "Age",
      cell: ({ getValue }) => (
        <input
          className="w-full border-none bg-transparent outline-none"
          defaultValue={getValue() as string}
          onChange={(e) => {
            // No-op for now — eventually update state/db here
            console.log("Name changed:", e.target.value);
          }}
        />
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ getValue }) => (
        <input
          className="w-full border-none bg-transparent outline-none"
          defaultValue={getValue() as string}
          onChange={(e) => {
            // TODO
            console.log("Name changed:", e.target.value);
          }}
        />
      ),
    },
  ];

  return (
    <div className="h-full w-full">
      <TableTabs baseId={baseId} active={activeTab} setActive={setActiveTab} />
      <Table columns={columns} data={data} />
    </div>
  );
};

export default BaseContent;
