import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, Check, X, Loader2, Pencil, LogOut, Users, Calendar, Mail } from "lucide-react";
import { toast } from "react-hot-toast";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";

export default function ProfileHeader({
  user,
  isOwnProfile,
  followerCount,
  followingCount,
  onLogout,
  onFollowClick,
  followMutation,
  isFollowing,
}) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user?.display_name || user?.full_name || "");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef(null);
  const queryClient = useQueryClient();

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.auth.updateMe({ profile_picture: file_url });
      await queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      toast.success("Profile picture updated!");
    } catch {
      toast.error("Failed to upload profile picture");
    } finally {
      setIsUploading(false);
    }
  };

  const handleNameUpdate = async () => {
    if (!nameInput.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    try {
      await base44.auth.updateMe({ display_name: nameInput });
      await queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      setIsEditingName(false);
      toast.success("Name updated!");
    } catch {
      toast.error("Failed to update name");
    }
  };

  return (
    <div className="relative bg-gradient-to-br from-[#141414] to-[#0a0a0a] border border-white/10 rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-10 glass-card overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#FF6B35]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#FFB800]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative flex flex-col md:flex-row items-center gap-4 sm:gap-6 md:gap-8 mb-6 sm:mb-8 md:mb-10 text-center md:text-left">
        {/* Avatar */}
        <div className="relative group">
          <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#FF6B35] via-[#F72C25] to-[#FFB800] p-1 shadow-2xl shadow-[#FF6B35]/30">
            <div className="w-full h-full rounded-[18px] sm:rounded-[22px] bg-[#0a0a0a] flex items-center justify-center text-3xl sm:text-4xl font-bold text-white overflow-hidden">
              {user?.profile_picture ? (
                <img
                  src={user.profile_picture}
                  alt={`${user.display_name || user.full_name || "User"}'s profile`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              ) : null}
              <span className="gradient-text">
                {(user?.display_name || user?.full_name || user?.email || "U")[0].toUpperCase()}
              </span>
            </div>
          </div>

          {isOwnProfile && (
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
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
            aria-label="Upload profile picture"
          />
        </div>

        {/* Info */}
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
                  className="p-2 sm:p-2.5 rounded-xl bg-[#FF6B35]/20 text-[#FF6B35] hover:bg-[#FF6B35]/30 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Save name"
                >
                  <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button
                  onClick={() => setIsEditingName(false)}
                  className="p-2 sm:p-2.5 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Cancel editing name"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
                  {user?.display_name || user?.full_name || "User"}
                </h2>
                {isOwnProfile && (
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="p-2 sm:p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label="Edit name"
                  >
                    <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                )}
              </>
            )}
          </div>

          <p className="text-white/50 text-sm sm:text-base flex items-center gap-2 justify-center md:justify-start flex-wrap break-all">
            <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="break-all">{user?.email}</span>
          </p>

          <div className="mt-3 sm:mt-4 flex items-center gap-4 text-xs sm:text-sm text-white/60 justify-center md:justify-start flex-wrap">
            <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>
                <span className="text-white font-medium">{followerCount}</span> followers
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>
                <span className="text-white font-medium">{followingCount}</span> following
              </span>
            </div>
          </div>

          <div className="mt-2 sm:mt-3 flex items-center gap-2 text-xs sm:text-sm text-white/40 justify-center md:justify-start">
            <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span
              title={`${new Date(user?.created_date).toLocaleString()} (${
                Intl.DateTimeFormat().resolvedOptions().timeZone
              })`}
            >
              Joined{" "}
              {new Date(user?.created_date).toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        {isOwnProfile ? (
          <Button
            onClick={onLogout}
            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40 h-10 sm:h-11 px-4 sm:px-6 text-sm sm:text-base w-full md:w-auto"
          >
            <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
            Sign Out
          </Button>
        ) : (
          <Button
            onClick={onFollowClick}
            disabled={followMutation.isPending}
            className={`h-10 sm:h-11 px-4 sm:px-6 text-sm sm:text-base w-full md:w-auto ${
              isFollowing
                ? "bg-white/10 hover:bg-white/20 text-white border border-white/10"
                : "bg-[#FF6B35] hover:bg-[#F72C25] text-white border-0"
            }`}
          >
            {isFollowing ? "Following" : "Follow"}
          </Button>
        )}
      </div>
    </div>
  );
}