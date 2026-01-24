import React, { useMemo, useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Trash2, CheckSquare, Square, AlertCircle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CreationCard from "./CreationCard";
import {
  ITEMS_PER_PAGE,
  SORT_OPTIONS,
  DATE_FILTERS,
  FILTER_TYPES,
} from "./ProfileConstants";
import LoadingSkeleton from "./LoadingSkeleton";

export default function ProfileGallery({
  creations,
  isLoading,
  onSelectItem,
  onDeleteImage,
  onPublish,
  onEdit,
  onDownload,
  onDelete,
  navigate,
  createPageUrl,
  togglePublishMutation,
  updateMutation,
  deleteMutation,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [dateFilter, setDateFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [imageErrors, setImageErrors] = useState({});
  const [batchDeleteProgress, setBatchDeleteProgress] = useState(0);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredCreations = useMemo(() => {
    return creations
      .filter(
        (item) =>
          (!debouncedSearchQuery ||
            item.title?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
            item.prompt?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())) &&
          (filterType === "all" || item.type === filterType) &&
          (() => {
            if (dateFilter === "all") return true;
            const itemDate = new Date(item.created_date);
            const now = new Date();
            const daysDiff = (now - itemDate) / (1000 * 60 * 60 * 24);
            return dateFilter === "today"
              ? daysDiff < 1
              : dateFilter === "week"
              ? daysDiff < 7
              : dateFilter === "month"
              ? daysDiff < 30
              : true;
          })()
      )
      .sort((a, b) => {
        if (sortBy === "newest") return new Date(b.created_date) - new Date(a.created_date);
        if (sortBy === "oldest") return new Date(a.created_date) - new Date(b.created_date);
        if (sortBy === "title") return (a.title || "").localeCompare(b.title || "");
        return 0;
      });
  }, [creations, debouncedSearchQuery, filterType, dateFilter, sortBy]);

  const totalPages = Math.ceil(filteredCreations.length / ITEMS_PER_PAGE);
  const paginatedCreations = useMemo(
    () =>
      filteredCreations.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
      ),
    [filteredCreations, currentPage]
  );

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedItems([]);
  }, [filterType, dateFilter, debouncedSearchQuery, sortBy]);

  const toggleSelectItem = useCallback(
    (id) => {
      setSelectedItems((prev) =>
        prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
      );
    },
    []
  );

  const selectAll = useCallback(() => {
    if (selectedItems.length === paginatedCreations.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(paginatedCreations.map((c) => c.id));
    }
  }, [selectedItems.length, paginatedCreations]);

  const handleBatchDelete = async () => {
    const total = selectedItems.length;
    setBatchDeleteProgress(0);

    for (let i = 0; i < selectedItems.length; i++) {
      await onDelete(selectedItems[i]);
      setBatchDeleteProgress(Math.round(((i + 1) / total) * 100));
    }

    setSelectedItems([]);
    setDeleteConfirm(null);
    setBatchDeleteProgress(0);
  };

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-white/30 pointer-events-none" />
          <Input
            placeholder="Search your creations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 sm:pl-12 h-11 sm:h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl sm:rounded-2xl text-sm sm:text-base focus:border-[#FF6B35]/40 focus:ring-1 focus:ring-[#FF6B35]/20 transition-all"
            aria-label="Search creations"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:h-1.5">
          <Tabs value={filterType} onValueChange={setFilterType} className="flex-shrink-0">
            <TabsList className="bg-white/5 border border-white/10 h-10 rounded-xl p-1 gap-1">
              {FILTER_TYPES.map((filter) => (
                <TabsTrigger
                  key={filter.value}
                  value={filter.value}
                  className="px-3 sm:px-5 h-8 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF6B35] data-[state=active]:to-[#FFB800] data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg text-xs sm:text-sm font-medium transition-all"
                >
                  {filter.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[110px] sm:w-[140px] bg-white/5 border-white/10 text-white h-10 rounded-xl text-xs sm:text-sm flex-shrink-0 hover:bg-white/10 transition-all">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_FILTERS.map((filter) => (
                <SelectItem key={filter.value} value={filter.value}>
                  {filter.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[120px] sm:w-[160px] bg-white/5 border-white/10 text-white h-10 rounded-xl text-xs sm:text-sm flex-shrink-0 hover:bg-white/10 transition-all">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 sm:p-5 rounded-2xl bg-gradient-to-r from-[#FF6B35]/10 to-[#FFB800]/10 border border-[#FF6B35]/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          role="region"
          aria-label="Selection toolbar"
        >
          <span className="text-white font-medium text-sm sm:text-base">
            {selectedItems.length} item{selectedItems.length > 1 ? "s" : ""} selected
            {batchDeleteProgress > 0 && <span className="ml-2 text-xs text-white/60">({batchDeleteProgress}% deleted)</span>}
          </span>
          <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
            <Button
              size="sm"
              onClick={selectAll}
              className="flex-1 sm:flex-none bg-white/10 hover:bg-white/20 text-white border-0 h-9 px-3 sm:px-4 text-xs sm:text-sm"
            >
              {selectedItems.length === paginatedCreations.length ? (
                <><CheckSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" /> Deselect</>
              ) : (
                <><Square className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" /> Select All</>
              )}
            </Button>
            <Button
              size="sm"
              onClick={() => setSelectedItems([])}
              className="flex-1 sm:flex-none bg-white/10 hover:bg-white/20 text-white border-0 h-9 px-3 sm:px-4 text-xs sm:text-sm"
            >
              Clear
            </Button>
            <Button
              size="sm"
              onClick={() => setDeleteConfirm("batch")}
              disabled={batchDeleteProgress > 0}
              className="flex-1 sm:flex-none bg-red-500/20 hover:bg-red-500/30 text-red-400 border-0 h-9 px-3 sm:px-4 text-xs sm:text-sm disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
              Delete
            </Button>
          </div>
        </motion.div>
      )}

      {filteredCreations.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-32 bg-gradient-to-br from-white/5 to-white/0 rounded-3xl border border-white/5"
        >
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#FF6B35]/20 to-[#FFB800]/20 flex items-center justify-center mx-auto mb-6 border border-[#FF6B35]/20">
            <AlertCircle className="w-10 h-10 text-[#FF6B35]" />
          </div>
          <h3 className="text-white text-xl font-semibold mb-2">No creations</h3>
          <p className="text-white/40">Start creating amazing content</p>
        </motion.div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 md:gap-6">
            <AnimatePresence mode="popLayout">
              {paginatedCreations.map((item, index) => (
                <CreationCard
                  key={item.id}
                  item={item}
                  index={index}
                  searchQuery={debouncedSearchQuery}
                  isSelected={selectedItems.includes(item.id)}
                  imageErrors={imageErrors}
                  selectedItems={selectedItems}
                  onToggleSelect={toggleSelectItem}
                  onSelectItem={onSelectItem}
                  onEdit={onEdit}
                  onPublish={onPublish}
                  onDownload={onDownload}
                  onDelete={onDelete}
                  onKeyDown={() => {}}
                  togglePublishMutation={togglePublishMutation}
                  updateMutation={updateMutation}
                  navigate={navigate}
                  createPageUrl={createPageUrl}
                />
              ))}
            </AnimatePresence>
          </div>

          {totalPages > 1 && (
            <div className="mt-8 sm:mt-12 flex items-center justify-center gap-2 sm:gap-3">
              <Button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="bg-white/5 hover:bg-white/10 text-white border border-white/10 disabled:opacity-30 h-10 sm:h-11 px-4 sm:px-6 rounded-xl sm:rounded-2xl font-medium text-sm sm:text-base transition-all hover:scale-105"
                aria-label="Previous page"
              >
                Previous
              </Button>
              <div className="px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-br from-white/10 to-white/5 rounded-xl sm:rounded-2xl border border-white/10 min-w-[80px] sm:min-w-[100px] text-center">
                <span className="text-white font-bold text-base sm:text-lg">
                  {currentPage} <span className="text-white/30 font-normal">/</span> {totalPages}
                </span>
              </div>
              <Button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="bg-white/5 hover:bg-white/10 text-white border border-white/10 disabled:opacity-30 h-10 sm:h-11 px-4 sm:px-6 rounded-xl sm:rounded-2xl font-medium text-sm sm:text-base transition-all hover:scale-105"
                aria-label="Next page"
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}