"use client";

import {
  Home,
  Star,
  ChevronDown,
  ChevronRight,
  Share2,
  Users,
  Plus,
  BookOpen,
  Package,
  Upload,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import Spinner from "./Spinner";

export default function Sidebar() {
  const session = useSession();
  const router = useRouter();

  const { mutate, isPending } = api.base.create.useMutation({
    onSuccess: (newBase) => {
      console.log("Base created:", newBase);
      // e.g., redirect or refetch
      router.push(`/base/${newBase.id}`);
    },
  });

  return (
    <div className="border-gray-1 flex w-75 flex-col justify-between border-r px-3 pt-3 pb-5">
      {/* Top section */}
      <div className="space-y-3">
        {/* Home */}
        <div className="flex items-center gap-2 rounded-md bg-gray-100 p-2 px-3 font-medium">
          <Home size={18} strokeWidth={1.5} />
          <span>Home</span>
        </div>

        {/* Starred */}
        <div className="flex flex-col gap-y-2">
          <div className="flex items-center justify-between px-3 py-1 text-sm font-medium text-black">
            <div className="flex items-center gap-2">
              <Star size={16} strokeWidth={1.5} />
              <span>Starred</span>
            </div>
            <ChevronDown size={14} strokeWidth={1.5} />
          </div>
          <div className="text-gray-2 flex items-center gap-x-2 pt-1 pl-2 text-[11px]">
            <div className="border-gray-1 rounded-sm border p-2 px-3">
              <Star size={14} strokeWidth={1.5} />
            </div>
            <p>
              Your starred bases, interfaces, and workspaces will appear here
            </p>
          </div>
        </div>

        {/* Shared */}
        <div className="flex items-center gap-2 px-3 py-1 text-sm font-medium text-black">
          <Share2 size={16} strokeWidth={1.5} />
          <span>Shared</span>
        </div>

        {/* Workspaces */}
        <div className="flex items-center justify-between px-3 py-1 text-sm font-medium text-black">
          <div className="flex items-center gap-2">
            <Users size={16} strokeWidth={1.5} />
            <span>Workspaces</span>
          </div>
          <div className="flex items-center gap-x-3">
            <Plus size={16} strokeWidth={1.5} />
            <ChevronRight size={14} strokeWidth={1.5} />
          </div>
        </div>
      </div>

      {/* Bottom section */}
      <div className="text-gray-4 flex flex-col gap-y-4 border-t border-gray-200 pt-4 text-xs">
        <Link href="#" className="flex items-center gap-x-1 px-2">
          <BookOpen size={16} strokeWidth={1.5} />
          Templates and apps
        </Link>
        <Link href="#" className="flex items-center gap-x-1 px-2">
          <Package size={16} strokeWidth={1.5} />
          Marketplace
        </Link>

        <Link href="#" className="flex items-center gap-x-1 px-2">
          <Upload size={16} strokeWidth={1.5} />
          Import
        </Link>
        {/* Create button */}

        {!isPending ? (
          <button
            onClick={() => mutate({})}
            className="bg-blue-1 mt-2 flex w-full items-center justify-center gap-2 rounded-md px-4 py-2 font-semibold text-white shadow hover:cursor-pointer hover:bg-blue-700"
          >
            <Plus size={16} strokeWidth={1.5} />
            Create
          </button>
        ) : (
          <button
            disabled
            className="bg-blue-1 mt-2 flex w-full items-center justify-center gap-2 rounded-md px-4 py-2 font-semibold text-white opacity-50 shadow"
          >
            <Spinner />
            Creating...
          </button>
        )}
      </div>
    </div>
  );
}
