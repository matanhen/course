import React, { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Check } from 'lucide-react';

/**
 * On mobile: renders a bottom Drawer for comfortable native-like selection.
 * On desktop: renders the standard Radix Select popover.
 *
 * Props mirror shadcn Select:
 *   value, onValueChange, placeholder, options: [{value, label}]
 *   triggerClassName, disabled, title (optional drawer header)
 */
export default function MobileSelect({
  value,
  onValueChange,
  placeholder = 'בחר...',
  options = [],
  triggerClassName = '',
  disabled = false,
  title,
  children, // for custom SelectItems on desktop fallback
}) {
  const isMobile = useMediaQuery('(max-width: 1023px)');
  const [open, setOpen] = useState(false);

  const selectedLabel = options.find(o => o.value === value)?.label;

  if (isMobile) {
    return (
      <>
        {/* Trigger button that looks like SelectTrigger */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          className={`flex h-9 w-full items-center justify-between rounded-md border border-input bg-zinc-800 border-zinc-700 px-3 py-2 text-sm text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50 ${triggerClassName}`}
        >
          <span className={selectedLabel ? 'text-white' : 'text-gray-500'}>
            {selectedLabel || placeholder}
          </span>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="m6 9 6 6 6-6"/></svg>
        </button>

        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="bg-zinc-950 border-zinc-800" dir="rtl">
            {title && (
              <DrawerHeader className="border-b border-zinc-800">
                <DrawerTitle className="text-white text-center">{title}</DrawerTitle>
              </DrawerHeader>
            )}
            <div className="p-4 space-y-1 overflow-y-auto max-h-[60vh] pb-safe">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onValueChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-right transition-colors ${
                    value === opt.value
                      ? 'bg-[#c7af48]/10 text-[#c7af48]'
                      : 'text-white hover:bg-zinc-800'
                  }`}
                >
                  <span>{opt.label}</span>
                  {value === opt.value && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  // Desktop: standard Select
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={triggerClassName}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-zinc-800 border-zinc-700">
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} className="text-white">
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}