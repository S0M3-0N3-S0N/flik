import React, { useState, useRef, useContext } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { 
  User, Mail, Calendar, Image as ImageIcon, Video, LogOut, Camera, Loader2, 
  Pencil, Check, X, Lock, Globe, Search, Trash2, Download, Edit, Wand2, Sparkles 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const itemsPerPage = 20;
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editingTitle, setEditingTitle] = useState(null);
  const [newTitle, setNewTitle] = useState('');

  // Data Fetching
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: creations = [], isLoading } = useQuery({
    queryKey: ['creations', user?.email],
    queryFn: () => user ? base44.entities.Creation.filter({ created_by: user.email }, '-created_date', 100) : [],
    enabled: !!user?.email,
    initialData: [],
  });

  // Profile Mutations
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.auth.updateMe({ profile_picture: file_url });
      await queryClient.invalidateQueries({ queryKey: ['user'] });
    } catch (error) {
      console.error("Failed to upload profile picture:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleEmailUpdate = async () => {
    if (!emailInput || !emailInput.includes('@')) return;
    try {
      await base44.auth.updateMe({ contact_email: emailInput });
      await queryClient.invalidateQueries({ queryKey: ['user'] });
      setIsEditingEmail(false);
    } catch (error) {
      console.error("Failed to update email:", error);
    }
  };

  const startEditingEmail = () => {
    setEmailInput(user?.contact_email || user?.email || "");
    setIsEditingEmail(true);
  };

  const handleNameUpdate = async () => {
    if (!nameInput.trim()) return;
    try {
      await base44.auth.updateMe({ display_name: nameInput });
      await queryClient.invalidateQueries({ queryKey: ['user'] });
      setIsEditingName(false);
    } catch (error) {
      console.error("Failed to update name:", error);
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
    },
  });

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

  const stats = {
    total: creations.length,
    images: creations.filter(c => c.type === 'image').length,
    videos: creations.filter(c => c.type === 'video').length,
  };

  if (!user) return null;

  return (
    <div className="h-[calc(100dvh-4rem)] overflow-y-auto px-4 sm:px-6 py-6 sm:py-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Profile Header */}
        <div className="relative bg-gradient-to-br from-[#141414] to-[#0a0a0a] border border-white/10 rounded-3xl p-6 md:p-10 glass-card overflow-hidden">
          {/* Background Glow Effect */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#FF6B35]/5 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#FFB800]/5 rounded-full blur-[120px] pointer-events-none" />
          <div className="relative flex flex-col md:flex-row items-center gap-8 mb-10 text-center md:text-left">
            <div className="relative group">
              <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-[#FF6B35] via-[#F72C25] to-[#FFB800] p-1 shadow-2xl shadow-[#FF6B35]/30">
                <div className="w-full h-full rounded-[22px] bg-[#0a0a0a] flex items-center justify-center text-4xl font-bold text-white overflow-hidden">
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
                className="absolute -bottom-2 -right-2 w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#FF6B35] to-[#FFB800] opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer disabled:cursor-not-allowed shadow-lg hover:scale-110"
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
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 justify-center md:justify-start">
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="h-11 bg-white/5 border-white/10 text-white text-2xl font-bold w-72 rounded-xl"
                      placeholder="Enter name"
                      autoFocus
                    />
                    <button onClick={handleNameUpdate} className="p-2.5 rounded-xl bg-[#FF6B35]/20 text-[#FF6B35] hover:bg-[#FF6B35]/30 transition-colors">
                      <Check className="w-5 h-5" />
                    </button>
                    <button onClick={() => setIsEditingName(false)} className="p-2.5 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-3xl font-bold text-white">{user.display_name || user.full_name || 'User'}</h2>
                    <button onClick={startEditingName} className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all">
                      <Pencil className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
              <p className="text-white/50 text-base flex items-center gap-2 justify-center md:justify-start">
                <Mail className="w-4 h-4" />
                {user.email}
              </p>
              <div className="mt-3 flex items-center gap-2 text-sm text-white/40 justify-center md:justify-start">
                <Calendar className="w-3.5 h-3.5" />
                <span>Joined {new Date(user.created_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
              </div>
            </div>
            
            <Button 
              onClick={handleLogout}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40 h-11 px-6"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t("profile.sign_out")}
            </Button>
          </div>

          <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="group p-5 bg-white/5 hover:bg-white/[0.07] rounded-2xl border border-white/5 hover:border-white/10 transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6B35]/20 to-[#FFB800]/20 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-[#FF6B35]" />
                  </div>
                  <span className="text-white/60 text-sm font-medium">{t("profile.language")}</span>
                </div>
              </div>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-full bg-white/5 border-white/10 text-white h-10 rounded-xl">
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

            <div className="group p-5 bg-white/5 hover:bg-white/[0.07] rounded-2xl border border-white/5 hover:border-white/10 transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6B35]/20 to-[#FFB800]/20 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-[#FF6B35]" />
                  </div>
                  <span className="text-white/60 text-sm font-medium">Contact Email</span>
                </div>
                {!isEditingEmail && (
                  <button onClick={startEditingEmail} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {isEditingEmail ? (
                <div className="space-y-2">
                  <Input
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="h-10 bg-white/5 border-white/10 text-white rounded-xl"
                    placeholder="Email address"
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleEmailUpdate} size="sm" className="flex-1 btn-gradient text-white h-9">
                      <Check className="w-3.5 h-3.5 mr-1.5" />
                      Save
                    </Button>
                    <Button onClick={() => setIsEditingEmail(false)} size="sm" variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10 h-9">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-white/90 text-sm truncate">{user.contact_email || user.email}</p>
              )}
            </div>
            
            <div className="group p-5 bg-white/5 hover:bg-white/[0.07] rounded-2xl border border-white/5 hover:border-white/10 transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6B35]/20 to-[#FFB800]/20 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-[#FF6B35]" />
                  </div>
                  <span className="text-white/60 text-sm font-medium">{t("profile.password")}</span>
                </div>
              </div>
              <Button 
                size="sm" 
                onClick={() => setShowPasswordDialog(true)}
                className="w-full bg-white/5 hover:bg-white/10 text-white border-0 h-9"
              >
                {t("profile.change")}
              </Button>
            </div>

            <div className="group p-5 bg-white/5 hover:bg-white/[0.07] rounded-2xl border border-white/5 hover:border-white/10 transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6B35]/20 to-[#FFB800]/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-[#FF6B35]" />
                </div>
                <span className="text-white/60 text-sm font-medium">Total Creations</span>
              </div>
              <p className="text-3xl font-bold gradient-text">{stats.total}</p>
            </div>
          </div>
        </div>

        {/* Creations Section */}
        <div className="space-y-6">

          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
              <Input
                placeholder="Search your creations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-2xl text-base"
              />
            </div>
            
            <div className="flex gap-3">
               <Tabs value={filterType} onValueChange={setFilterType}>
                <TabsList className="bg-white/5 border border-white/10 h-12 rounded-2xl">
                  <TabsTrigger value="all" className="px-8 data-[state=active]:bg-[#FF6B35] data-[state=active]:text-white rounded-xl">All</TabsTrigger>
                  <TabsTrigger value="image" className="px-8 data-[state=active]:bg-[#FF6B35] data-[state=active]:text-white rounded-xl">Images</TabsTrigger>
                </TabsList>
              </Tabs>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-white h-12 rounded-2xl">
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

          {selectedItems.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-2xl bg-gradient-to-r from-[#FF6B35]/10 to-[#FFB800]/10 border border-[#FF6B35]/20 flex items-center justify-between"
              >
                <span className="text-white font-medium">{selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected</span>
                <div className="flex gap-3">
                  <Button
                    size="sm"
                    onClick={() => setSelectedItems([])}
                    className="bg-white/10 hover:bg-white/20 text-white border-0 h-9 px-4"
                  >
                    Clear
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleBatchDelete}
                    className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border-0 h-9 px-4"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
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
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
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
                        if (window.innerWidth < 768) {
                            setSelectedItem(item);
                        } else {
                            if (e.shiftKey || e.ctrlKey || e.metaKey) {
                                toggleSelectItem(item.id);
                            } else {
                                setSelectedItem(item);
                            }
                        }
                      }}
                    >
                      <div className="absolute inset-0 p-1">
                        <div className="w-full h-full rounded-[20px] overflow-hidden">
                          {item.thumbnail_url || item.url ? (
                              <img
                              src={item.thumbnail_url || item.url}
                              alt={item.title || 'Creation'}
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
                            <h3 className="font-bold text-white text-lg line-clamp-2 mb-1 drop-shadow-lg">
                              {item.title || 'Untitled'}
                            </h3>
                            {item.prompt && (
                              <p className="text-xs text-white/60 line-clamp-1">{item.prompt}</p>
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
            <DialogTitle className="text-xl text-white">
              {deleteConfirm === 'batch' ? `Delete ${selectedItems.length} Items?` : 'Delete Creation?'}
            </DialogTitle>
            <DialogDescription className="text-white/50">
              This action cannot be undone. This will permanently delete {deleteConfirm === 'batch' ? 'these creations' : 'your creation'}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button onClick={() => setDeleteConfirm(null)} variant="outline" className="flex-1 bg-transparent border-white/20 text-white hover:bg-white/10">
              Cancel
            </Button>
            <Button onClick={deleteConfirm === 'batch' ? confirmBatchDelete : confirmDelete} className="flex-1 bg-red-500 hover:bg-red-600 text-white">
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
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

          <div className="w-full md:w-[400px] flex flex-col border-l border-white/10 bg-[#1a1a1a]">
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
                  <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Prompt</label>
                  <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                    <p className="text-sm text-white/70 leading-relaxed">{selectedItem.prompt}</p>
                  </div>
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
                  onClick={() => handleDownload(selectedItem.url, selectedItem.title || selectedItem.prompt)}
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