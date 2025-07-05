import {
  ArrowUpNarrowWide,
  ChevronDown,
  EyeOff,
  Filter,
  LayoutGrid,
  LayoutPanelTop,
  Menu,
  Palette,
  Search,
  Share,
  SortAsc,
} from "lucide-react";

const OptionsTab = () => {
  return (
    <div className="flex w-full justify-between p-3 pe-2 pl-5">
      {/* Grid */}
      <div className="flex items-center gap-x-6">
        <div>
          <Menu strokeWidth={1.5} size={16} />
        </div>

        <div className="flex items-center justify-center gap-x-1.5">
          <LayoutPanelTop strokeWidth={1.5} size={16} />
          <p className="text-xs font-medium">Grid View</p>
          <ChevronDown strokeWidth={1.5} size={16} />
        </div>
      </div>

      {/* Filter, Sort, etc. */}
      <div className="flex items-center gap-x-7">
        {/* Visibility */}
        <div className="flex items-center gap-x-1">
          <EyeOff strokeWidth={1.5} size={16} />
          <p className="text-xs">Hide fields</p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-x-1">
          <Filter strokeWidth={1.5} size={16} />
          <p className="text-xs">Filter</p>
        </div>

        {/* Group */}
        <div className="flex items-center gap-x-1">
          <LayoutGrid strokeWidth={1.5} size={16} />
          <p className="text-xs">Group</p>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-x-1">
          <SortAsc strokeWidth={1.5} size={16} />
          <p className="text-xs">Sort</p>
        </div>

        {/* Color */}
        <div className="flex items-center gap-x-1">
          <Palette strokeWidth={1.5} size={16} />
          <p className="text-xs">Color</p>
        </div>

        {/* Row Height */}
        <div className="flex items-center gap-x-1">
          <ArrowUpNarrowWide strokeWidth={1.5} size={16} />
        </div>

        {/* Share and sync */}
        <div className="flex items-center gap-x-1">
          <Share strokeWidth={1.5} size={16} />
          <p className="text-xs">Share and sync</p>
        </div>

        {/* Search */}
        <div>
          <Search strokeWidth={1.5} size={16} />
        </div>
      </div>
    </div>
  );
};
export default OptionsTab;
