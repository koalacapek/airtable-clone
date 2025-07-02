"use client";

import type { IBaseCardProps } from "~/type";
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

dayjs.extend(relativeTime);

const BaseCard = (base: IBaseCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(base.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const utils = api.useUtils();

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
  return (
    <div
      key={base.id}
      className="group flex items-center gap-x-3 rounded-lg bg-white p-5 shadow transition-shadow hover:cursor-pointer hover:shadow-lg"
      onClick={() => {
        void router.push(
          `/base/${base.id}?name=${encodeURIComponent(base.name)}`,
        );
      }}
    >
      <div className="flex min-w-14 justify-center rounded-lg border bg-black p-4 text-white">
        <h1>{base.name[0]?.toUpperCase() + base.name.slice(1, 2)}</h1>
      </div>
      <div className="flex flex-col gap-y-2">
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
              className="flex w-full items-center gap-x-3"
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
              className="flex w-full items-center gap-x-3"
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
