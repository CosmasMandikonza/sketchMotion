import { GlassPanel } from "@/components/layout/GlassPanel";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  MousePointer2,
  Pencil,
  Square,
  Circle,
  Type,
  Image,
  ArrowRight,
  Hand,
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CanvasToolbarProps {
  activeTool: string;
  onToolChange: (tool: string) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

const tools = [
  { id: "select", icon: MousePointer2, label: "Select", shortcut: "V" },
  { id: "pan", icon: Hand, label: "Pan", shortcut: "Space" },
  { id: "pencil", icon: Pencil, label: "Pencil", shortcut: "P" },
  { id: "rectangle", icon: Square, label: "Rectangle", shortcut: "R" },
  { id: "ellipse", icon: Circle, label: "Ellipse", shortcut: "O" },
  { id: "text", icon: Type, label: "Text", shortcut: "T" },
  { id: "image", icon: Image, label: "Upload Image", shortcut: "I" },
  { id: "connector", icon: ArrowRight, label: "Connector", shortcut: "C" },
];

export function CanvasToolbar({
  activeTool,
  onToolChange,
  zoom,
  onZoomIn,
  onZoomOut,
  onUndo,
  onRedo,
}: CanvasToolbarProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <GlassPanel className="fixed left-4 top-1/2 -translate-y-1/2 p-2 flex flex-col gap-1 z-40">
        {/* Drawing Tools */}
        {tools.map((tool) => (
          <Tooltip key={tool.id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onToolChange(tool.id)}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                  activeTool === tool.id
                    ? "bg-sm-magenta text-white shadow-glow"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                )}
              >
                <tool.icon className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="flex items-center gap-2">
              <span>{tool.label}</span>
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-xs font-mono">
                {tool.shortcut}
              </kbd>
            </TooltipContent>
          </Tooltip>
        ))}

        {/* Divider */}
        <div className="h-px bg-white/20 my-2" />

        {/* Undo/Redo */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onUndo}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white transition-all"
            >
              <Undo2 className="w-5 h-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <span>Undo</span>
            <kbd className="ml-2 px-1.5 py-0.5 rounded bg-white/10 text-xs font-mono">
              ⌘Z
            </kbd>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onRedo}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white transition-all"
            >
              <Redo2 className="w-5 h-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <span>Redo</span>
            <kbd className="ml-2 px-1.5 py-0.5 rounded bg-white/10 text-xs font-mono">
              ⌘⇧Z
            </kbd>
          </TooltipContent>
        </Tooltip>

        {/* Divider */}
        <div className="h-px bg-white/20 my-2" />

        {/* Zoom Controls */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onZoomOut}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white transition-all"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Zoom Out</TooltipContent>
        </Tooltip>

        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white/70 text-xs font-mono">
          {Math.round(zoom * 100)}%
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onZoomIn}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white transition-all"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Zoom In</TooltipContent>
        </Tooltip>
      </GlassPanel>
    </TooltipProvider>
  );
}
