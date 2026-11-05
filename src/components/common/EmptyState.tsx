import React from "react";
import { FolderSearch } from "lucide-react";

export const EmptyState: React.FC<{
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}> = ({ icon: Icon = FolderSearch, title, description, actionText, onAction }) => (
  <div className="flex flex-col items-center justify-center p-8 text-center bg-white border border-[#E2E8F0] rounded-xl my-3">
    <div className="w-12 h-12 rounded-full bg-blue-50 text-[#145DB5] flex items-center justify-center mb-3">
      <Icon className="w-6 h-6" />
    </div>
    <h3 className="text-sm font-bold text-[#172033] mb-1">{title}</h3>
    {description && (
      <p className="text-xs text-[#667085] max-w-xs mb-4">{description}</p>
    )}
    {actionText && onAction && (
      <button
        onClick={onAction}
        className="rounded-lg bg-[#145DB5] text-white px-4 py-2 text-xs font-semibold hover:bg-[#0F4383] active:scale-95 transition"
      >
        {actionText}
      </button>
    )}
  </div>
);
