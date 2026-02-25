import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Globe, Mail, Lock, Check, X, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { toast } from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function ProfileSettings({ language, setLanguage }) {
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const queryClient = useQueryClient();

  const handleEmailUpdate = async () => {
    if (!emailInput.trim() || !emailInput.includes("@")) {
      toast.error("Please enter a valid email");
      return;
    }

    try {
      await base44.auth.updateMe({ contact_email: emailInput });
      await queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      setIsEditingEmail(false);
      toast.success("Email updated!");
    } catch {
      toast.error("Failed to update email");
    }
  };

  const startEditingEmail = async () => {
    const user = await base44.auth.me();
    setEmailInput(user?.contact_email || user?.email || "");
    setIsEditingEmail(true);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmInput !== "DELETE") {
      toast.error("Please type DELETE to confirm");
      return;
    }

    try {
      const user = await base44.auth.me();
      await base44.entities.User.delete(user.id);
      await base44.auth.logout();
      toast.success("Account deleted successfully");
    } catch (error) {
      toast.error("Failed to delete account");
    }
  };

  return (
    <>
      <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Language */}
        <div className="group p-4 sm:p-5 bg-white/5 hover:bg-white/[0.07] rounded-xl sm:rounded-2xl border border-white/5 hover:border-white/10 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#FF6B35]/20 to-[#FFB800]/20 flex items-center justify-center">
                <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF6B35]" />
              </div>
              <span className="text-white/60 text-xs sm:text-sm font-medium">Language</span>
            </div>
          </div>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-full bg-white/5 border-white/10 text-white h-9 sm:h-10 rounded-xl text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Español</SelectItem>
              <SelectItem value="fr">Français</SelectItem>
              <SelectItem value="zh">中文</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Email */}
        <div className="group p-4 sm:p-5 bg-white/5 hover:bg-white/[0.07] rounded-xl sm:rounded-2xl border border-white/5 hover:border-white/10 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#FF6B35]/20 to-[#FFB800]/20 flex items-center justify-center flex-shrink-0">
                <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF6B35]" />
              </div>
              <span className="text-white/60 text-xs sm:text-sm font-medium">Email</span>
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
                <Button
                  onClick={handleEmailUpdate}
                  size="sm"
                  className="flex-1 btn-gradient text-white h-8 sm:h-9 text-xs sm:text-sm"
                >
                  <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5" />
                  Save
                </Button>
                <Button
                  onClick={() => setIsEditingEmail(false)}
                  size="sm"
                  variant="outline"
                  className="bg-white/5 border-white/10 text-white hover:bg-white/10 h-8 sm:h-9 text-xs sm:text-sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-white/90 text-xs sm:text-sm truncate">Email</p>
          )}
        </div>

        {/* Password */}
        <div className="group p-4 sm:p-5 bg-white/5 hover:bg-white/[0.07] rounded-xl sm:rounded-2xl border border-white/5 hover:border-white/10 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#FF6B35]/20 to-[#FFB800]/20 flex items-center justify-center">
                <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF6B35]" />
              </div>
              <span className="text-white/60 text-xs sm:text-sm font-medium">Password</span>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setShowPasswordDialog(true)}
            className="w-full bg-white/5 hover:bg-white/10 text-white border-0 h-8 sm:h-9 text-xs sm:text-sm"
          >
            Change
          </Button>
        </div>
      </div>

      {/* Delete Account Section */}
      <div className="mt-6 p-4 sm:p-5 bg-red-500/10 border border-red-500/20 rounded-xl sm:rounded-2xl">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-semibold text-sm sm:text-base mb-1">Delete Account</h3>
            <p className="text-white/60 text-xs sm:text-sm">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowDeleteDialog(true)}
          className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 h-9 sm:h-10 text-xs sm:text-sm"
        >
          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
          Delete Account
        </Button>
      </div>

      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="bg-[#1a1a1a] border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription className="text-white/50">
              Sign out and use "Forgot Password" on the login page to reset your password.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="ghost"
              onClick={() => setShowPasswordDialog(false)}
              className="hover:bg-white/10 text-white"
            >
              Close
            </Button>
            <Button
              onClick={async () => {
                await base44.auth.logout();
              }}
              className="bg-[#FF6B35] hover:bg-[#F72C25] text-white"
            >
              Sign Out
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-[#1a1a1a] border-red-500/30 text-white sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <DialogTitle className="text-xl">Delete Account</DialogTitle>
            </div>
            <DialogDescription className="text-white/60">
              This will permanently delete your account and all your creations. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm text-white/70 mb-2 block">
                Type <span className="font-bold text-red-400">DELETE</span> to confirm
              </label>
              <Input
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                placeholder="DELETE"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowDeleteDialog(false);
                  setDeleteConfirmInput("");
                }}
                className="flex-1 hover:bg-white/10 text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmInput !== "DELETE"}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white disabled:opacity-50"
              >
                Delete Forever
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}