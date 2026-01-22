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
    <div className="h-[calc(100dvh-4rem)] overflow-y-auto px-6 py-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">{t("profile.title")}</h1>
        
        {/* Profile Header */}
        <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 md:p-8 mb-8 glass-card">
          <div className="flex flex-col md:flex-row items-center gap-6 mb-8 text-center md:text-left">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#FFB800] flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-[#FF6B35]/20 overflow-hidden border-2 border-white/10">
                {user.profile_picture ? (
                  <img src={user.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span>{(user.display_name || user.full_name || user.email || 'U')[0].toUpperCase()}</span>
                )}
              </div>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-white" />
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
              <div className="flex items-center gap-2 mb-1 justify-center md:justify-start">
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="h-9 bg-black/20 border-white/10 text-white text-xl font-bold w-64"
                      placeholder="Enter name"
                      autoFocus
                    />
                    <button onClick={handleNameUpdate} className="p-1.5 rounded-lg bg-[#FF6B35]/20 text-[#FF6B35] hover:bg-[#FF6B35]/30 transition-colors">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setIsEditingName(false)} className="p-1.5 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-white">{user.display_name || user.full_name || 'User'}</h2>
                    <button onClick={startEditingName} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
              <p className="text-white/50">{user.email}</p>
            </div>
            
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/40"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t("profile.sign_out")}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
              <div className="flex items-center gap-3 text-white/70">
                <Globe className="w-5 h-5 text-[#FF6B35]" />
                <span>{t("profile.language")}</span>
              </div>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-[100px] bg-black/20 border-white/10 text-white h-8 text-xs">
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

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
              <div className="flex items-center gap-3 text-white/70 flex-1 overflow-hidden">
                <Mail className="w-5 h-5 text-[#FF6B35] flex-shrink-0" />
                {isEditingEmail ? (
                  <Input
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="h-8 bg-black/20 border-white/10 text-white w-full min-w-0"
                    placeholder="Email"
                  />
                ) : (
                  <span className="truncate">{user.contact_email || user.email}</span>
                )}
              </div>
              
              <div className="ml-2 flex-shrink-0">
                {isEditingEmail ? (
                  <div className="flex items-center gap-1">
                    <button onClick={handleEmailUpdate} className="p-1 rounded-lg bg-[#FF6B35]/20 text-[#FF6B35] hover:bg-[#FF6B35]/30">
                      <Check className="w-3 h-3" />
                    </button>
                    <button onClick={() => setIsEditingEmail(false)} className="p-1 rounded-lg bg-white/5 text-white/60 hover:bg-white/10">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button onClick={startEditingEmail} className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10">
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
              <div className="flex items-center gap-3 text-white/70">
                <Lock className="w-5 h-5 text-[#FF6B35]" />
                <span>{t("profile.password")}</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowPasswordDialog(true)}
                className="text-white/40 hover:text-white hover:bg-white/10 h-8 text-xs"
              >
                {t("profile.change")}
              </Button>
            </div>

            <div className="flex items-center gap-3 text-white/70 p-4 bg-white/5 rounded-xl border border-white/5">
              <Calendar className="w-5 h-5 text-[#FF6B35]" />
              <span>Joined {new Date(user.created_date).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Stats & Creations Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">{t("nav.my_creations")}</h2>
            <div className="flex gap-4 text-sm text-white/60">
               <div className="flex items-center gap-2">
                 <ImageIcon className="w-4 h-4 text-[#FF6B35]" />
                 <span>{stats.images} Images</span>
               </div>
               <div className="flex items-center gap-2">
                 <Video className="w-4 h-4 text-[#FF6B35]" />
                 <span>{stats.videos} Videos</span>
               </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                placeholder="Search your creations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
            </div>
            
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
               <Tabs value={filterType} onValueChange={setFilterType} className="w-auto">
                <TabsList className="bg-white/5">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="image">Images</TabsTrigger>
                </TabsList>
              </Tabs>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-white">
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
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
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

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredCreations.length === 0 ? (
            <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/5">
              <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6">
                <ImageIcon className="w-8 h-8 text-white/30" />
              </div>
              <p className="text-white/40 text-lg mb-2">No creations found</p>
              <Button onClick={() => navigate(createPageUrl('Generate'))} className="mt-4 btn-gradient text-white">
                Create Something New
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                <AnimatePresence mode="popLayout">
                  {paginatedCreations.map((item, index) => (
                    <motion.div
                      layoutId={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.05 }}
                      className={`group relative md:aspect-square h-auto rounded-2xl overflow-hidden bg-[#141414] border transition-all duration-300 hover:shadow-2xl hover:shadow-[#FF6B35]/10 flex flex-col md:block ${
                        selectedItems.includes(item.id) 
                          ? 'border-[#FF6B35] ring-2 ring-[#FF6B35]/20' 
                          : 'border-white/10 hover:border-white/20'
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
                      <div className="aspect-square w-full relative md:h-full">
                        {item.thumbnail_url || item.url ? (
                            <img
                            src={item.thumbnail_url || item.url}
                            alt={item.title || 'Creation'}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-white/5">
                            <ImageIcon className="w-12 h-12 text-white/30" />
                            </div>
                        )}
                        
                        <div className="absolute top-2 right-2 md:hidden flex gap-2">
                             <button
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    toggleSelectItem(item.id);
                                }}
                                className={`h-8 w-8 rounded-full bg-black/50 text-white backdrop-blur-md border border-white/10 flex items-center justify-center ${
                                    selectedItems.includes(item.id) ? 'bg-[#FF6B35]/80 border-[#FF6B35]' : ''
                                }`}
                             >
                                {selectedItems.includes(item.id) ? '✓' : '○'}
                             </button>
                        </div>
                      </div>

                      <div className="md:absolute md:inset-0 md:bg-gradient-to-t md:from-black/80 md:via-black/20 md:to-transparent md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 flex flex-col justify-between p-3 bg-[#1a1a1a] md:bg-transparent">
                        <div className="hidden md:flex justify-end gap-2 translate-y-[-10px] opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-75">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              toggleSelectItem(item.id);
                            }}
                            className={`h-8 w-8 rounded-full bg-black/50 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 ${
                              selectedItems.includes(item.id) ? 'bg-[#FF6B35]/80 border-[#FF6B35]' : ''
                            }`}
                          >
                            {selectedItems.includes(item.id) ? '✓' : '○'}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                            className="h-8 w-8 rounded-full bg-black/50 hover:bg-red-500/80 text-white backdrop-blur-md border border-white/10 hover:border-red-500/50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="md:translate-y-[10px] md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 transition-all duration-300 delay-100 w-full">
                          <h3 className="font-medium text-white text-sm line-clamp-1 mb-1 drop-shadow-md">
                            {item.title || 'Untitled'}
                          </h3>
                          <div className="grid grid-cols-2 gap-2 mt-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 w-full">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(createPageUrl('Editor') + '?load=' + encodeURIComponent(item.url));
                              }}
                              className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 h-8 text-[10px] sm:text-xs backdrop-blur-md px-1"
                            >
                              <Edit className="w-3 h-3 mr-1 shrink-0" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(createPageUrl("Generate") + '?load=' + encodeURIComponent(item.url));
                              }}
                              className="w-full bg-purple-500/20 hover:bg-purple-500/40 text-white border border-purple-500/40 h-8 text-[10px] sm:text-xs backdrop-blur-md px-1"
                            >
                              <Wand2 className="w-3 h-3 mr-1 shrink-0" />
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
                  <span className="text-white/60 text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
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