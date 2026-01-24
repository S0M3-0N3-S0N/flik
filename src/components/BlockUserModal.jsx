import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

export default function BlockUserModal({ isOpen, onClose, userEmail, isBlocked = false }) {
  const queryClient = useQueryClient();

  const blockMutation = useMutation({
    mutationFn: async (data) => {
      // Server-side validation
      const validation = await base44.functions.invoke('validateBlock', data);
      if (!validation.data.success) {
        throw new Error(validation.data.error);
      }

      if (isBlocked) {
        const existing = await base44.entities.BlockedUser.filter({
          blocker_email: data.blocker_email,
          blocked_email: data.blocked_email,
        });
        if (existing.length > 0) {
          await base44.entities.BlockedUser.delete(existing[0].id);
        }
      } else {
        await base44.entities.BlockedUser.create(data);
      }
    },
    onSuccess: () => {
      toast.success(isBlocked ? "User unblocked" : "User blocked");
      queryClient.invalidateQueries({ queryKey: ["blockedUsers"] });
      onClose();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update block status");
    },
  });

  const handleToggleBlock = async () => {
    const user = await base44.auth.me();
    if (!user) {
      toast.error("Please log in");
      return;
    }

    blockMutation.mutate({
      blocker_email: user.email,
      blocked_email: userEmail,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a1a1a] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <AlertCircle className="w-5 h-5" />
            {isBlocked ? "Unblock User" : "Block User"}
          </DialogTitle>
          <DialogDescription className="text-white/50">
            {isBlocked
              ? `${userEmail} will be able to see your profile and content again.`
              : `${userEmail} won't be able to see your profile, send you messages, or comment on your content.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 border-white/10 text-white hover:bg-white/10"
            disabled={blockMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleToggleBlock}
            disabled={blockMutation.isPending}
            className={`flex-1 ${
              isBlocked
                ? "bg-green-500/20 hover:bg-green-500/30 text-green-400"
                : "bg-red-500/20 hover:bg-red-500/30 text-red-400"
            }`}
          >
            {blockMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            {isBlocked ? "Unblock" : "Block"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}