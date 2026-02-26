import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { BarChart3, Users, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";

export default function Admin() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const loadAdmin = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (currentUser?.role !== 'admin') {
          navigate(createPageUrl('Profile'));
          return;
        }
        setUser(currentUser);
      } catch {
        navigate(createPageUrl('Profile'));
      }
    };
    loadAdmin();
  }, [navigate]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0A0A0A] pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold gradient-text mb-3">Admin Portal</h1>
          <p className="text-white/60 text-lg">Welcome back, {user.full_name}</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="glass-card p-6 rounded-2xl border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="w-6 h-6 text-[#FF6B35]" />
              <h3 className="text-white font-semibold">Dashboard</h3>
            </div>
            <p className="text-white/60 text-sm mb-4">View analytics and statistics</p>
            <Button className="w-full btn-gradient">View Dashboard</Button>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-6 h-6 text-[#FF6B35]" />
              <h3 className="text-white font-semibold">Users</h3>
            </div>
            <p className="text-white/60 text-sm mb-4">Manage users and roles</p>
            <Button className="w-full btn-gradient">Manage Users</Button>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <Settings className="w-6 h-6 text-[#FF6B35]" />
              <h3 className="text-white font-semibold">Settings</h3>
            </div>
            <p className="text-white/60 text-sm mb-4">Configure app settings</p>
            <Button className="w-full btn-gradient">Go to Settings</Button>
          </div>
        </div>

        {/* Admin Info */}
        <div className="glass-card p-8 rounded-2xl border border-white/10 max-w-2xl">
          <h2 className="text-white text-xl font-semibold mb-4">Admin Information</h2>
          <div className="space-y-3 text-white/80">
            <p><span className="text-white/60">Role:</span> Administrator</p>
            <p><span className="text-white/60">Email:</span> {user.email}</p>
            <p><span className="text-white/60">Member Since:</span> {new Date(user.created_date).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Logout Button */}
        <div className="mt-8 flex justify-center">
          <Button
            onClick={() => {
              localStorage.removeItem('admin_portal_access');
              base44.auth.logout();
            }}
            className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/20"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}