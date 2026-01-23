import React, { useState, useRef, useContext, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { 
  Mail, Calendar, Image as ImageIcon, Video, LogOut, Camera, Loader2, 
  Pencil, Check, X, Lock, Globe, Search, Trash2, Download, Edit, Wand2, Sparkles,
  ChevronDown, CheckSquare, Square, AlertCircle, TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "../utils";
import { LanguageContext } from "../Layout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from 'react-hot-toast';
import { 
  ITEMS_PER_PAGE, 
  MAX_CREATIONS_FETCH, 
  SORT_OPTIONS, 
  DATE_FILTERS,
  FILTER_TYPES
} from "@/components/profile/ProfileConstants";
import { 
  validateEmail, 
  validateImageFile, 
  getFileExtension,
  highlightText,
  getTimeframeStats
} from "@/components/profile/ProfileHelpers";

export default function Profile() {
  const { t, language, setLanguage } = useContext(LanguageContext);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Profile State
  const [isUploading, setIsUploading] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const fileInputRef = useRef(null);
  
  // Gallery State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [dateFilter, setDateFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editingTitle, setEditingTitle] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [newPrompt, setNewPrompt] = useState('');
  const [batchDeleteProgress, setBatchDeleteProgress] = useState(0);
  const [deletedItems, setDeletedItems] = useState([]);
  const [showStatsExpanded, setShowStatsExpanded] = useState(false);

  // Data Fetching
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: creations = [], isLoading } = useQuery({
    queryKey: ['creations', user?.email],
    queryFn: () => user ? base44.entities.Creation.filter({ created_by: user.email }, '-created_date', MAX_CREATIONS_FETCH) : [],
    enabled: !!user?.email,
    initialData: [],
  });

  // Profile Mutations
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.errors[0]);
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading('Uploading profile picture...');
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.auth.updateMe({ profile_picture: file_url });
      await queryClient.invalidateQueries({ queryKey: ['user'] });
      toast.success('Profile picture updated!', { id: toastId });
    } catch (error) {
      console.error("Failed to upload profile picture:", error);
      toast.error('Failed to upload profile picture', { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  const handleEmailUpdate = async () => {
    if (!emailInput.trim()) {
      toast.error('Email cannot be empty');
      return;
    }
    
    if (!validateEmail(emailInput)) {
      toast.error('Please enter a valid email address');
      return;
    }

    const toastId = toast.loading('Updating email...');
    try {
      await base44.auth.updateMe({ contact_email: emailInput });
      await queryClient.invalidateQueries({ queryKey: ['user'] });
      setIsEditingEmail(false);
      toast.success('Email updated successfully!', { id: toastId });
    } catch (error) {
      console.error("Failed to update email:", error);
      toast.error('Failed to update email', { id: toastId });
    }
  };

  const startEditingEmail = () => {
    setEmailInput(user?.contact_email || user?.email || "");
    setIsEditingEmail(true);
  };

  const handleNameUpdate = async () => {
    if (!nameInput.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    const toastId = toast.loading('Updating name...');
    try {
      await base44.auth.updateMe({ display_name: nameInput });
      await queryClient.invalidateQueries({ queryKey: ['user'] });
      setIsEditingName(false);
      toast.success('Name updated successfully!', { id: toastId });
    } catch (error) {
      console.error("Failed to update name:", error);
      toast.error('Failed to update name', { id: toastId });
    }
  };

  const startEditingName = () => {
    setNameInput(user?.display_name || user?.full_name || "");
    setIsEditingName(true);
  };

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  // Gallery Logic
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Creation.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creations'] });
      toast.success('Creation deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete creation');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Creation.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creations'] });
      setEditingTitle(null);
      setEditingPrompt(null);
      toast.success('Updated successfully');
    },
    onError: () => {
      toast.error('Failed to update');
    }
  });

  const handleDelete = (id) => {
    setDeleteConfirm(id);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      const itemToDelete = creations.find(c => c.id === deleteConfirm);
      setDeletedItems([...deletedItems, { id: deleteConfirm, item: itemToDelete }]);
      deleteMutation.mutate(deleteConfirm);
      setSelectedItem(null);
      setDeleteConfirm(null);
      
      // Undo option
      toast((t) => (
        <div className="flex items-center gap-3">
          <span>Creation deleted</span>
          <Button
            size="sm"
            onClick={() => {
              // In a real app, we'd restore from a soft-delete
              toast.dismiss(t.id);
            }}
            className="h-7 px-3 bg-white/10 hover:bg-white/20 text-white text-xs"
          >
            Undo
          </Button>
        </div>
      ), { duration: 5000 });
    }
  };

  const handleBatchDelete = () => {
    if (selectedItems.length === 0) return;
    setDeleteConfirm('batch');
  };

  const confirmBatchDelete = async () => {
    const total = selectedItems.length;
    setBatchDeleteProgress(0);
    const toastId = toast.loading(`Deleting 0/${total} items...`);
    
    try {
      for (let i = 0; i < selectedItems.length; i++) {
        await deleteMutation.mutateAsync(selectedItems[i]);
        const progress = Math.round(((i + 1) / total) * 100);
        setBatchDeleteProgress(progress);
        toast.loading(`Deleting ${i + 1}/${total} items...`, { id: toastId });
      }
      
      toast.success(`${total} items deleted successfully`, { id: toastId });
      setSelectedItems([]);
      setDeleteConfirm(null);
      setBatchDeleteProgress(0);
    } catch (error) {
      toast.error('Failed to delete some items', { id: toastId });
      setBatchDeleteProgress(0);
    }
  };

  const toggleSelectItem = useCallback((id) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }, []);

  const handleDownload = async (url, title, type) => {
    const toastId = toast.loading('Downloading...');
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      const extension = getFileExtension(url, type);
      link.download = `${title || 'creation'}${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
      toast.success('Downloaded successfully', { id: toastId });
    } catch (err) {
      toast.error('Download failed, opening in new tab', { id: toastId });
      window.open(url, '_blank');
    }
  };

  const filteredCreations = useMemo(() => {
    return creations.filter(item => {
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
      if (sortBy === 'prompt_length') return (b.prompt?.length || 0) - (a.prompt?.length || 0);
      return 0;
    });
  }, [creations, searchQuery, filterType, dateFilter, sortBy]);

  const totalPages = Math.ceil(filteredCreations.length / ITEMS_PER_PAGE);
  const paginatedCreations = useMemo(() => {
    return filteredCreations.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );
  }, [filteredCreations, currentPage]);

  const stats = useMemo(() => ({
    total: creations.length,
    images: creations.filter(c => c.type === 'image').length,
    videos: creations.filter(c => c.type === 'video').length,
    ...getTimeframeStats(creations)
  }), [creations]);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filterType, dateFilter, searchQuery, sortBy]);

  const selectAll = useCallback(() => {
    if (selectedItems.length === paginatedCreations.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(paginatedCreations.map(c => c.id));
    }
  }, [selectedItems.length, paginatedCreations]);

  const handleKeyDown = useCallback((e, item) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSelectedItem(item);
    }
  }, []);

  if (!user) return null;

  return (
    <div className="h-[calc(100dvh-4rem)] overflow-y-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#1a1a1a',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)'
          }
        }}
      />
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        
        {/* Profile Header */}
        <div className="relative bg-gradient-to-br from-[#141414] to-[#0a0a0a] border border-white/10 rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-10 glass-card overflow-hidden">
          {/* Background Glow Effect */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#FF6B35]/5 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#FFB800]/5 rounded-full blur-[120px] pointer-events-none" />
          <div className="relative flex flex-col md:flex-row items-center gap-4 sm:gap-6 md:gap-8 mb-6 sm:mb-8 md:mb-10 text-center md:text-left">
            <div className="relative group">
              <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#FF6B35] via-[#F72C25] to-[#FFB800] p-1 shadow-2xl shadow-[#FF6B35]/30">
                <div className="w-full h-full rounded-[18px] sm:rounded-[22px] bg-[#0a0a0a] flex items-center justify-center text-3xl sm:text-4xl font-bold text-white overflow-hidden">
                  {user.profile_picture ? (
                    <img src={user.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="gradient-text">{(user.display_name || user.full_name || user.email || 'U')[0].toUpperCase()}</span>
                  )}
                </div>
              </div>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#FF6B35] to-[#FFB800] opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer disabled:cursor-not-allowed shadow-lg hover:scale-110"
                aria-label="Change profile picture"
              >
                {isUploading ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <Camera className="w-5 h-5 text-white" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            
            <div className="flex-1 w-full">
              <div className="flex items-center gap-2 sm:gap-3 mb-2 justify-center md:justify-start flex-wrap">
                {isEditingName ? (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Input
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="h-10 sm:h-11 bg-white/5 border-white/10 text-white text-lg sm:text-2xl font-bold w-full sm:w-72 rounded-xl"
                      placeholder="Enter name"
                      autoFocus
                    />
                    <button 
                      onClick={handleNameUpdate} 
                      className="p-2 sm:p-2.5 rounded-xl bg-[#FF6B35]/20 text-[#FF6B35] hover:bg-[#FF6B35]/30 transition-colors flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
                      aria-label="Save name"
                    >
                      <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    <button 
                      onClick={() => setIsEditingName(false)} 
                      className="p-2 sm:p-2.5 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 transition-colors flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
                      aria-label="Cancel editing name"
                    >
                      <X className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">{user.display_name || user.full_name || 'User'}</h2>
                    <button 
                      onClick={startEditingName} 
                      className="p-2 sm:p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
                      aria-label="Edit name"
                    >
                      <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </>
                )}
              </div>
              <p className="text-white/50 text-sm sm:text-base flex items-center gap-2 justify-center md:justify-start flex-wrap break-all">
                <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="break-all">{user.email}</span>
              </p>
              <div className="mt-2 sm:mt-3 flex items-center gap-2 text-xs sm:text-sm text-white/40 justify-center md:justify-start">
                <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Joined {new Date(user.created_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
              </div>
            </div>
            
            <Button 
              onClick={handleLogout}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40 h-10 sm:h-11 px-4 sm:px-6 text-sm sm:text-base w-full md:w-auto"
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
              {t("profile.sign_out")}
            </Button>
          </div>

          <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="group p-4 sm:p-5 bg-white/5 hover:bg-white/[0.07] rounded-xl sm:rounded-2xl border border-white/5 hover:border-white/10 transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#FF6B35]/20 to-[#FFB800]/20 flex items-center justify-center">
                    <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF6B35]" />
                  </div>
                  <span className="text-white/60 text-xs sm:text-sm font-medium">{t("profile.language")}</span>
                </div>
              </div>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-full bg-white/5 border-white/10 text-white h-9 sm:h-10 rounded-xl text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t("language.en")}</SelectItem>
                  <SelectItem value="es">{t("language.es")}</SelectItem>
                  <SelectItem value="fr">{t("language.fr")}</SelectItem>
                  <SelectItem value="zh">{t("language.zh")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="group p-4 sm:p-5 bg-white/5 hover:bg-white/[0.07] rounded-xl sm:rounded-2xl border border-white/5 hover:border-white/10 transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#FF6B35]/20 to-[#FFB800]/20 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF6B35]" />
                  </div>
                  <span className="text-white/60 text-xs sm:text-sm font-medium">Contact Email</span>
                </div>
                {!isEditingEmail && (
                  <button 
                    onClick={startEditingEmail} 
                    className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label="Edit contact email"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {isEditingEmail ? (
                <div className="space-y-2">
                  <Input
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="h-9 sm:h-10 bg-white/5 border-white/10 text-white rounded-xl text-sm"
                    placeholder="Email address"
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleEmailUpdate} size="sm" className="flex-1 btn-gradient text-white h-8 sm:h-9 text-xs sm:text-sm">
                      <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5" />
                      Save
                    </Button>
                    <Button onClick={() => setIsEditingEmail(false)} size="sm" variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10 h-8 sm:h-9 text-xs sm:text-sm">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-white/90 text-xs sm:text-sm truncate">{user.contact_email || user.email}</p>
              )}
            </div>
            
            <div className="group p-4 sm:p-5 bg-white/5 hover:bg-white/[0.07] rounded-xl sm:rounded-2xl border border-white/5 hover:border-white/10 transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#FF6B35]/20 to-[#FFB800]/20 flex items-center justify-center">
                    <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF6B35]" />
                  </div>
                  <span className="text-white/60 text-xs sm:text-sm font-medium">{t("profile.password")}</span>
                </div>
              </div>
              <Button 
                size="sm" 
                onClick={() => setShowPasswordDialog(true)}
                className="w-full bg-white/5 hover:bg-white/10 text-white border-0 h-8 sm:h-9 text-xs sm:text-sm"
              >
                {t("profile.change")}
              </Button>
            </div>

            <div className="group p-4 sm:p-5 bg-white/5 hover:bg-white/[0.07] rounded-xl sm:rounded-2xl border border-white/5 hover:border-white/10 transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#FF6B35]/20 to-[#FFB800]/20 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF6B35]" />
                  </div>
                  <span className="text-white/60 text-xs sm:text-sm font-medium">Statistics</span>
                </div>
                <button 
                  onClick={() => setShowStatsExpanded(!showStatsExpanded)}
                  className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                  aria-label="Toggle stats"
                >
                  <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${showStatsExpanded ? 'rotate-180' : ''}`} />
                </button>
              </div>
              <div className="space-y-2">
                <p className="text-2xl sm:text-3xl font-bold gradient-text">{stats.total}</p>
                <AnimatePresence>
                  {showStatsExpanded && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-xs text-white/50 space-y-1 pt-2 border-t border-white/10"
                    >
                      <div className="flex justify-between"><span>Today:</span><span className="text-white/70">{stats.today}</span></div>
                      <div className="flex justify-between"><span>This Week:</span><span className="text-white/70">{stats.thisWeek}</span></div>
                      <div className="flex justify-between"><span>This Month:</span><span className="text-white/70">{stats.thisMonth}</span></div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* Creations Section */}
        <div className="space-y-6">

          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-white/30" />
              <Input
                placeholder="Search your creations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 sm:pl-12 h-11 sm:h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl sm:rounded-2xl text-sm sm:text-base"
              />
            </div>
            
            <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-1 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
               <Tabs value={filterType} onValueChange={setFilterType} className="flex-shrink-0">
                <TabsList className="bg-white/5 border border-white/10 h-10 sm:h-12 rounded-xl sm:rounded-2xl">
                  {FILTER_TYPES.map(filter => (
                    <TabsTrigger 
                      key={filter.value}
                      value={filter.value} 
                      className="px-4 sm:px-6 data-[state=active]:bg-[#FF6B35] data-[state=active]:text-white rounded-lg sm:rounded-xl text-xs sm:text-sm"
                    >
                      {filter.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[120px] sm:w-[150px] bg-white/5 border-white/10 text-white h-10 sm:h-12 rounded-xl sm:rounded-2xl text-xs sm:text-sm flex-shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_FILTERS.map(filter => (
                    <SelectItem key={filter.value} value={filter.value}>{filter.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px] sm:w-[180px] bg-white/5 border-white/10 text-white h-10 sm:h-12 rounded-xl sm:rounded-2xl text-xs sm:text-sm flex-shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
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
              >
                <span className="text-white font-medium text-sm sm:text-base">
                  {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected
                  {batchDeleteProgress > 0 && (
                    <span className="ml-2 text-xs text-white/60">({batchDeleteProgress}% deleted)</span>
                  )}
                </span>
                <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                  <Button
                    size="sm"
                    onClick={selectAll}
                    className="flex-1 sm:flex-none bg-white/10 hover:bg-white/20 text-white border-0 h-9 px-3 sm:px-4 text-xs sm:text-sm"
                    aria-label="Select all visible items"
                  >
                    {selectedItems.length === paginatedCreations.length ? (
                      <><CheckSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" /> Deselect All</>
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
                    onClick={handleBatchDelete}
                    disabled={batchDeleteProgress > 0}
                    className="flex-1 sm:flex-none bg-red-500/20 hover:bg-red-500/30 text-red-400 border-0 h-9 px-3 sm:px-4 text-xs sm:text-sm disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                    Delete
                  </Button>
                </div>
              </motion.div>
            )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32">
              <div className="w-12 h-12 border-3 border-[#FF6B35] border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-white/40 text-sm">Loading your creations...</p>
            </div>
          ) : filteredCreations.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-32 bg-gradient-to-br from-white/5 to-white/0 rounded-3xl border border-white/5"
            >
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#FF6B35]/20 to-[#FFB800]/20 flex items-center justify-center mx-auto mb-6 border border-[#FF6B35]/20">
                <Sparkles className="w-10 h-10 text-[#FF6B35]" />
              </div>
              <h3 className="text-white text-xl font-semibold mb-2">No creations yet</h3>
              <p className="text-white/40 mb-6 max-w-sm mx-auto">Start creating amazing content with FLIK's AI tools</p>
              <Button onClick={() => navigate(createPageUrl('Generate'))} className="btn-gradient text-white px-8 h-11">
                <Wand2 className="w-4 h-4 mr-2" />
                Create Your First Masterpiece
              </Button>
            </motion.div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                <AnimatePresence mode="popLayout">
                  {paginatedCreations.map((item, index) => (
                    <motion.div
                      layoutId={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.02 }}
                      className={`group relative aspect-square rounded-3xl overflow-hidden bg-gradient-to-br from-[#141414] to-[#0a0a0a] border transition-all duration-500 hover:shadow-2xl cursor-pointer ${
                        selectedItems.includes(item.id) 
                          ? 'border-[#FF6B35] ring-2 ring-[#FF6B35]/40 shadow-[#FF6B35]/30 shadow-lg scale-[0.97]' 
                          : 'border-white/5 hover:border-[#FF6B35]/40 hover:shadow-[#FF6B35]/10'
                      }`}
                      onClick={(e) => {
                        if (e.shiftKey || e.ctrlKey || e.metaKey) {
                          toggleSelectItem(item.id);
                        } else {
                          setSelectedItem(item);
                        }
                      }}
                      onKeyDown={(e) => handleKeyDown(e, item)}
                      tabIndex={0}
                      role="button"
                      aria-label={`View ${item.title || 'creation'}`}
                    >
                      <div className="absolute inset-0 p-1">
                        <div className="w-full h-full rounded-[20px] overflow-hidden">
                          {item.thumbnail_url || item.url ? (
                              <img
                              src={item.thumbnail_url || item.url}
                              alt={item.title || 'Creation'}
                              loading="lazy"
                              className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:brightness-75"
                              />
                          ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/10 to-white/5">
                              <ImageIcon className="w-16 h-16 text-white/10" />
                              </div>
                          )}
                        </div>
                      </div>

                      {/* Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-between p-5">
                        {/* Top Actions */}
                        <div className="flex justify-end gap-2 translate-y-[-15px] group-hover:translate-y-0 transition-all duration-500 delay-75">
                          <button
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              toggleSelectItem(item.id);
                            }}
                            className={`h-10 w-10 rounded-2xl flex items-center justify-center backdrop-blur-2xl border-2 transition-all duration-300 ${
                              selectedItems.includes(item.id) 
                                ? 'bg-[#FF6B35] border-[#FF6B35] text-white scale-110 rotate-12' 
                                : 'bg-black/50 border-white/30 text-white hover:bg-[#FF6B35]/20 hover:border-[#FF6B35]/50 hover:scale-110'
                            }`}
                          >
                            {selectedItems.includes(item.id) ? <Check className="w-5 h-5" /> : <div className="w-5 h-5 rounded-full border-2 border-white/50" />}
                          </button>
                        </div>

                        {/* Bottom Info */}
                        <div className="translate-y-[25px] group-hover:translate-y-0 transition-all duration-500 delay-100 space-y-4">
                          <div>
                            <h3 
                              className="font-bold text-white text-lg line-clamp-2 mb-1 drop-shadow-lg"
                              dangerouslySetInnerHTML={{ __html: highlightText(item.title || 'Untitled', searchQuery) }}
                            />
                            {item.prompt && (
                              <p 
                                className="text-xs text-white/60 line-clamp-1"
                                dangerouslySetInnerHTML={{ __html: highlightText(item.prompt, searchQuery) }}
                              />
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(createPageUrl('Editor') + '?load=' + encodeURIComponent(item.url));
                              }}
                              className="flex-1 bg-white/20 hover:bg-white/30 text-white border-0 h-10 text-sm backdrop-blur-2xl font-medium"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(createPageUrl("Generate") + '?load=' + encodeURIComponent(item.url));
                              }}
                              className="flex-1 bg-purple-500/30 hover:bg-purple-500/40 text-white border-0 h-10 text-sm backdrop-blur-2xl font-medium"
                            >
                              <Wand2 className="w-4 h-4 mr-2" />
                              Remix
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {totalPages > 1 && (
                <div className="mt-16 flex items-center justify-center gap-4">
                  <Button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="bg-white/5 hover:bg-white/10 text-white border-0 disabled:opacity-30 h-12 px-8 rounded-2xl font-medium"
                  >
                    Previous
                  </Button>
                  <div className="px-8 py-3 bg-gradient-to-br from-white/10 to-white/5 rounded-2xl border border-white/10">
                    <span className="text-white font-bold text-lg">
                      {currentPage} <span className="text-white/30 font-normal">/</span> {totalPages}
                    </span>
                  </div>
                  <Button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="bg-white/5 hover:bg-white/10 text-white border-0 disabled:opacity-30 h-12 px-8 rounded-2xl font-medium"
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="bg-[#1a1a1a] border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("profile.change_password")}</DialogTitle>
            <DialogDescription className="text-white/50">
              To change your password, you need to sign out and use the "Forgot Password" link on the login page.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="ghost" onClick={() => setShowPasswordDialog(false)} className="hover:bg-white/10 text-white">{t("profile.cancel")}</Button>
            <Button onClick={handleLogout} className="bg-[#FF6B35] hover:bg-[#FF8B55] text-white">{t("profile.sign_out_reset")}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="bg-[#1a1a1a] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              {deleteConfirm === 'batch' ? `Delete ${selectedItems.length} Items?` : 'Delete Creation?'}
            </DialogTitle>
            <DialogDescription className="text-white/50">
              This action cannot be undone. This will permanently delete {deleteConfirm === 'batch' ? 'these creations' : 'your creation'}.
            </DialogDescription>
          </DialogHeader>
          {deleteConfirm === 'batch' && batchDeleteProgress > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-white/60">
                <span>Deleting...</span>
                <span>{batchDeleteProgress}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#FF6B35] to-[#FFB800] transition-all duration-300"
                  style={{ width: `${batchDeleteProgress}%` }}
                />
              </div>
            </div>
          )}
          <div className="flex gap-3 mt-4">
            <Button 
              onClick={() => setDeleteConfirm(null)} 
              variant="outline" 
              className="flex-1 bg-transparent border-white/20 text-white hover:bg-white/10"
              disabled={batchDeleteProgress > 0}
            >
              Cancel
            </Button>
            <Button 
              onClick={deleteConfirm === 'batch' ? confirmBatchDelete : confirmDelete} 
              className="flex-1 bg-red-500 hover:bg-red-600 text-white"
              disabled={batchDeleteProgress > 0}
            >
              {deleteMutation.isPending || batchDeleteProgress > 0 ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-[95vw] md:max-w-6xl w-full h-[90vh] md:h-[85vh] bg-[#1a1a1a] border-white/10 text-white p-0 overflow-hidden flex flex-col md:flex-row gap-0">
          <div className="flex-1 bg-black/50 relative flex items-center justify-center p-4 overflow-hidden">
            {selectedItem?.url && (
              <img src={selectedItem.url} alt="Creation" className="max-w-full max-h-full object-contain shadow-2xl" />
            )}
          </div>

          <div className="w-full md:w-[90vw] md:max-w-[400px] flex flex-col border-l border-white/10 bg-[#1a1a1a]">
            <div className="p-6 border-b border-white/10">
              <DialogHeader className="p-0 space-y-2 pr-8">
                <DialogTitle className="text-xl gradient-text line-clamp-2 text-left">
                  {selectedItem?.title || selectedItem?.prompt || 'Creation'}
                </DialogTitle>
                <DialogDescription className="text-white/50 text-left">
                  Created {selectedItem?.created_date ? new Date(selectedItem.created_date).toLocaleDateString() : 'recently'}
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Title</label>
                  {editingTitle === selectedItem?.id ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        updateMutation.mutate({ id: selectedItem.id, data: { title: newTitle } });
                      }}
                      className="h-6 text-xs px-2 btn-gradient text-white"
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
                      className="h-6 w-6 p-0 text-white/40 hover:text-white"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                {editingTitle === selectedItem?.id ? (
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                    placeholder="Enter title..."
                    autoFocus
                  />
                ) : (
                  <p className="text-sm text-white/90 font-medium">{selectedItem?.title || 'Untitled'}</p>
                )}
              </div>

              {selectedItem?.prompt && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Prompt</label>
                    {editingPrompt === selectedItem?.id ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          if (newPrompt.trim()) {
                            updateMutation.mutate({ id: selectedItem.id, data: { prompt: newPrompt } });
                          }
                        }}
                        className="h-6 text-xs px-2 btn-gradient text-white"
                      >
                        Save
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingPrompt(selectedItem?.id);
                          setNewPrompt(selectedItem?.prompt || '');
                        }}
                        className="h-6 w-6 p-0 text-white/40 hover:text-white"
                        aria-label="Edit prompt"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  {editingPrompt === selectedItem?.id ? (
                    <Textarea
                      value={newPrompt}
                      onChange={(e) => setNewPrompt(e.target.value)}
                      className="bg-white/5 border-white/10 text-white min-h-[100px] text-sm"
                      placeholder="Enter prompt..."
                      autoFocus
                    />
                  ) : (
                    <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                      <p className="text-sm text-white/70 leading-relaxed">{selectedItem.prompt}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-white/10 bg-[#1a1a1a] space-y-3">
              <Button
                onClick={() => {
                  navigate(createPageUrl('Editor') + '?load=' + encodeURIComponent(selectedItem.url));
                }}
                className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit in Editor
              </Button>

              <div className="flex gap-3">
                <Button
                  onClick={() => handleDownload(selectedItem.url, selectedItem.title || selectedItem.prompt, selectedItem.type)}
                  className="flex-1 btn-gradient text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  onClick={() => handleDelete(selectedItem.id)}
                  variant="outline"
                  className="px-3 border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/30"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}