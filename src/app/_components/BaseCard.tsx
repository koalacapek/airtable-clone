"use client";

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Ellipsis, Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "~/trpc/react";
import type { IBase } from "~/type";

dayjs.extend(relativeTime);

type BaseCardProps = IBase & {
  variant?: "grid" | "list";
};

const BaseCard = (base: BaseCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(base.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const utils = api.useUtils();

  // Pastel color palette for avatar background
  const pastelColors = [
    "bg-red-200/80",
    "bg-orange-200/80",
    "bg-amber-200/80",
    "bg-lime-200/80",
    "bg-emerald-200/80",
    "bg-cyan-200/80",
    "bg-sky-200/80",
    "bg-indigo-200/80",
    "bg-fuchsia-200/80",
    "bg-rose-200/80",
  ] as const;

  // Prefer color coming from DB, otherwise fall back to deterministic palette pick
  const avatarColor =
    base.color ??
    pastelColors[
      Array.from(base.id).reduce((acc, char) => acc + char.charCodeAt(0), 0) %
        pastelColors.length
    ];

  useEffect(() => {
    if (isEditing) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
    }
  }, [isEditing]);

  const { mutate: deleteBase } = api.base.delete.useMutation({
    onMutate: async ({ id }) => {
      await utils.base.getAll.cancel();

      const prevData = utils.base.getAll.getData();

      utils.base.getAll.setData(undefined, (old) =>
        old?.filter((base) => base.id !== id),
      );

      return { prevData };
    },

    onError: (_err, _input, context) => {
      if (context?.prevData) {
        utils.base.getAll.setData(undefined, context.prevData);
      }
    },

    onSettled: async () => {
      await utils.base.getAll.invalidate();
    },
  });

  const { mutate: renameBase } = api.base.rename.useMutation({
    onMutate: async ({ id, name }) => {
      // Optimistically update the base name
      await utils.base.getAll.cancel();
      const previousBases = utils.base.getAll.getData();

      utils.base.getAll.setData(undefined, (old) =>
        old?.map((b) => (b.id === id ? { ...b, name: name!.trim() } : b)),
      );

      return { previousBases };
    },

    onError: (error) => {
      console.error("Failed to rename base:", error);
      // Rollback to previous bases if rename fails
      utils.base.getAll.setData(undefined, (previousBases) => previousBases);
    },
    onSettled: async () => {
      await utils.base.getAll.invalidate();
      setIsEditing(false);
    },
  });

  const handleRename = () => {
    if (newName.trim() !== base.name) {
      renameBase({ id: base.id, name: newName.trim() });
    } else {
      setIsEditing(false);
    }
  };

  const router = useRouter();
  const isList = base.variant === "list";

  const infoContainerClass = isList
    ? "flex items-center gap-x-6"
    : "flex flex-col gap-y-2";

  return (
    <div
      key={base.id}
      className={`group flex items-center gap-x-3 ${
        isList
          ? "border-b px-2 py-3 hover:bg-gray-50"
          : "rounded-lg bg-white p-5 shadow transition-shadow hover:shadow-lg"
      } hover:cursor-pointer`}
      onClick={() => {
        void router.push(
          `/base/${base.id}?name=${encodeURIComponent(base.name)}`,
        );
      }}
    >
      <div
        className={`flex min-w-14 justify-center rounded-lg ${avatarColor} p-4`}
      >
        <h1 className="text-sm font-semibold text-gray-700">
          {base.name[0]?.toUpperCase() + base.name.slice(1, 2)}
        </h1>
      </div>
      <div className={infoContainerClass}>
        {isEditing ? (
          <input
            ref={inputRef}
            value={newName}
            type="text"
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded border p-1 text-xs"
          />
        ) : (
          <h2 className="text-xs">{newName}</h2>
        )}
        <p className="text-xs text-gray-500">
          Created {dayjs(base.createdAt).fromNow()}
        </p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger className="border-gray-1 ml-auto cursor-pointer self-start rounded-md border p-2 opacity-0 group-hover:opacity-100">
          <Ellipsis size={12} strokeWidth={1.5} />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem asChild>
            <button
              className="flex w-full items-center gap-x-3 hover:cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(!isEditing);
              }}
            >
              <Pencil size={12} strokeWidth={1.5} />
              <p className="text-xs">Rename</p>
            </button>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <button
              className="flex w-full items-center gap-x-3 hover:cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                deleteBase({ id: base.id });
              }}
            >
              <Trash2 size={12} strokeWidth={1.5} />
              <p className="text-xs">Delete</p>
            </button>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default BaseCard;
