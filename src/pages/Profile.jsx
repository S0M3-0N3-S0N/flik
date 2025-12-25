import React, { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { User, Mail, Calendar, Image as ImageIcon, Video, LogOut, Camera, Loader2, Pencil, Check, X, Lock } from "lucide-react";
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
import { Globe } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Profile() {
  const { t, language, setLanguage } = React.useContext(LanguageContext);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const fileInputRef = useRef(null);
  
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

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

  const { data: creations = [] } = useQuery({
    queryKey: ['my-creations-count', user?.email],
    queryFn: () => base44.entities.Creation.filter({ created_by: user.email }),
    enabled: !!user?.email
  });

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  if (!user) return null;

  return (
    <div className="h-[calc(100dvh-4rem)] overflow-y-auto px-6 py-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">{t("profile.title")}</h1>
        
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
              <div className="flex items-center gap-2 mb-1">
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

            <div className="grid gap-4">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
              <div className="flex items-center gap-3 text-white/70">
                <Globe className="w-5 h-5 text-[#FF6B35]" />
                <span>{t("profile.language")}</span>
              </div>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-[140px] bg-black/20 border-white/10 text-white h-8 text-xs">
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
              <div className="flex items-center gap-3 text-white/70 flex-1">
                <Mail className="w-5 h-5 text-[#FF6B35]" />
                {isEditingEmail ? (
                  <Input
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="h-8 bg-black/20 border-white/10 text-white"
                    placeholder="Enter email address"
                  />
                ) : (
                  <span>{user.contact_email || user.email}</span>
                )}
              </div>
              
              <div className="ml-4">
                {isEditingEmail ? (
                  <div className="flex items-center gap-2">
                    <button onClick={handleEmailUpdate} className="p-1.5 rounded-lg bg-[#FF6B35]/20 text-[#FF6B35] hover:bg-[#FF6B35]/30 transition-colors">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setIsEditingEmail(false)} className="p-1.5 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button onClick={startEditingEmail} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
              <div className="flex items-center gap-3 text-white/70">
                <Lock className="w-5 h-5 text-[#FF6B35]" />
                <span>Password</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowPasswordDialog(true)}
                className="text-white/40 hover:text-white hover:bg-white/10 h-8"
              >
                Change
              </Button>
            </div>

            <div className="flex items-center gap-3 text-white/70 p-4 bg-white/5 rounded-xl border border-white/5">
              <Calendar className="w-5 h-5 text-[#FF6B35]" />
              <span>Joined {new Date(user.created_date).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <h2 className="text-xl font-bold text-white mb-4">Stats</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#141414] border border-white/10 p-6 rounded-2xl glass-card">
            <div className="flex items-center gap-3 mb-2">
              <ImageIcon className="w-5 h-5 text-[#FF6B35]" />
              <span className="text-white/60">Images Created</span>
            </div>
            <p className="text-4xl font-bold text-white gradient-text">
              {creations.filter(c => c.type === 'image').length}
            </p>
          </div>
          <div className="bg-[#141414] border border-white/10 p-6 rounded-2xl glass-card">
            <div className="flex items-center gap-3 mb-2">
              <Video className="w-5 h-5 text-[#FF6B35]" />
              <span className="text-white/60">Videos Created</span>
            </div>
            <p className="text-4xl font-bold text-white gradient-text">
              {creations.filter(c => c.type === 'video').length}
            </p>
          </div>
        </div>
      </div>

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="bg-[#1a1a1a] border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription className="text-white/50">
              To change your password, you need to sign out and use the "Forgot Password" link on the login page.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="ghost" onClick={() => setShowPasswordDialog(false)} className="hover:bg-white/10 text-white">Cancel</Button>
            <Button onClick={handleLogout} className="bg-[#FF6B35] hover:bg-[#FF8B55] text-white">Sign Out & Reset</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}