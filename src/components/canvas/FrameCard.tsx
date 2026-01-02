import { cn } from "@/lib/utils";
import { motion, PanInfo } from "framer-motion";
import { GripVertical, Trash2, Copy, MoreHorizontal, Wand2, Minus, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RemoteSelection {
  userId: string;
  userName: string;
  color: string;
}

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
  onPolish?: () => void;
  position: { x: number; y: number };
  zoom: number;
  onPositionChange?: (delta: { dx: number; dy: number }) => void;
  // New props for Beat Mode
  beatModeEnabled?: boolean;
  durationMs?: number;
  onDurationChange?: (newDurationMs: number) => void;
  motionNotes?: string;
  // Remote collaboration
  isRemoteMoving?: boolean;
  remoteSelection?: RemoteSelection | null;
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
  onPolish,
  position,
  zoom,
  onPositionChange,
  beatModeEnabled = false,
  durationMs = 2000,
  onDurationChange,
  motionNotes,
  isRemoteMoving = false,
  remoteSelection = null,
}: FrameCardProps) {
  const durationSec = (durationMs / 1000).toFixed(1);
  
  const handleDecreaseDuration = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newDuration = Math.max(500, durationMs - 500); // Min 0.5s
    onDurationChange?.(newDuration);
  };
  
  const handleIncreaseDuration = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newDuration = Math.min(10000, durationMs + 500); // Max 10s
    onDurationChange?.(newDuration);
  };
  return (
    <motion.div
      className="absolute"
      drag
      dragMomentum={false}
      onDrag={(_, info: PanInfo) => {
        if (!onPositionChange) return;
        onPositionChange({
          dx: info.delta.x / zoom,
          dy: info.delta.y / zoom,
        });
      }}
      initial={{ opacity: 0, scale: 0.8, x: position.x, y: position.y }}
      animate={{ opacity: 1, scale: 1, x: position.x, y: position.y }}
      exit={{ opacity: 0, scale: 0.8 }}
      whileHover={{ scale: 1.02 }}
      transition={{
        x: { type: "spring", stiffness: 300, damping: 30 },
        y: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 },
        scale: { duration: 0.2 }
      }}
    >
      <div
        className={cn(
          "w-48 cursor-pointer transition-all duration-200 group rounded-xl overflow-hidden bg-[#1a1a2e]/90 backdrop-blur-md relative",
          // Selection state (highest priority)
          isSelected && "border-2 border-pink-500/70 shadow-[0_0_15px_rgba(236,72,153,0.2)]",
          // Remote selection state (another user has selected this frame)
          remoteSelection && !isSelected && "border-2 shadow-lg",
          // Remote moving state
          isRemoteMoving && "transition-transform duration-75",
          // Connecting state
          isConnecting && !isSelected && !remoteSelection && "border-2 border-cyan-400/70 shadow-[0_0_15px_rgba(34,211,238,0.2)]",
          // Polishing state
          isPolishing && !isSelected && !isConnecting && !remoteSelection && "border-2 border-violet-400/50 animate-pulse",
          // Polished state (subtle)
          isPolished && !isSelected && !isConnecting && !isPolishing && !remoteSelection && "border border-emerald-400/30",
          // Draft state
          !isPolished && !isSelected && !isConnecting && !isPolishing && !remoteSelection && "border border-dashed border-white/20"
        )}
        style={remoteSelection && !isSelected ? {
          borderColor: remoteSelection.color,
          boxShadow: `0 0 15px ${remoteSelection.color}40`,
        } : undefined}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
      >
        {/* Remote user selection indicator */}
        {remoteSelection && !isSelected && (
          <div
            className="absolute -top-6 left-0 px-2 py-0.5 rounded-t-md text-xs font-medium text-white whitespace-nowrap z-10"
            style={{ backgroundColor: remoteSelection.color }}
          >
            {remoteSelection.userName}
          </div>
        )}
        {/* Header - Minimal */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-white/40 cursor-grab" />
            <span className="text-xs font-medium text-white/70 truncate max-w-[120px]">
              {title || `Frame ${index + 1}`}
            </span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1 rounded hover:bg-white/10 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-4 h-4 text-white/60" />
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

        {/* Image Content */}
        <div className="aspect-[4/3] p-2 relative">
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
                : "bg-gradient-to-br from-pink-500/10 to-purple-500/10",
              !isPolished && "border-2 border-dashed border-white/20"
            )}>
              <span className="text-xs text-white/40 text-center px-2">
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
          
          {/* Quick Polish Button - shows on hover for sketched frames with thumbnails */}
          {!isPolished && !isPolishing && thumbnail && onPolish && (
            <motion.button
              initial={{ opacity: 0 }}
              whileHover={{ scale: 1.1 }}
              onClick={(e) => {
                e.stopPropagation();
                onPolish();
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-violet-500/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
              title="Polish with AI"
            >
              <Wand2 className="w-3.5 h-3.5 text-white" />
            </motion.button>
          )}

          {/* Duration badge - floating in corner */}
          {beatModeEnabled ? (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-500/90 backdrop-blur-sm">
              <button onClick={handleDecreaseDuration} className="hover:bg-white/20 rounded p-0.5">
                <Minus className="w-2.5 h-2.5 text-white" />
              </button>
              <span className="text-[10px] font-mono font-medium text-white min-w-[2rem] text-center">
                {durationSec}s
              </span>
              <button onClick={handleIncreaseDuration} className="hover:bg-white/20 rounded p-0.5">
                <Plus className="w-2.5 h-2.5 text-white" />
              </button>
            </div>
          ) : (
            <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm">
              <span className="text-[10px] font-mono text-white/70">{durationSec}s</span>
            </div>
          )}
        </div>

        {/* Motion notes - below image, minimal */}
        {motionNotes && (
          <div className="px-3 py-2 border-t border-white/5">
            <p className="text-[10px] text-white/50 truncate" title={motionNotes}>
              🎬 {motionNotes}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
