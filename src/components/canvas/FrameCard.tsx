import { GlassCard } from "@/components/layout/GlassCard";
import { cn } from "@/lib/utils";
import { motion, PanInfo } from "framer-motion";
import { GripVertical, Trash2, Copy, MoreHorizontal, Wand2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FrameCardProps {
  id: string;
  index: number;
  title?: string;
  thumbnail?: string;
  thumbnailColor?: string;
  isSelected: boolean;
  isConnecting?: boolean;
  isPolished?: boolean;
  isPolishing?: boolean;
  onClick: () => void;
  onDoubleClick?: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  position: { x: number; y: number };
  zoom: number;
  onPositionChange?: (delta: { dx: number; dy: number }) => void;
}

export function FrameCard({
  id,
  index,
  title,
  thumbnail,
  thumbnailColor,
  isSelected,
  isConnecting,
  isPolished,
  isPolishing,
  onClick,
  onDoubleClick,
  onDelete,
  onDuplicate,
  position,
  zoom,
  onPositionChange,
}: FrameCardProps) {
  return (
    <motion.div
      className="absolute"
      style={{ x: position.x, y: position.y }}
      drag
      dragMomentum={false}
      onDrag={(_, info: PanInfo) => {
        if (!onPositionChange) return;
        onPositionChange({
          dx: info.delta.x / zoom,
          dy: info.delta.y / zoom,
        });
      }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      whileHover={{ scale: 1.02 }}
    >
      <GlassCard
        variant="light"
        className={cn(
          "w-48 cursor-pointer transition-all",
          isConnecting && "ring-2 ring-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.6)] animate-pulse",
          isSelected && !isConnecting && "ring-2 ring-sm-magenta shadow-glow",
          isPolished && !isSelected && !isConnecting && "ring-2 ring-sm-mint",
          isPolishing && "animate-pulse ring-2 ring-sm-soft-purple shadow-[0_0_20px_rgba(167,139,250,0.5)]",
          !isPolished && !isSelected && !isPolishing && !isConnecting && "border-2 border-dashed border-white/30"
        )}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-sm-charcoal/40 cursor-grab" />
            <span className="text-xs font-mono text-sm-charcoal/60 truncate max-w-[100px]">
              {title || `Frame ${index + 1}`}
            </span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1 rounded hover:bg-black/5 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-4 h-4 text-sm-charcoal/60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-red-500">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Content */}
        <div className="aspect-[4/3] p-2">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={title || `Frame ${index + 1}`}
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <div className={cn(
              "w-full h-full rounded-lg flex items-center justify-center",
              thumbnailColor 
                ? `bg-gradient-to-br ${thumbnailColor}` 
                : "bg-gradient-to-br from-sm-pink/10 to-sm-purple/10",
              !isPolished && "border-2 border-dashed border-sm-charcoal/20"
            )}>
              <span className="text-xs text-sm-charcoal/40 text-center px-2">
                {isPolishing ? (
                  <span className="flex items-center gap-1">
                    <Wand2 className="w-3 h-3 animate-spin" />
                    Polishing...
                  </span>
                ) : (
                  "Double-click to edit"
                )}
              </span>
            </div>
          )}
        </div>

        {/* Status Badge */}
        {isPolished && (
          <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-sm-mint text-white text-xs font-medium shadow-lg">
            Polished
          </div>
        )}

        {/* Polishing Indicator */}
        {isPolishing && (
          <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-sm-soft-purple text-white text-xs font-medium shadow-lg flex items-center gap-1">
            <Wand2 className="w-3 h-3 animate-spin" />
            AI
          </div>
        )}

        {/* Sketch indicator for non-polished frames */}
        {!isPolished && !isPolishing && !isConnecting && (
          <div className="absolute -top-2 -left-2 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-white/70 text-xs font-medium">
            Sketch
          </div>
        )}

        {/* Connecting indicator */}
        {isConnecting && (
          <div className="absolute -top-2 -left-2 px-2 py-0.5 rounded-full bg-cyan-400 text-white text-xs font-medium shadow-lg animate-pulse">
            Connecting...
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}
