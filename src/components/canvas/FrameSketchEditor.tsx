import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/layout/GlassCard";
import { Button } from "@/components/ui/button";
import {
  X,
  Undo2,
  Trash2,
  Check,
  Pencil,
  Minus,
  Square,
  Circle,
  ArrowRight,
  Eraser,
  Type,
  ImageIcon,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FrameSketchEditorProps {
  frame: {
    id: string;
    title: string;
    sketchDataUrl?: string;
  } | null;
  open: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
}

// Expanded color palette
const COLORS = [
  { name: "White", value: "#FFFFFF" },
  { name: "Black", value: "#000000" },
  { name: "Magenta", value: "#FF3D8F" },
  { name: "Cyan", value: "#00D9FF" },
  { name: "Purple", value: "#A78BFA" },
  { name: "Orange", value: "#FF8E53" },
  { name: "Green", value: "#6EE7B7" },
  { name: "Yellow", value: "#FBBF24" },
];

// Tool types
type ToolType = "pen" | "line" | "rectangle" | "circle" | "arrow" | "eraser" | "text" | "image";

const TOOLS: { id: ToolType; name: string; icon: React.ElementType; shortcut: string }[] = [
  { id: "pen", name: "Pen (1)", icon: Pencil, shortcut: "1" },
  { id: "line", name: "Line (2)", icon: Minus, shortcut: "2" },
  { id: "rectangle", name: "Rectangle (3)", icon: Square, shortcut: "3" },
  { id: "circle", name: "Circle (4)", icon: Circle, shortcut: "4" },
  { id: "arrow", name: "Arrow (5)", icon: ArrowRight, shortcut: "5" },
  { id: "eraser", name: "Eraser (6)", icon: Eraser, shortcut: "6" },
  { id: "text", name: "Text (T)", icon: Type, shortcut: "t" },
  { id: "image", name: "Image (I)", icon: ImageIcon, shortcut: "i" },
];

const CANVAS_BG = "#1a1a2e";
const MAX_HISTORY = 10;

export function FrameSketchEditor({
  frame,
  open,
  onClose,
  onSave,
}: FrameSketchEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedTool, setSelectedTool] = useState<ToolType>("pen");
  const selectedToolRef = useRef<ToolType>("pen"); // Ref to avoid stale closures
  const [selectedColor, setSelectedColor] = useState(COLORS[0].value);
  const [brushSize, setBrushSize] = useState([8]);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [fillShapes, setFillShapes] = useState(false);
  const [sketchyMode, setSketchyMode] = useState(true);

  // Keep ref in sync with state
  useEffect(() => {
    selectedToolRef.current = selectedTool;
  }, [selectedTool]);

  // Text tool state
  const [textInput, setTextInput] = useState("");
  const [textPosition, setTextPosition] = useState<{ x: number; y: number } | null>(null);
  const [isTextInputActive, setIsTextInputActive] = useState(false);

  // Save confirmation state
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);

  // Shape drawing state
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const currentPosRef = useRef<{ x: number; y: number } | null>(null);

  // Undo history
  const [history, setHistory] = useState<string[]>([]);
  const historyIndexRef = useRef(-1);

  // Save current state to history
  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");
    setHistory((prev) => {
      const newHistory = [...prev.slice(0, historyIndexRef.current + 1), dataUrl];
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      } else {
        historyIndexRef.current++;
      }
      return newHistory;
    });
  }, []);

  // Draw grid pattern on canvas
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, width, height);

    // Draw dot grid
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    for (let x = 0; x < width; x += 20) {
      for (let y = 0; y < height; y += 20) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, []);

  // Initialize canvas when opened
  useEffect(() => {
    if (open && canvasRef.current && previewCanvasRef.current) {
      const canvas = canvasRef.current;
      const previewCanvas = previewCanvasRef.current;
      const ctx = canvas.getContext("2d");
      const previewCtx = previewCanvas.getContext("2d");
      if (!ctx || !previewCtx) return;

      // Get device pixel ratio for crisp rendering on retina displays
      const dpr = window.devicePixelRatio || 1;
      
      // Display size (what we work with in coordinates)
      const displayWidth = 640;
      const displayHeight = 360;
      
      // Actual canvas size (scaled for retina)
      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
      previewCanvas.width = displayWidth * dpr;
      previewCanvas.height = displayHeight * dpr;
      
      // Scale context so we can use display coordinates
      ctx.scale(dpr, dpr);
      previewCtx.scale(dpr, dpr);

      // Draw grid background
      drawGrid(ctx, displayWidth, displayHeight);

      // Clear preview canvas
      previewCtx.clearRect(0, 0, displayWidth, displayHeight);

      // Reset history
      setHistory([]);
      historyIndexRef.current = -1;

      // If frame has existing sketch, draw it
      if (frame?.sketchDataUrl) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
          // Save initial state to history
          saveToHistory();
        };
        img.src = frame.sketchDataUrl;
      } else {
        // Save initial state to history
        saveToHistory();
      }
    }
  }, [open, frame?.sketchDataUrl, drawGrid, saveToHistory]);

  // Use 640x360 as the coordinate system (display size)
  const getCanvasCoordinates = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement | HTMLDivElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      // Always use 640x360 as the coordinate system
      const x = ((e.clientX - rect.left) / rect.width) * 640;
      const y = ((e.clientY - rect.top) / rect.height) * 360;

      return { x, y };
    },
    []
  );

  // Draw arrow helper
  const drawArrow = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      fromX: number,
      fromY: number,
      toX: number,
      toY: number,
      color: string,
      lineWidth: number
    ) => {
      const headLength = Math.max(lineWidth * 3, 15);
      const angle = Math.atan2(toY - fromY, toX - fromX);

      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Draw line
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();

      // Draw arrowhead
      ctx.beginPath();
      ctx.moveTo(toX, toY);
      ctx.lineTo(
        toX - headLength * Math.cos(angle - Math.PI / 6),
        toY - headLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(toX, toY);
      ctx.lineTo(
        toX - headLength * Math.cos(angle + Math.PI / 6),
        toY - headLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.stroke();
    },
    []
  );

  // Start drawing
  const startDrawing = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const pos = getCanvasCoordinates(e);
      const tool = selectedToolRef.current; // Use ref to get current tool

      console.log("startDrawing - tool from ref:", tool, "state:", selectedTool); // DEBUG

      // Handle text tool - show input overlay
      if (tool === "text") {
        console.log("TEXT TOOL DETECTED - opening input"); // DEBUG
        setTextPosition(pos);
        setIsTextInputActive(true);
        setTextInput("");
        return;
      }

      // Image tool handled by toolbar button directly
      if (tool === "image") {
        return;
      }

      startPosRef.current = pos;
      lastPosRef.current = pos;
      setIsDrawing(true);

      // For pen/eraser, draw initial dot
      if (tool === "pen" || tool === "eraser") {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!ctx) return;

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, brushSize[0] / 2, 0, Math.PI * 2);
        ctx.fillStyle = tool === "eraser" ? CANVAS_BG : selectedColor;
        ctx.fill();
      }
    },
    [getCanvasCoordinates, brushSize, selectedColor]
  );

  // Draw while moving
  const draw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const pos = getCanvasCoordinates(e);
      const tool = selectedToolRef.current; // Use ref
      currentPosRef.current = pos;
      setCursorPos(pos);

      if (!isDrawing || !startPosRef.current) return;

      const canvas = canvasRef.current;
      const previewCanvas = previewCanvasRef.current;
      const ctx = canvas?.getContext("2d");
      const previewCtx = previewCanvas?.getContext("2d");
      if (!ctx || !previewCtx || !previewCanvas) return;

      // Clear preview canvas (use display size)
      previewCtx.clearRect(0, 0, 640, 360);

      const color = tool === "eraser" ? CANVAS_BG : selectedColor;

      if (tool === "pen" || tool === "eraser") {
        if (lastPosRef.current) {
          const color = tool === "eraser" ? CANVAS_BG : selectedColor;

          ctx.strokeStyle = color;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";

          if (sketchyMode && tool === "pen") {
            // ENHANCED SKETCHY MODE - Excalidraw-style hand-drawn effect
            const midX = (lastPosRef.current.x + pos.x) / 2;
            const midY = (lastPosRef.current.y + pos.y) / 2;
            
            // Primary stroke with significant wobble
            const wobbleAmount = 5 + Math.random() * 3; // 5-8px wobble
            const wobbleX = midX + (Math.random() - 0.5) * wobbleAmount;
            const wobbleY = midY + (Math.random() - 0.5) * wobbleAmount;
            
            // Vary line width slightly for organic feel
            ctx.lineWidth = brushSize[0] * (0.9 + Math.random() * 0.2);
            
            ctx.beginPath();
            ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
            ctx.quadraticCurveTo(wobbleX, wobbleY, pos.x, pos.y);
            ctx.stroke();
            
            // Secondary "shadow" stroke for pencil-like depth
            ctx.globalAlpha = 0.25;
            ctx.lineWidth = brushSize[0] * 0.6;
            ctx.beginPath();
            ctx.moveTo(
              lastPosRef.current.x + (Math.random() - 0.5) * 3,
              lastPosRef.current.y + (Math.random() - 0.5) * 3
            );
            ctx.quadraticCurveTo(
              wobbleX + (Math.random() - 0.5) * 4,
              wobbleY + (Math.random() - 0.5) * 4,
              pos.x + (Math.random() - 0.5) * 3,
              pos.y + (Math.random() - 0.5) * 3
            );
            ctx.stroke();
            ctx.globalAlpha = 1;
            
          } else {
            // Clean smooth drawing (Sketchy OFF or Eraser)
            ctx.lineWidth = brushSize[0];
            const midX = (lastPosRef.current.x + pos.x) / 2;
            const midY = (lastPosRef.current.y + pos.y) / 2;
            
            ctx.beginPath();
            ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
            ctx.quadraticCurveTo(midX, midY, pos.x, pos.y);
            ctx.stroke();
          }
        }
        lastPosRef.current = pos;
      } else if (tool !== "text" && tool !== "image") {
        // Shape preview on preview canvas
        previewCtx.strokeStyle = selectedColor;
        previewCtx.fillStyle = selectedColor;
        previewCtx.lineWidth = brushSize[0];
        previewCtx.lineCap = "round";
        previewCtx.lineJoin = "round";
        previewCtx.globalAlpha = 0.6;

        const startX = startPosRef.current.x;
        const startY = startPosRef.current.y;

        switch (tool) {
          case "line":
            previewCtx.beginPath();
            previewCtx.moveTo(startX, startY);
            previewCtx.lineTo(pos.x, pos.y);
            previewCtx.stroke();
            break;

          case "rectangle":
            if (fillShapes) {
              previewCtx.fillRect(startX, startY, pos.x - startX, pos.y - startY);
            } else {
              previewCtx.strokeRect(startX, startY, pos.x - startX, pos.y - startY);
            }
            break;

          case "circle":
            const radiusX = Math.abs(pos.x - startX) / 2;
            const radiusY = Math.abs(pos.y - startY) / 2;
            const centerX = startX + (pos.x - startX) / 2;
            const centerY = startY + (pos.y - startY) / 2;
            previewCtx.beginPath();
            previewCtx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
            if (fillShapes) {
              previewCtx.fill();
            } else {
              previewCtx.stroke();
            }
            break;

          case "arrow":
            drawArrow(previewCtx, startX, startY, pos.x, pos.y, selectedColor, brushSize[0]);
            break;
        }

        previewCtx.globalAlpha = 1;
      }
    },
    [isDrawing, getCanvasCoordinates, brushSize, selectedColor, drawArrow, fillShapes, sketchyMode]
  );

  // Stop drawing and commit shape
  const stopDrawing = useCallback(() => {
    if (!isDrawing) return;

    const tool = selectedToolRef.current; // Use ref
    const canvas = canvasRef.current;
    const previewCanvas = previewCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    const previewCtx = previewCanvas?.getContext("2d");

    if (ctx && previewCtx && previewCanvas && startPosRef.current) {
      const endPos = currentPosRef.current || startPosRef.current;
      if (!endPos) return;

      // Commit shape to main canvas
      if (tool !== "pen" && tool !== "eraser" && tool !== "text" && tool !== "image") {
        ctx.strokeStyle = selectedColor;
        ctx.fillStyle = selectedColor;
        ctx.lineWidth = brushSize[0];
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        const startX = startPosRef.current.x;
        const startY = startPosRef.current.y;

        switch (tool) {
          case "line":
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endPos.x, endPos.y);
            ctx.stroke();
            break;

          case "rectangle":
            if (fillShapes) {
              ctx.fillRect(startX, startY, endPos.x - startX, endPos.y - startY);
            } else {
              ctx.strokeRect(startX, startY, endPos.x - startX, endPos.y - startY);
            }
            break;

          case "circle":
            const radiusX = Math.abs(endPos.x - startX) / 2;
            const radiusY = Math.abs(endPos.y - startY) / 2;
            const centerX = startX + (endPos.x - startX) / 2;
            const centerY = startY + (endPos.y - startY) / 2;
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
            if (fillShapes) {
              ctx.fill();
            } else {
              ctx.stroke();
            }
            break;

          case "arrow":
            drawArrow(ctx, startX, startY, endPos.x, endPos.y, selectedColor, brushSize[0]);
            break;
        }
      }

      // Clear preview canvas (use display size)
      previewCtx.clearRect(0, 0, 640, 360);

      // Save to history
      saveToHistory();
    }

    setIsDrawing(false);
    startPosRef.current = null;
    lastPosRef.current = null;
    currentPosRef.current = null;
  }, [isDrawing, selectedColor, brushSize, drawArrow, saveToHistory, fillShapes]);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setCursorPos(null);
    if (isDrawing) {
      stopDrawing();
    }
  }, [isDrawing, stopDrawing]);

  // Handle mouse move on container (for cursor preview)
  const handleContainerMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const pos = getCanvasCoordinates(e);
      setCursorPos(pos);
    },
    [getCanvasCoordinates]
  );

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;

    historyIndexRef.current--;
    const prevState = history[historyIndexRef.current];
    if (!prevState) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    const img = new Image();
    img.onload = () => {
      // Clear using display size
      ctx.clearRect(0, 0, 640, 360);
      ctx.drawImage(img, 0, 0, 640, 360);
    };
    img.src = prevState;
  }, [history]);

  // Clear canvas
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    // Use display size (640x360), not actual canvas size
    drawGrid(ctx, 640, 360);
    saveToHistory();
  }, [drawGrid, saveToHistory]);

  // Save
  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Show save confirmation
    setShowSaveConfirmation(true);
    
    setTimeout(() => {
      const dataUrl = canvas.toDataURL("image/png");
      onSave(dataUrl);
      setShowSaveConfirmation(false);
      onClose();
    }, 400);
  }, [onSave, onClose]);

  // Handle text submission
  const handleTextSubmit = useCallback(() => {
    if (!textInput.trim() || !textPosition) {
      setIsTextInputActive(false);
      setTextPosition(null);
      setTextInput("");
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    // Font size based on brush size: S=18, M=28, L=42
    const fontSize = brushSize[0] === 3 ? 18 : brushSize[0] === 8 ? 28 : 42;
    
    ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = selectedColor;
    ctx.textBaseline = "top";
    ctx.fillText(textInput, textPosition.x, textPosition.y);

    saveToHistory();
    setIsTextInputActive(false);
    setTextPosition(null);
    setTextInput("");
  }, [textInput, textPosition, brushSize, selectedColor, saveToHistory]);

  // Handle image upload
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    const img = new window.Image();
    img.onload = () => {
      // Scale image to fit nicely on canvas
      const maxWidth = 500;
      const maxHeight = 300;
      
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      // Center on canvas
      const x = (640 - width) / 2;
      const y = (360 - height) / 2;
      
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, x, y, width, height);
      
      saveToHistory();
      URL.revokeObjectURL(img.src);
    };
    
    img.src = URL.createObjectURL(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [saveToHistory]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when text input is active
      if (isTextInputActive) {
        if (e.key === "Escape") {
          setIsTextInputActive(false);
          setTextPosition(null);
        }
        return;
      }

      if (e.key === "z" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleUndo();
      }
      if (e.key === "1") setSelectedTool("pen");
      if (e.key === "2") setSelectedTool("line");
      if (e.key === "3") setSelectedTool("rectangle");
      if (e.key === "4") setSelectedTool("circle");
      if (e.key === "5") setSelectedTool("arrow");
      if (e.key === "6") setSelectedTool("eraser");
      if (e.key === "t") setSelectedTool("text");
      if (e.key === "i") setSelectedTool("image");
      if (e.key === "f") setFillShapes(prev => !prev);
      if (e.key === "s" && !e.metaKey && !e.ctrlKey) setSketchyMode(prev => !prev);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handleUndo, isTextInputActive]);

  if (!open || !frame) return null;

  return (
    <TooltipProvider>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-5xl"
          >
            <GlassCard className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-display font-bold text-xl text-white">
                    Sketch Editor
                  </h2>
                  <p className="text-sm text-white/60">
                    Editing: {frame.title}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>

              {/* Main Toolbar */}
              <div className="flex flex-wrap items-center gap-3 mb-4 p-3 rounded-xl bg-white/5">
                {/* Drawing Tools */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-white/40 uppercase tracking-wider">Tools</span>
                  <div className="flex items-center gap-1">
                    {TOOLS.map((tool) => {
                      const Icon = tool.icon;
                      const isSelected = selectedTool === tool.id;
                      return (
                        <Tooltip key={tool.id}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => {
                                // For image tool, set selected AND open file picker
                                if (tool.id === "image") {
                                  setSelectedTool("image");
                                  fileInputRef.current?.click();
                                  return;
                                }
                                setSelectedTool(tool.id);
                              }}
                              className={cn(
                                "p-2 rounded-lg transition-all",
                                isSelected
                                  ? "bg-sm-magenta text-white shadow-glow"
                                  : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                              )}
                            >
                              <Icon className="w-4 h-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>{tool.name}</TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>

                <div className="w-px h-10 bg-white/20" />

                {/* Colors */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-white/40 uppercase tracking-wider">Colors</span>
                  <div className="flex items-center gap-1 flex-wrap max-w-[180px]">
                    {COLORS.map((color) => (
                      <Tooltip key={color.value}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => {
                              setSelectedColor(color.value);
                              if (selectedTool === "eraser") {
                                setSelectedTool("pen");
                              }
                            }}
                            className={cn(
                              "w-6 h-6 rounded-full border-2 transition-all",
                              selectedColor === color.value && selectedTool !== "eraser"
                                ? "border-white scale-110 ring-2 ring-white/30"
                                : "border-white/30 hover:border-white/60"
                            )}
                            style={{ backgroundColor: color.value }}
                          />
                        </TooltipTrigger>
                        <TooltipContent>{color.name}</TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>

                <div className="w-px h-10 bg-white/20" />

                {/* Size + Fill + Sketchy */}
                <div className="flex items-center gap-2">
                  {[
                    { label: "S", size: 3 },
                    { label: "M", size: 8 },
                    { label: "L", size: 16 },
                  ].map((option) => (
                    <button
                      key={option.label}
                      onClick={() => setBrushSize([option.size])}
                      className={cn(
                        "w-7 h-7 rounded-lg text-xs font-bold transition-all",
                        brushSize[0] === option.size
                          ? "bg-sm-magenta text-white shadow-glow"
                          : "bg-white/10 text-white/60 hover:bg-white/20"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                  {/* Fill toggle */}
                  <button
                    onClick={() => setFillShapes(!fillShapes)}
                    className={cn(
                      "px-2 h-7 rounded-lg text-xs font-medium transition-all flex items-center gap-1",
                      fillShapes
                        ? "bg-sm-purple text-white"
                        : "bg-white/10 text-white/60 hover:bg-white/20"
                    )}
                  >
                    {fillShapes ? <Square className="w-3 h-3 fill-current" /> : <Square className="w-3 h-3" />}
                    Fill
                  </button>
                  {/* Sketchy toggle */}
                  <button
                    onClick={() => setSketchyMode(!sketchyMode)}
                    className={cn(
                      "px-2 h-7 rounded-lg text-xs font-medium transition-all flex items-center gap-1",
                      sketchyMode
                        ? "bg-[#00D9FF] text-white"
                        : "bg-white/10 text-white/60 hover:bg-white/20"
                    )}
                  >
                    ✏️ Sketchy
                  </button>
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={handleUndo}
                        disabled={historyIndexRef.current <= 0}
                        className="bg-white/15 border border-white/30 text-white hover:bg-white/25 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Undo2 className="w-4 h-4" />
                        Undo
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={clearCanvas}
                        className="bg-red-500/25 border border-red-400/30 text-red-200 hover:bg-red-500/35 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-sm font-medium"
                      >
                        <Trash2 className="w-4 h-4" />
                        Clear
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Clear All</TooltipContent>
                  </Tooltip>

                  {/* Hidden file input for image upload */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Canvas Container */}
              <div
                ref={containerRef}
                className="relative rounded-xl bg-sm-charcoal/50 mb-4"
                onMouseMove={handleContainerMouseMove}
                onMouseLeave={() => setCursorPos(null)}
              >
                {/* Main Canvas */}
                <canvas
                  ref={canvasRef}
                  className="w-full block"
                  style={{ aspectRatio: "16/9", cursor: "none" }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={handleMouseLeave}
                />

                {/* Preview Canvas (for shape previews) */}
                <canvas
                  ref={previewCanvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ aspectRatio: "16/9" }}
                />

                {/* Vignette overlay */}
                <div 
                  className="absolute inset-0 pointer-events-none rounded-xl"
                  style={{
                    background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.3) 100%)"
                  }}
                />

                {/* Active tool indicator */}
                <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-md bg-black/50 backdrop-blur-sm">
                  <span className="text-xs text-white/70 font-medium">
                    {TOOLS.find(t => t.id === selectedTool)?.name.split(" ")[0]}
                    {selectedTool !== "pen" && selectedTool !== "eraser" && selectedTool !== "text" && selectedTool !== "image" && fillShapes && " (Filled)"}
                    {sketchyMode && selectedTool === "pen" && " ✏️"}
                  </span>
                </div>

                {/* Zoom indicator */}
                <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-md bg-black/50 backdrop-blur-sm">
                  <span className="text-xs text-white/70 font-mono">100%</span>
                </div>

                {/* Text input overlay */}
                {isTextInputActive && textPosition && (
                  <div
                    className="absolute"
                    style={{
                      left: `${(textPosition.x / 640) * 100}%`,
                      top: `${(textPosition.y / 360) * 100}%`,
                      zIndex: 9999,
                    }}
                  >
                    <input
                      type="text"
                      autoFocus
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleTextSubmit();
                        } else if (e.key === "Escape") {
                          setIsTextInputActive(false);
                          setTextPosition(null);
                          setTextInput("");
                        }
                      }}
                      onBlur={() => {
                        if (textInput.trim()) {
                          handleTextSubmit();
                        } else {
                          setIsTextInputActive(false);
                          setTextPosition(null);
                        }
                      }}
                      placeholder="Type here..."
                      style={{
                        fontSize: brushSize[0] === 3 ? 18 : brushSize[0] === 8 ? 28 : 42,
                        color: selectedColor,
                        backgroundColor: 'rgba(0, 0, 0, 0.95)',
                        border: '3px solid #FF3D8F',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        outline: 'none',
                        minWidth: '200px',
                        boxShadow: '0 0 30px rgba(255, 61, 143, 0.6), 0 4px 20px rgba(0,0,0,0.5)',
                      }}
                    />
                  </div>
                )}

                {/* Save confirmation overlay */}
                <AnimatePresence>
                  {showSaveConfirmation && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-xl"
                    >
                      <div className="bg-sm-mint/20 border border-sm-mint/40 rounded-xl px-6 py-4 flex items-center gap-3">
                        <Check className="w-8 h-8 text-sm-mint" />
                        <span className="text-xl font-bold text-white">Saved!</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Cursor Preview */}
                {cursorPos && (
                  <div
                    className="absolute pointer-events-none rounded-full border-2 border-white/60"
                    style={{
                      left: `${(cursorPos.x / 640) * 100}%`,
                      top: `${(cursorPos.y / 360) * 100}%`,
                      width: brushSize[0] * (containerRef.current?.offsetWidth || 640) / 640,
                      height: brushSize[0] * (containerRef.current?.offsetWidth || 640) / 640,
                      transform: "translate(-50%, -50%)",
                      backgroundColor:
                        selectedTool === "eraser"
                          ? "rgba(26, 26, 46, 0.5)"
                          : `${selectedColor}40`,
                    }}
                  />
                )}
              </div>

              {/* Bottom Actions */}
              <div className="flex justify-between items-center">
                <p className="text-xs text-white/40">
                  Keys: 1-6 tools, T text, I image, F fill, S sketchy, Ctrl+Z undo
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    onClick={onClose}
                    className="text-white/70 hover:text-white hover:bg-white/10"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    className="bg-sm-magenta hover:bg-sm-magenta/90 text-white font-semibold shadow-glow"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Save Sketch
                  </Button>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </TooltipProvider>
  );
}
