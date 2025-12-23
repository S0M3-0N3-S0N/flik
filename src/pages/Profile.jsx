import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { User, Mail, Calendar, Image as ImageIcon, Video, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "../utils";

export default function Profile() {
  const navigate = useNavigate();
  
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

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
    <div className="min-h-screen pt-20 px-6 pb-20">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">My Profile</h1>
        
        <div className="bg-[#141414] border border-white/10 rounded-2xl p-8 mb-8 glass-card">
          <div className="flex items-center gap-6 mb-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#FFB800] flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-[#FF6B35]/20">
              {user.full_name?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-1">{user.full_name || 'User'}</h2>
              <p className="text-white/50">{user.email}</p>
            </div>
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/40"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>

          <div className="grid gap-4">
            <div className="flex items-center gap-3 text-white/70 p-4 bg-white/5 rounded-xl border border-white/5">
              <Mail className="w-5 h-5 text-[#FF6B35]" />
              <span>{user.email}</span>
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
    </div>
  );
}