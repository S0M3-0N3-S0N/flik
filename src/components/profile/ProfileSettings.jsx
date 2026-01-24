import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Globe, Mail, Lock, Check, X, Pencil } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { toast } from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function ProfileSettings({ language, setLanguage }) {
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
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
    </>
  );
}