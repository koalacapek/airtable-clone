"use client";

import { useState, useEffect } from "react";
import { Plus, MoreHorizontal, Edit, Trash2, Grid } from "lucide-react";
import { api } from "~/trpc/react";
import type { IViewsSidebarProps } from "~/type";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import Spinner from "./Spinner";

const ViewsSidebar = ({
  activeView,
  setActiveView,
  onViewChange,
  tableId,
  openView = true,
}: IViewsSidebarProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newViewName, setNewViewName] = useState("");
  const utils = api.useUtils();

  // Fetch views for the current table
  const { data: views, isLoading } = api.view.getAllByTable.useQuery(
    { tableId: tableId! },
    { enabled: !!tableId },
  );

  // useEffect(() => {
  //   console.log(tableId, views);
  // }, [tableId, views]);

  // Auto-select the first view if no view is currently selected or when table changes
  useEffect(() => {
    if (views && views.length > 0) {
      // Check if current activeView belongs to this table
      const currentViewBelongsToTable = views.some(
        (view) => view.id === activeView,
      );
      if (!activeView || !currentViewBelongsToTable) {
        setActiveView(views[0]?.id ?? null);
      }
    }
  }, [views, activeView, setActiveView, tableId]);

  // Get current view from views array
  const currentView = views?.find((view) => view.id === activeView);

  // Notify parent when view conditions change
  useEffect(() => {
    if (currentView) {
      onViewChange({
        filters: currentView.filters as Record<string, unknown>,
        sort: currentView.sort as Record<string, unknown>,
        hiddenColumns: currentView.hiddenColumns as string[],
      });
    } else {
      onViewChange(null);
    }
  }, [currentView, onViewChange]);

  // Create new view mutation
  const { mutate: createView, isPending: isCreatingView } =
    api.view.create.useMutation({
      onSuccess: (newView) => {
        setNewViewName("");
        setIsCreating(false);
        setActiveView(newView.id);
      },
      onSettled: () => {
        void utils.view.getAllByTable.invalidate({ tableId: tableId! });
      },
    });

  // Delete view mutation
  const { mutate: deleteView } = api.view.delete.useMutation({
    onSuccess: () => {
      if (activeView) {
        setActiveView(null);
      }
    },
    onSettled: () => {
      void utils.view.getAllByTable.invalidate({ tableId: tableId! });
    },
  });

  const handleCreateView = () => {
    if (!tableId || !newViewName.trim()) return;

    createView({
      tableId: tableId,
      name: newViewName.trim(),
    });
  };

  const handleDeleteView = (viewId: string) => {
    deleteView({ id: viewId });
  };

  return (
    <div
      className={`transition-all duration-300 ease-in-out ${
        openView
          ? "w-64 translate-x-0 border p-4 pt-2 opacity-100"
          : "pointer-events-none w-0 -translate-x-full opacity-0"
      }`}
    >
      <div
        onClick={() => setIsCreating(true)}
        className="mb-3 flex items-center gap-x-2 rounded-sm p-2 hover:cursor-pointer hover:bg-gray-200"
      >
        <Plus size={14} strokeWidth={1.5} />
        <h3 className="text-xs text-gray-900">Create new...</h3>
      </div>

      {isCreating && (
        <div className="mb-3 space-y-2">
          <Input
            placeholder="View name"
            value={newViewName}
            onChange={(e) => setNewViewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleCreateView();
              } else if (e.key === "Escape") {
                setIsCreating(false);
                setNewViewName("");
              }
            }}
            className="h-8 text-sm"
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleCreateView}
              disabled={isCreatingView || !newViewName.trim()}
              className="h-6 text-xs"
            >
              {isCreatingView ? <Spinner size={12} /> : "Create"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsCreating(false);
                setNewViewName("");
              }}
              className="h-6 text-xs"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Spinner size={16} />
        </div>
      ) : views && views.length > 0 ? (
        <div className="space-y-1">
          {views.map((view) => (
            <div
              key={view.id}
              className={`group flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-gray-200 ${
                activeView === view.id
                  ? "bg-gray-200 font-semibold"
                  : "text-gray-700"
              }`}
            >
              <button
                onClick={() => setActiveView(view.id)}
                className="flex flex-1 items-center gap-2 truncate group-hover:cursor-pointer"
              >
                <Grid size={14} strokeWidth={1.5} color="#176ee0" />
                <span className="truncate text-xs">{view.name}</span>
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                  >
                    <MoreHorizontal size={12} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Edit size={12} className="mr-2" />
                    <span className="text-xs">Rename</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDeleteView(view.id)}
                    className="text-red-600"
                  >
                    <Trash2 size={12} className="mr-2" />
                    <span className="text-xs">Delete</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-4 text-center">
          <p className="text-xs text-gray-500">No views yet</p>
          <p className="mt-1 text-xs text-gray-400">
            Create a view to get started
          </p>
        </div>
      )}
    </div>
  );
};

export default ViewsSidebar;
