import React, { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export function MobileSelect({ value, onValueChange, options, placeholder, triggerClassName, label }) {
  const [open, setOpen] = useState(false);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const selectedOption = options.find(opt => opt.value === value);

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button 
            variant="outline" 
            className={triggerClassName || "w-full justify-between bg-white/5 border-white/10 text-white hover:bg-white/10"}
          >
            {selectedOption?.label || placeholder || "Select..."}
          </Button>
        </DrawerTrigger>
        <DrawerContent className="bg-[#1a1a1a] border-white/10">
          <DrawerHeader>
            <DrawerTitle className="text-white">{label || placeholder || "Select an option"}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-8 space-y-2 max-h-[60vh] overflow-y-auto">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onValueChange(option.value);
                  setOpen(false);
                }}
                className={`w-full p-4 rounded-xl text-left flex items-center justify-between transition-all ${
                  value === option.value 
                    ? 'bg-[#FF6B35]/20 text-[#FF6B35] border-2 border-[#FF6B35]' 
                    : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'
                }`}
              >
                <span className="font-medium">{option.label}</span>
                {value === option.value && <Check className="w-5 h-5" />}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={triggerClassName}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}