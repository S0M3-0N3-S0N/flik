import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "../utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Download, Trash2, Image as ImageIcon, Video, Search, Edit } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Gallery() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [dateFilter, setDateFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState([]);
  const itemsPerPage = 20;
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: creations = [], isLoading } = useQuery({
    queryKey: ['creations'],
    queryFn: () => base44.entities.Creation.list('-created_date', 100),
    initialData: [],
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Creation.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creations'] });
    },
  });

  const filteredCreations = creations.filter(item => {
    const matchesSearch = !searchQuery || 
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.prompt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.metadata?.toString().toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || item.type === filterType;
    
    let matchesDate = true;
    if (dateFilter !== 'all' && item.created_date) {
      const itemDate = new Date(item.created_date);
      const now = new Date();
      const daysDiff = (now - itemDate) / (1000 * 60 * 60 * 24);
      
      if (dateFilter === 'today') matchesDate = daysDiff < 1;
      else if (dateFilter === 'week') matchesDate = daysDiff < 7;
      else if (dateFilter === 'month') matchesDate = daysDiff < 30;
    }
    
    return matchesSearch && matchesType && matchesDate;
  }).sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.created_date) - new Date(a.created_date);
    if (sortBy === 'oldest') return new Date(a.created_date) - new Date(b.created_date);
    if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '');
    return 0;
  });

  const totalPages = Math.ceil(filteredCreations.length / itemsPerPage);
  const paginatedCreations = filteredCreations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleDownload = async (url, title) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${title || 'creation'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      window.open(url, '_blank');
    }
  };

  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editingTitle, setEditingTitle] = useState(null);
  const [newTitle, setNewTitle] = useState('');

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Creation.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creations'] });
      setEditingTitle(null);
    },
  });

  const handleDelete = (id) => {
    setDeleteConfirm(id);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteMutation.mutate(deleteConfirm);
      setSelectedItem(null);
      setDeleteConfirm(null);
    }
  };

  const handleBatchDelete = () => {
    if (selectedItems.length === 0) return;
    setDeleteConfirm('batch');
  };

  const confirmBatchDelete = async () => {
    for (const id of selectedItems) {
      await deleteMutation.mutateAsync(id);
    }
    setSelectedItems([]);
    setDeleteConfirm(null);
  };

  const toggleSelectItem = (id) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const stats = {
    total: creations.length,
    images: creations.filter(c => c.type === 'image').length,
    videos: creations.filter(c => c.type === 'video').length,
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >


          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-white/50 text-sm mb-1">Total</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-white/50 text-sm mb-1">Images</p>
              <p className="text-2xl font-bold text-white">{stats.images}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-white/50 text-sm mb-1">Videos</p>
              <p className="text-2xl font-bold text-white">{stats.videos}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  placeholder="Search your creations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
              </div>
              <Tabs value={filterType} onValueChange={setFilterType}>
                <TabsList className="bg-white/5">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="image">Images</TabsTrigger>
                  <TabsTrigger value="video">Videos</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            <div className="flex gap-3">
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-40 bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40 bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="title">By Title</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredCreations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6">
              <ImageIcon className="w-8 h-8 text-white/30" />
            </div>
            <p className="text-white/40 text-lg mb-2">No creations yet</p>
            <p className="text-white/30 text-sm">Start creating amazing content with FLIK</p>
          </motion.div>
        ) : (
          <>
            {selectedItems.length > 0 && (
              <div className="mb-4 p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                <span className="text-white">{selectedItems.length} items selected</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedItems([])}
                    className="bg-transparent border-white/20 text-white hover:bg-white/10"
                  >
                    Clear
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBatchDelete}
                    className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Selected
                  </Button>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <AnimatePresence mode="popLayout">
                {paginatedCreations.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.02 }}
                  className={`group relative aspect-square rounded-xl overflow-hidden bg-white/5 border-2 cursor-pointer ${
                    selectedItems.includes(item.id) ? 'border-[#FF6B35]' : 'border-white/10'
                  }`}
                  onClick={(e) => {
                    if (e.shiftKey || e.ctrlKey || e.metaKey) {
                      toggleSelectItem(item.id);
                    } else {
                      setSelectedItem(item);
                    }
                  }}
                >
                  {item.thumbnail_url || item.url ? (
                    <img
                      src={item.thumbnail_url || item.url}
                      alt={item.title || 'Creation'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {item.type === 'video' ? (
                        <Video className="w-12 h-12 text-white/30" />
                      ) : (
                        <ImageIcon className="w-12 h-12 text-white/30" />
                      )}
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                   <div className="absolute top-3 right-3 flex gap-2">
                     <Button
                       size="icon"
                       variant="ghost"
                       onClick={(e) => { 
                         e.stopPropagation(); 
                         toggleSelectItem(item.id);
                       }}
                       className={`bg-black/50 hover:bg-white/20 text-white ${
                         selectedItems.includes(item.id) ? 'bg-[#FF6B35]/50' : ''
                       }`}
                     >
                       {selectedItems.includes(item.id) ? '✓' : '○'}
                     </Button>
                     <Button
                       size="icon"
                       variant="ghost"
                       onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                       className="bg-black/50 hover:bg-red-500/80 text-white"
                     >
                       <Trash2 className="w-4 h-4" />
                     </Button>
                   </div>
                   <div className="absolute bottom-0 left-0 right-0 p-3">
                     <div className="flex items-center gap-1 mb-2">
                       {item.type === 'video' ? (
                         <Video className="w-3 h-3 text-[#FF6B35]" />
                       ) : (
                         <ImageIcon className="w-3 h-3 text-[#FF6B35]" />
                       )}
                       <span className="text-xs text-white/60">{item.type}</span>
                     </div>
                     <p className="text-sm text-white line-clamp-1 mb-2">
                       {item.title || item.prompt || 'Untitled'}
                     </p>
                     <div className="flex gap-2">
                       <Button
                         onClick={(e) => {
                           e.stopPropagation();
                           const pageName = item.type === 'image' ? 'Editor' : 'VideoEditor';
                           navigate(createPageUrl(pageName) + '?load=' + encodeURIComponent(item.url));
                         }}
                         className="flex-1 bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs h-8"
                       >
                         Edit
                       </Button>
                       <Button
                         onClick={(e) => e.stopPropagation()}
                         className="flex-1 btn-gradient text-white text-xs h-8"
                       >
                         View
                       </Button>
                     </div>
                   </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
                className="bg-transparent border-white/20 text-white hover:bg-white/10 disabled:opacity-30"
              >
                Previous
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    className={currentPage === pageNum 
                      ? "btn-gradient text-white" 
                      : "bg-transparent border-white/20 text-white hover:bg-white/10"
                    }
                  >
                    {pageNum}
                  </Button>
                );
              })}
              <Button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                variant="outline"
                size="sm"
                className="bg-transparent border-white/20 text-white hover:bg-white/10 disabled:opacity-30"
              >
                Next
              </Button>
            </div>
          )}
        </>
        )}
      </div>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="bg-[#1a1a1a] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl text-white">
              {deleteConfirm === 'batch' ? `Delete ${selectedItems.length} Items?` : 'Delete Creation?'}
            </DialogTitle>
            <DialogDescription className="text-white/50">
              This action cannot be undone. This will permanently delete {deleteConfirm === 'batch' ? 'these creations' : 'your creation'}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button
              onClick={() => setDeleteConfirm(null)}
              variant="outline"
              className="flex-1 bg-transparent border-white/20 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={deleteConfirm === 'batch' ? confirmBatchDelete : confirmDelete}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-4xl bg-[#1a1a1a] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl gradient-text">
              {selectedItem?.title || selectedItem?.prompt || 'Creation'}
            </DialogTitle>
            <DialogDescription className="text-white/50">
              Created {selectedItem?.created_date ? new Date(selectedItem.created_date).toLocaleDateString() : 'recently'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            {selectedItem?.url && (
              <div className="rounded-lg overflow-hidden bg-black mb-4">
                {selectedItem.type === 'video' ? (
                  <video src={selectedItem.url} controls className="w-full" />
                ) : (
                  <img src={selectedItem.url} alt="Creation" className="w-full" />
                )}
              </div>
            )}
            
            <div className="p-4 rounded-lg bg-white/5 border border-white/10 mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-white/40">Title</p>
                {editingTitle === selectedItem?.id ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      updateMutation.mutate({ id: selectedItem.id, data: { title: newTitle } });
                    }}
                    className="btn-gradient text-white h-6 text-xs"
                  >
                    Save
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingTitle(selectedItem?.id);
                      setNewTitle(selectedItem?.title || '');
                    }}
                    className="text-white/60 hover:text-white h-6"
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                )}
              </div>
              {editingTitle === selectedItem?.id ? (
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="bg-white/10 border-white/10 text-white"
                  placeholder="Enter title..."
                />
              ) : (
                <p className="text-sm text-white/80">{selectedItem?.title || 'Untitled'}</p>
              )}
            </div>

            {selectedItem?.prompt && (
              <div className="p-4 rounded-lg bg-white/5 border border-white/10 mb-4">
                <p className="text-xs text-white/40 mb-1">Prompt</p>
                <p className="text-sm text-white/80">{selectedItem.prompt}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  const pageName = selectedItem.type === 'image' ? 'Editor' : 'VideoEditor';
                  navigate(createPageUrl(pageName) + '?load=' + encodeURIComponent(selectedItem.url));
                }}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white border border-white/20"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button
                onClick={() => handleDownload(selectedItem.url, selectedItem.title || selectedItem.prompt)}
                className="flex-1 btn-gradient text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button
                onClick={() => handleDelete(selectedItem.id)}
                variant="outline"
                className="border-white/20 text-white hover:bg-red-500/20"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}