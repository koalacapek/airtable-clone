"use client";

import { useState, useEffect } from "react";
import { Plus, Eye, MoreHorizontal, Edit, Trash2 } from "lucide-react";
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
  baseId,
}: IViewsSidebarProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newViewName, setNewViewName] = useState("");
  const utils = api.useUtils();

  // Fetch views for the current base
  const { data: views, isLoading } = api.view.getAllByBase.useQuery(
    { baseId: baseId! },
    { enabled: !!baseId },
  );

  // Auto-select the first view if no view is currently selected
  useEffect(() => {
    if (views && views.length > 0 && !activeView) {
      setActiveView(views[0]?.id ?? null);
    }
  }, [views, activeView, setActiveView]);

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
        void utils.view.getAllByBase.invalidate({ baseId: baseId! });
      },
    });

  // Delete view mutation
  const { mutate: deleteView } = api.view.delete.useMutation({
    onSuccess: () => {
      if (activeView) {
        setActiveView(null);
      }
      void utils.view.getAllByBase.invalidate({ baseId: baseId! });
    },
  });

  const handleCreateView = () => {
    if (!baseId || !newViewName.trim()) return;

    createView({
      baseId: baseId,
      name: newViewName.trim(),
    });
  };

  const handleDeleteView = (viewId: string) => {
    deleteView({ id: viewId });
  };

  return (
    <div className="w-64 border-l border-gray-200 bg-gray-50 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Views</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCreating(true)}
          className="h-6 w-6 p-0"
        >
          <Plus size={14} />
        </Button>
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
                  ? "bg-blue-100 text-blue-900"
                  : "text-gray-700"
              }`}
            >
              <button
                onClick={() => setActiveView(view.id)}
                className="flex flex-1 items-center gap-2 truncate"
              >
                <Eye size={14} />
                <span className="truncate">{view.name}</span>
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
