import React, { useState, useRef, useContext, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { debounce } from "lodash";
import { 
  Mail, Calendar, Image as ImageIcon, Video, LogOut, Camera, Loader2, 
  Pencil, Check, X, Lock, Globe, Search, Trash2, Download, Edit, Wand2, Sparkles,
  ChevronDown, CheckSquare, Square, AlertCircle, TrendingUp, Play, ImageOff
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
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "../utils";
import { LanguageContext } from "../Layout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from 'react-hot-toast';
import LoadingSkeleton from "@/components/profile/LoadingSkeleton";
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
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Profile State
  const [isUploading, setIsUploading] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const fileInputRef = useRef(null);
  
  // Gallery State - Initialize from URL
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || "");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchParams.get('q') || "");
  const [selectedItem, setSelectedItem] = useState(null);
  const [filterType, setFilterType] = useState(searchParams.get('type') || "all");
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || "newest");
  const [dateFilter, setDateFilter] = useState(searchParams.get('date') || "all");
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page')) || 1);
  const [selectedItems, setSelectedItems] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editingTitle, setEditingTitle] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [originalTitle, setOriginalTitle] = useState('');
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [newPrompt, setNewPrompt] = useState('');
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [batchDeleteProgress, setBatchDeleteProgress] = useState(0);
  const [batchDeleteFailed, setBatchDeleteFailed] = useState(0);
  const [deletedItems, setDeletedItems] = useState([]);
  const [showStatsExpanded, setShowStatsExpanded] = useState(() => {
    return localStorage.getItem('profile_stats_expanded') === 'true';
  });
  const [imageErrors, setImageErrors] = useState({});

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

  // Debounced search with cleanup
  useEffect(() => {
    const debouncedSearch = debounce((value) => setDebouncedSearchQuery(value), 300);
    debouncedSearch(searchQuery);
    
    return () => {
      debouncedSearch.cancel();
    };
  }, [searchQuery]);

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearchQuery) params.set('q', debouncedSearchQuery);
    if (filterType !== 'all') params.set('type', filterType);
    if (sortBy !== 'newest') params.set('sort', sortBy);
    if (dateFilter !== 'all') params.set('date', dateFilter);
    if (currentPage > 1) params.set('page', currentPage.toString());
    
    setSearchParams(params, { replace: true });
  }, [debouncedSearchQuery, filterType, sortBy, dateFilter, currentPage, setSearchParams]);

  // Persist stats expanded state
  useEffect(() => {
    localStorage.setItem('profile_stats_expanded', showStatsExpanded.toString());
  }, [showStatsExpanded]);

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
      deleteMutation.mutate(deleteConfirm);
      setSelectedItem(null);
      setDeleteConfirm(null);
      
      // Real undo with duplicate check
      toast((t) => (
        <div className="flex items-center gap-3">
          <span>Creation deleted</span>
          <Button
            size="sm"
            onClick={async () => {
              try {
                // Check if item still exists
                const exists = await base44.entities.Creation.filter({ id: itemToDelete.id });
                if (exists.length > 0) {
                  toast.error('Item already exists', { id: t.id });
                  return;
                }
                
                const { id, created_date, updated_date, created_by, ...dataWithoutMeta } = itemToDelete;
                await base44.entities.Creation.create(dataWithoutMeta);
                await queryClient.invalidateQueries({ queryKey: ['creations'] });
                toast.success('Creation restored!', { id: t.id });
              } catch (error) {
                toast.error('Failed to restore', { id: t.id });
              }
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
    
    // Warning for large bulk operations
    if (total > 50) {
      if (!window.confirm(`You're about to delete ${total} items. This may take a while. Continue?`)) {
        setDeleteConfirm(null);
        return;
      }
    }
    
    setBatchDeleteProgress(0);
    setBatchDeleteFailed(0);
    const toastId = toast.loading(`Deleting 0/${total} items...`);
    
    let failed = 0;
    for (let i = 0; i < selectedItems.length; i++) {
      try {
        await deleteMutation.mutateAsync(selectedItems[i]);
      } catch (error) {
        failed++;
        setBatchDeleteFailed(failed);
      }
      const progress = Math.round(((i + 1) / total) * 100);
      setBatchDeleteProgress(progress);
      toast.loading(`Deleting ${i + 1}/${total} items... ${failed > 0 ? `(${failed} failed)` : ''}`, { id: toastId });
    }
    
    if (failed === 0) {
      toast.success(`${total} items deleted successfully`, { id: toastId });
    } else {
      toast.error(`${total - failed}/${total} deleted (${failed} failed)`, { id: toastId });
    }
    
    setSelectedItems([]);
    setDeleteConfirm(null);
    setBatchDeleteProgress(0);
    setBatchDeleteFailed(0);
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
      const matchesSearch = !debouncedSearchQuery || 
        item.title?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        item.prompt?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        item.metadata?.toString().toLowerCase().includes(debouncedSearchQuery.toLowerCase());
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
  }, [creations, debouncedSearchQuery, filterType, dateFilter, sortBy]);

  const totalPages = Math.ceil(filteredCreations.length / ITEMS_PER_PAGE);
  const paginatedCreations = useMemo(() => {
    return filteredCreations.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );
  }, [filteredCreations, currentPage]);

  // Auto-adjust page when it exceeds total pages
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const stats = useMemo(() => ({
    total: creations.length,
    images: creations.filter(c => c.type === 'image').length,
    videos: creations.filter(c => c.type === 'video').length,
    ...getTimeframeStats(creations)
  }), [creations]);

  // Reset page and clear selections when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedItems([]);
  }, [filterType, dateFilter, debouncedSearchQuery, sortBy]);

  const selectAll = useCallback(() => {
    if (selectedItems.length === paginatedCreations.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(paginatedCreations.map(c => c.id));
    }
  }, [selectedItems.length, paginatedCreations]);

  const selectAllFiltered = useCallback(() => {
    if (selectedItems.length === filteredCreations.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredCreations.map(c => c.id));
    }
  }, [selectedItems.length, filteredCreations]);

  const handleKeyDown = useCallback((e, item) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSelectedItem(item);
    }
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Escape to close dialogs (no double confirmation)
      if (e.key === 'Escape') {
        if (selectedItem) {
          setSelectedItem(null);
          return;
        }
        if (deleteConfirm) {
          setDeleteConfirm(null);
          return;
        }
        if (showPasswordDialog) {
          setShowPasswordDialog(false);
          return;
        }
        if (editingTitle) {
          setEditingTitle(null);
          return;
        }
        if (editingPrompt) {
          setEditingPrompt(null);
          return;
        }
      }
      
      // Delete key for selected items
      if (e.key === 'Delete' && selectedItems.length > 0 && !deleteConfirm && !editingTitle && !editingPrompt) {
        handleBatchDelete();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [selectedItem, deleteConfirm, showPasswordDialog, selectedItems, editingTitle, editingPrompt]);

  if (!user) return null;

  return (
    <div className="h-[calc(100dvh-4rem)] overflow-y-auto px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <Toaster 
        position="top-center"
        toastOptions={{
          style: {
            background: '#1a1a1a',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)'
          }
        }}
      />
      <div className="max-w-[1200px] mx-auto">
        
        {/* Profile Header - Instagram/Pinterest Style */}
        <div className="px-4 sm:px-6 py-6 sm:py-8 border-b border-white/5">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8 mb-8">
            <div className="relative group flex-shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-[#FF6B35] via-[#F72C25] to-[#FFB800] p-[3px] shadow-xl">
                <div className="w-full h-full rounded-full bg-[#0a0a0a] flex items-center justify-center text-2xl sm:text-3xl font-bold text-white overflow-hidden">
                  {user.profile_picture ? (
                    <img 
                      src={user.profile_picture} 
                      alt={`${user.display_name || user.full_name || 'User'}'s profile picture`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <span 
                    className="gradient-text w-full h-full flex items-center justify-center"
                    style={{ display: user.profile_picture ? 'none' : 'flex' }}
                  >
                    {(user.display_name || user.full_name || user.email || 'U')[0].toUpperCase()}
                  </span>
                </div>
              </div>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-[#FF6B35] to-[#FFB800] opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer disabled:cursor-not-allowed shadow-lg hover:scale-110"
                aria-label="Change profile picture"
              >
                {isUploading ? (
                  <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5 text-white" />
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
            
            <div className="flex-1 w-full sm:w-auto text-center sm:text-left">
              <div className="flex items-center gap-2 mb-3 justify-center sm:justify-start">
                {isEditingName ? (
                  <>
                    <Input
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="h-9 bg-white/5 border-white/10 text-white text-lg font-semibold max-w-[200px] rounded-lg"
                      placeholder="Enter name"
                      autoFocus
                    />
                    <button 
                      onClick={handleNameUpdate} 
                      className="p-2 rounded-lg bg-[#FF6B35]/20 text-[#FF6B35] hover:bg-[#FF6B35]/30"
                      aria-label="Save name"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setIsEditingName(false)} 
                      className="p-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10"
                      aria-label="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <h2 className="text-lg sm:text-xl font-semibold text-white">{user.display_name || user.full_name || 'User'}</h2>
                    <button 
                      onClick={startEditingName} 
                      className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10"
                      aria-label="Edit name"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>

              {/* Stats Row - Instagram Style */}
              <div className="flex gap-6 mb-4 justify-center sm:justify-start">
                <div>
                  <div className="text-white font-bold text-lg">{stats.total}</div>
                  <div className="text-white/50 text-xs">creations</div>
                </div>
                <div>
                  <div className="text-white font-bold text-lg">{stats.images}</div>
                  <div className="text-white/50 text-xs">images</div>
                </div>
                <div>
                  <div className="text-white font-bold text-lg">{stats.videos}</div>
                  <div className="text-white/50 text-xs">videos</div>
                </div>
              </div>

              <p className="text-white/60 text-sm mb-3 break-all">{user.email}</p>
              <div className="flex gap-2 flex-wrap justify-center sm:justify-start">
                <Button 
                  onClick={handleLogout}
                  size="sm"
                  className="bg-white/5 hover:bg-white/10 text-white border-0 h-8 px-4 text-xs"
                >
                  <LogOut className="w-3 h-3 mr-1.5" />
                  Sign Out
                </Button>
                <Button 
                  onClick={() => setShowPasswordDialog(true)}
                  size="sm"
                  className="bg-white/5 hover:bg-white/10 text-white border-0 h-8 px-4 text-xs"
                >
                  <Lock className="w-3 h-3 mr-1.5" />
                  Password
                </Button>
              </div>
            </div>
            </div>

          {/* Additional Settings - Collapsible */}
          <details className="group/settings">
            <summary className="cursor-pointer text-white/60 text-sm hover:text-white transition-colors flex items-center gap-2 mb-4">
              <span>Settings</span>
              <ChevronDown className="w-4 h-4 transition-transform group-open/settings:rotate-180" />
            </summary>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pb-6">
              <div className="p-4 bg-white/[0.03] hover:bg-white/[0.05] rounded-xl border border-white/5 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-4 h-4 text-[#FF6B35]" />
                  <span className="text-white/60 text-xs font-medium">{t("profile.language")}</span>
                </div>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="w-full bg-white/5 border-white/10 text-white h-8 rounded-lg text-xs">
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

              <div className="p-4 bg-white/[0.03] hover:bg-white/[0.05] rounded-xl border border-white/5 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#FF6B35]" />
                    <span className="text-white/60 text-xs font-medium">Contact Email</span>
                  </div>
                  {!isEditingEmail && (
                    <button 
                      onClick={startEditingEmail} 
                      className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10"
                      aria-label="Edit"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {isEditingEmail ? (
                  <div className="space-y-2">
                    <Input
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="h-8 bg-white/5 border-white/10 text-white rounded-lg text-xs"
                      placeholder="Email"
                    />
                    <div className="flex gap-1">
                      <Button onClick={handleEmailUpdate} size="sm" className="flex-1 btn-gradient text-white h-7 text-xs">
                        <Check className="w-3 h-3 mr-1" />
                        Save
                      </Button>
                      <Button onClick={() => setIsEditingEmail(false)} size="sm" className="bg-white/5 hover:bg-white/10 text-white border-0 h-7 text-xs">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-white/90 text-xs truncate">{user.contact_email || user.email}</p>
                )}
              </div>
            </div>
          </details>
          </div>

        {/* Creations Gallery - Pinterest/Instagram Style */}
        <div className="px-4 sm:px-6 py-6 space-y-4">

          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-white/30 pointer-events-none" />
              <Input
                placeholder="Search your creations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 sm:pl-12 h-11 sm:h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl sm:rounded-2xl text-sm sm:text-base focus:border-[#FF6B35]/40 focus:ring-1 focus:ring-[#FF6B35]/20 transition-all"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full scrollbar-thin">
               <Tabs value={filterType} onValueChange={setFilterType} className="flex-shrink-0">
                <TabsList className="bg-white/5 border border-white/10 h-10 rounded-xl p-1 gap-1">
                  {FILTER_TYPES.map(filter => (
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
                  {DATE_FILTERS.map(filter => (
                    <SelectItem key={filter.value} value={filter.value}>{filter.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[120px] sm:w-[160px] bg-white/5 border-white/10 text-white h-10 rounded-xl text-xs sm:text-sm flex-shrink-0 hover:bg-white/10 transition-all">
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
                    onClick={totalPages > 1 ? selectAllFiltered : selectAll}
                    className="flex-1 sm:flex-none bg-white/10 hover:bg-white/20 text-white border-0 h-9 px-3 sm:px-4 text-xs sm:text-sm"
                    aria-label={totalPages > 1 ? "Select all filtered items" : "Select all visible items"}
                  >
                    {selectedItems.length === filteredCreations.length ? (
                      <><CheckSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" /> Deselect All {totalPages > 1 && `(${filteredCreations.length})`}</>
                    ) : (
                      <><Square className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" /> Select All {totalPages > 1 && `(${filteredCreations.length})`}</>
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
            <LoadingSkeleton />
          ) : filteredCreations.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-32 bg-gradient-to-br from-white/5 to-white/0 rounded-3xl border border-white/5"
            >
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#FF6B35]/20 to-[#FFB800]/20 flex items-center justify-center mx-auto mb-6 border border-[#FF6B35]/20">
                {creations.length === 0 ? <Sparkles className="w-10 h-10 text-[#FF6B35]" /> : <Search className="w-10 h-10 text-[#FF6B35]" />}
              </div>
              <h3 className="text-white text-xl font-semibold mb-2">
                {creations.length === 0 ? 'No creations yet' : 'No results found'}
              </h3>
              <p className="text-white/40 mb-6 max-w-sm mx-auto">
                {creations.length === 0 
                  ? "Start creating amazing content with FLIK's AI tools"
                  : 'Try adjusting your filters or search query'}
              </p>
              {creations.length === 0 && (
                <Button onClick={() => navigate(createPageUrl('Generate'))} className="btn-gradient text-white px-8 h-11">
                  <Wand2 className="w-4 h-4 mr-2" />
                  Create Your First Masterpiece
                </Button>
              )}
            </motion.div>
          ) : (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1 sm:gap-1">
                <AnimatePresence mode="popLayout">
                  {paginatedCreations.map((item, index) => (
                    <motion.div
                      layoutId={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: index * 0.01 }}
                      className={`group relative aspect-square overflow-hidden bg-black cursor-pointer ${
                        selectedItems.includes(item.id) 
                          ? 'ring-2 ring-[#FF6B35] ring-offset-1 ring-offset-[#0a0a0a]' 
                          : ''
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
                      {item.thumbnail_url || item.url ? (
                          <>
                            {!imageErrors[item.id] ? (
                              <img
                                src={item.thumbnail_url || item.url}
                                alt={`${item.title || 'Untitled creation'}`}
                                loading="lazy"
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                onError={() => setImageErrors(prev => ({ ...prev, [item.id]: true }))}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-white/5">
                                <ImageOff className="w-8 h-8 text-white/20" />
                              </div>
                            )}
                            {item.type === 'video' && !imageErrors[item.id] && (
                              <div className="absolute top-2 right-2">
                                <Play className="w-4 h-4 text-white drop-shadow-lg" fill="white" />
                              </div>
                            )}
                          </>
                      ) : (
                          <div className="w-full h-full flex items-center justify-center bg-white/5">
                          <ImageIcon className="w-8 h-8 text-white/10" />
                          </div>
                      )}

                      {/* Hover Overlay - Minimal */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                        <button
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            toggleSelectItem(item.id);
                          }}
                          className={`h-6 w-6 rounded-full flex items-center justify-center transition-all ${
                            selectedItems.includes(item.id) 
                              ? 'bg-[#FF6B35] text-white' 
                              : 'bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30'
                          }`}
                        >
                          {selectedItems.includes(item.id) ? <Check className="w-3.5 h-3.5" /> : <div className="w-3 h-3 rounded-full border border-white/50" />}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {totalPages > 1 && (
                <div className="mt-8 sm:mt-12 md:mt-16 flex items-center justify-center gap-2 sm:gap-3">
                  <Button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="bg-white/5 hover:bg-white/10 text-white border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed h-10 sm:h-11 px-4 sm:px-6 rounded-xl sm:rounded-2xl font-medium text-sm sm:text-base transition-all hover:scale-105"
                  >
                    <span className="hidden sm:inline">Previous</span>
                    <span className="sm:hidden">Prev</span>
                  </Button>
                  <div className="px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-br from-white/10 to-white/5 rounded-xl sm:rounded-2xl border border-white/10 min-w-[80px] sm:min-w-[100px] text-center">
                    <span className="text-white font-bold text-base sm:text-lg">
                      {currentPage} <span className="text-white/30 font-normal">/</span> {totalPages}
                    </span>
                  </div>
                  <Button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="bg-white/5 hover:bg-white/10 text-white border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed h-10 sm:h-11 px-4 sm:px-6 rounded-xl sm:rounded-2xl font-medium text-sm sm:text-base transition-all hover:scale-105"
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
        <DialogContent className="max-w-[100vw] sm:max-w-[95vw] md:max-w-6xl w-full h-[100dvh] sm:h-[95vh] md:h-[90vh] bg-[#1a1a1a] border-0 sm:border sm:border-white/10 text-white p-0 overflow-hidden flex flex-col md:flex-row gap-0 sm:rounded-2xl">
          {/* Image/Video Section */}
          <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden min-h-0">
            {selectedItem?.url && (
              <div className="w-full h-full flex items-center justify-center p-2 sm:p-4">
                {selectedItem.type === 'video' ? (
                  <video 
                    src={selectedItem.url} 
                    controls 
                    className="max-w-full max-h-full w-auto h-auto object-contain shadow-2xl rounded-lg"
                    poster={selectedItem.thumbnail_url}
                  >
                    Your browser does not support video playback.
                  </video>
                ) : (
                  <img 
                    src={selectedItem.url} 
                    alt={`${selectedItem.title || 'Creation'} - Full view`}
                    className="max-w-full max-h-full w-auto h-auto object-contain shadow-2xl rounded-lg" 
                  />
                )}
              </div>
            )}
          </div>

          {/* Details Panel */}
          <div className="w-full md:w-[380px] lg:w-[420px] flex flex-col border-t md:border-t-0 md:border-l border-white/10 bg-[#1a1a1a] max-h-[40vh] md:max-h-full overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-5 md:p-6 border-b border-white/10 flex-shrink-0">
              <DialogHeader className="p-0 space-y-2">
                <DialogTitle className="text-lg sm:text-xl gradient-text line-clamp-2 text-left pr-8">
                  {selectedItem?.title || selectedItem?.prompt || 'Creation'}
                </DialogTitle>
                <DialogDescription className="text-white/50 text-left text-xs sm:text-sm" title={`${new Date(selectedItem?.created_date).toLocaleString()} (${Intl.DateTimeFormat().resolvedOptions().timeZone})`}>
                  Created {selectedItem?.created_date ? new Date(selectedItem.created_date).toLocaleDateString() : 'recently'}
                </DialogDescription>
              </DialogHeader>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6 space-y-5 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full min-h-0">
              {/* Title Edit */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Title</label>
                  {editingTitle === selectedItem?.id ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        updateMutation.mutate({ id: selectedItem.id, data: { title: newTitle } });
                      }}
                      disabled={updateMutation.isPending}
                      className="h-7 text-xs px-3 btn-gradient text-white disabled:opacity-50"
                    >
                      {updateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingTitle(selectedItem?.id);
                        setNewTitle(selectedItem?.title || '');
                        setOriginalTitle(selectedItem?.title || '');
                      }}
                      className="h-7 w-7 p-0 text-white/40 hover:text-white hover:bg-white/10 rounded-lg"
                      aria-label="Edit title"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
                {editingTitle === selectedItem?.id ? (
                  <div className="space-y-2">
                    <Input
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="bg-white/5 border-white/10 text-white h-10 text-sm rounded-lg"
                      placeholder="Enter title..."
                      autoFocus
                      disabled={updateMutation.isPending}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingTitle(null)}
                      className="text-xs text-white/40 hover:text-white h-7"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-white/90 font-medium break-words">{selectedItem?.title || 'Untitled'}</p>
                )}
              </div>

              {/* Prompt Edit */}
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
                        disabled={updateMutation.isPending}
                        className="h-7 text-xs px-3 btn-gradient text-white disabled:opacity-50"
                      >
                        {updateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingPrompt(selectedItem?.id);
                          setNewPrompt(selectedItem?.prompt || '');
                          setOriginalPrompt(selectedItem?.prompt || '');
                        }}
                        className="h-7 w-7 p-0 text-white/40 hover:text-white hover:bg-white/10 rounded-lg"
                        aria-label="Edit prompt"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                  {editingPrompt === selectedItem?.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={newPrompt}
                        onChange={(e) => setNewPrompt(e.target.value)}
                        className="bg-white/5 border-white/10 text-white min-h-[100px] text-sm rounded-lg"
                        placeholder="Enter prompt..."
                        autoFocus
                        disabled={updateMutation.isPending}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingPrompt(null)}
                        className="text-xs text-white/40 hover:text-white h-7"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                      <p className="text-sm text-white/70 leading-relaxed break-words">{selectedItem.prompt}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="p-4 sm:p-5 md:p-6 border-t border-white/10 bg-[#1a1a1a] space-y-2.5 flex-shrink-0">
              <Button
                onClick={() => {
                  navigate(createPageUrl('Editor') + '?load=' + encodeURIComponent(selectedItem.url));
                }}
                className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 h-11 text-sm font-medium rounded-xl"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit in Photo Studio
              </Button>

              <div className="flex gap-2.5">
                <Button
                  onClick={() => handleDownload(selectedItem.url, selectedItem.title || selectedItem.prompt, selectedItem.type)}
                  className="flex-1 btn-gradient text-white h-11 text-sm font-medium rounded-xl"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  onClick={() => handleDelete(selectedItem.id)}
                  variant="outline"
                  className="w-11 h-11 p-0 border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/30 rounded-xl"
                  aria-label="Delete creation"
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