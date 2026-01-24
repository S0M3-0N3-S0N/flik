import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

export default function ReportModal({ isOpen, onClose, reportType, reportId, reportedUserEmail }) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");

  const reportMutation = useMutation({
    mutationFn: (data) => base44.entities.Report.create(data, { data_env: "dev" }),
    onSuccess: () => {
      toast.success("Report submitted successfully");
      setReason("");
      setDescription("");
      onClose();
    },
    onError: () => {
      toast.error("Failed to submit report");
    },
  });

  const handleSubmit = async () => {
    if (!reason) {
      toast.error("Please select a reason");
      return;
    }

    const user = await base44.auth.me();
    if (!user) {
      toast.error("Please log in to report");
      return;
    }

    reportMutation.mutate({
      reporter_email: user.email,
      reported_type: reportType,
      reported_id: reportId,
      reported_user_email: reportedUserEmail || null,
      reason: reason,
      description: description,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a1a1a] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <AlertCircle className="w-5 h-5 text-red-400" />
            Report {reportType}
          </DialogTitle>
          <DialogDescription className="text-white/50">
            Help us keep Flik safe. Please provide details about this report.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">Reason *</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inappropriate">Inappropriate Content</SelectItem>
                <SelectItem value="spam">Spam</SelectItem>
                <SelectItem value="harassment">Harassment</SelectItem>
                <SelectItem value="copyright">Copyright Violation</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">Details</label>
            <Textarea
              placeholder="Describe what's wrong with this content..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-24"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 border-white/10 text-white hover:bg-white/10"
            disabled={reportMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={reportMutation.isPending || !reason}
            className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400"
          >
            {reportMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Submit Report
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}