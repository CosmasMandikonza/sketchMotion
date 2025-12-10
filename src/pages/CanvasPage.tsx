import { useState, useCallback, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { GradientBackground } from "@/components/layout/GradientBackground";
import { CanvasHeader } from "@/components/canvas/CanvasHeader";
import { CanvasToolbar } from "@/components/canvas/CanvasToolbar";
import { AIPanel } from "@/components/canvas/AIPanel";
import { InfiniteCanvas } from "@/components/canvas/InfiniteCanvas";
import { Minimap } from "@/components/canvas/Minimap";
import { OnboardingOverlay } from "@/components/canvas/OnboardingOverlay";
import { ConfettiCelebration } from "@/components/canvas/ConfettiCelebration";
import { FrameSketchEditor } from "@/components/canvas/FrameSketchEditor";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useToast } from "@/components/ui/use-toast";
import { GlassCard } from "@/components/layout/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Sparkles, 
  MousePointer, 
  Plus,
  ArrowLeft,
  Wand2,
  Film,
  Loader2,
  Check,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";

// Frame status type
type FrameStatus = "sketch" | "polished";

// Canvas Frame interface with all properties
interface CanvasFrame {
  id: string;
  title: string;
  x: number;
  y: number;
  status: FrameStatus;
  sketchDataUrl?: string;
  polishedDataUrl?: string;
  durationMs: number;
  createdAt: number;
  // Legacy properties for compatibility
  description?: string;
  thumbnailColor?: string;
  isPolishing?: boolean;
}

interface Frame {
  id: string;
  title: string;
  description?: string;
  position: { x: number; y: number };
  thumbnail?: string;
  thumbnailColor?: string;
  status: FrameStatus;
  isPolishing?: boolean;
  sketchDataUrl?: string;
  polishedDataUrl?: string;
  durationMs?: number;
  createdAt?: number;
}

interface Connection {
  id: string;
  from: string;
  to: string;
}

interface CanvasConnection {
  id: string;
  fromFrameId: string;
  toFrameId: string;
}

// Generate a simple unique ID
const generateId = () => Math.random().toString(36).substring(2, 15);

// Demo storyboard data
const demoFrames: Frame[] = [
  {
    id: "demo-1",
    title: "Intro",
    description: "Opening scene with logo animation and brand reveal",
    position: { x: 100, y: 150 },
    thumbnailColor: "from-sm-pink/40 to-sm-coral/40",
    status: "sketch",
  },
  {
    id: "demo-2",
    title: "Product Close-up",
    description: "Detailed view of the product with key features highlighted",
    position: { x: 350, y: 100 },
    thumbnailColor: "from-sm-purple/40 to-sm-soft-purple/40",
    status: "sketch",
  },
  {
    id: "demo-3",
    title: "Feature Highlight",
    description: "Animated demonstration of the main feature in action",
    position: { x: 600, y: 150 },
    thumbnailColor: "from-sm-magenta/40 to-sm-pink/40",
    status: "sketch",
  },
  {
    id: "demo-4",
    title: "Social Proof",
    description: "Customer testimonials and trust indicators",
    position: { x: 475, y: 300 },
    thumbnailColor: "from-sm-mint/40 to-sm-soft-purple/40",
    status: "sketch",
  },
  {
    id: "demo-5",
    title: "Call to Action",
    description: "Final CTA with compelling offer and urgency",
    position: { x: 750, y: 250 },
    thumbnailColor: "from-sm-coral/40 to-sm-magenta/40",
    status: "sketch",
  },
];

const demoConnections: Connection[] = [
  { id: "demo-conn-1", from: "demo-1", to: "demo-2" },
  { id: "demo-conn-2", from: "demo-2", to: "demo-3" },
  { id: "demo-conn-3", from: "demo-3", to: "demo-4" },
  { id: "demo-conn-4", from: "demo-4", to: "demo-5" },
];

// Board name storage key
const getBoardStorageKey = (id: string) => `sketchmotion_board_${id}`;

export function CanvasPage() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Board state
  const [boardName, setBoardName] = useState("Untitled Board");
  const [isSaving, setIsSaving] = useState(false);
  
  // Canvas state
  const [activeTool, setActiveTool] = useState("select");
  const [zoom, setZoom] = useState(1);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedFrames, setSelectedFrames] = useState<string[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Frame editor state
  const [editingFrame, setEditingFrame] = useState<Frame | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Connection mode state
  const [connectingFromFrameId, setConnectingFromFrameId] = useState<string | null>(null);
  
  // Sketch editor state
  const [isSketchEditorOpen, setIsSketchEditorOpen] = useState(false);
  const [sketchEditorFrameId, setSketchEditorFrameId] = useState<string | null>(null);
  
  // AI workflow state
  const [isPolishing, setIsPolishing] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [showAnimationModal, setShowAnimationModal] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Load board data on mount
  useEffect(() => {
    if (boardId) {
      const stored = localStorage.getItem(getBoardStorageKey(boardId));
      if (stored) {
        try {
          const data = JSON.parse(stored);
          setBoardName(data.name || "Untitled Board");
          setFrames(data.frames || []);
          setConnections(data.connections || []);
        } catch {
          // New board
          if (boardId.startsWith("board-")) {
            setBoardName("Untitled Board");
            setFrames([]);
            setConnections([]);
            setShowOnboarding(true);
          }
        }
      } else if (boardId === "new" || boardId.startsWith("board-")) {
        setShowOnboarding(true);
        setBoardName("Untitled Board");
        setFrames([]);
        setConnections([]);
      } else {
        // Load demo data for existing board IDs
        setBoardName("Product Launch Animation");
        setFrames(demoFrames.map(f => ({ ...f, status: "sketch" as FrameStatus })));
        setConnections(demoConnections);
      }
    }
  }, [boardId]);

  // Save board data when it changes
  useEffect(() => {
    if (boardId && frames.length > 0) {
      const data = { name: boardName, frames, connections };
      localStorage.setItem(getBoardStorageKey(boardId), JSON.stringify(data));
    }
  }, [boardId, boardName, frames, connections]);

  const handleBoardNameChange = useCallback((name: string) => {
    setBoardName(name);
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 1000);
  }, []);

  const handleToolChange = useCallback((tool: string) => {
    setActiveTool(tool);
    // Clear connection state when switching away from connector tool
    if (tool !== "connector") {
      setConnectingFromFrameId(null);
    }
  }, []);

  // Delete a connection
  const handleConnectionDelete = useCallback((connectionId: string) => {
    setConnections(prev => prev.filter(c => c.id !== connectionId));
    toast({
      title: "Connection Removed",
      description: "The connection has been deleted",
    });
  }, [toast]);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.1, 2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.1, 0.25));
  }, []);

  const handleUndo = useCallback(() => {
    toast({ title: "Undo", description: "Action undone" });
  }, [toast]);

  const handleRedo = useCallback(() => {
    toast({ title: "Redo", description: "Action redone" });
  }, [toast]);

  const handleFrameSelect = useCallback((id: string, multiSelect?: boolean) => {
    // Handle connector tool mode
    if (activeTool === "connector") {
      if (!connectingFromFrameId) {
        // First click - set the "from" frame
        setConnectingFromFrameId(id);
        setSelectedFrames([id]);
        toast({
          title: "Connection Started",
          description: "Click another frame to complete the connection",
        });
      } else if (connectingFromFrameId !== id) {
        // Second click - create the connection
        const existingConnection = connections.find(
          c => (c.from === connectingFromFrameId && c.to === id) ||
               (c.from === id && c.to === connectingFromFrameId)
        );

        if (!existingConnection) {
          const newConnection: Connection = {
            id: generateId(),
            from: connectingFromFrameId,
            to: id,
          };
          setConnections(prev => [...prev, newConnection]);
          toast({
            title: "Frames Connected!",
            description: `Connection ${connections.length + 1} created`,
          });
        } else {
          toast({
            title: "Already Connected",
            description: "These frames are already connected",
          });
        }
        setConnectingFromFrameId(null);
        setSelectedFrames([]);
      } else {
        // Clicked the same frame - cancel connection
        setConnectingFromFrameId(null);
        setSelectedFrames([]);
        toast({
          title: "Connection Cancelled",
          description: "Click two different frames to connect them",
        });
      }
      return;
    }

    // Normal selection behavior
    setSelectedFrames((prev) => {
      if (multiSelect) {
        return prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id];
      }
      return prev.includes(id) && prev.length === 1 ? [] : [id];
    });
  }, [activeTool, connectingFromFrameId, connections, toast]);

  const handleFrameDelete = useCallback((id: string) => {
    setFrames((prev) => prev.filter((f) => f.id !== id));
    setConnections((prev) => prev.filter((c) => c.from !== id && c.to !== id));
    setSelectedFrames((prev) => prev.filter((f) => f !== id));
  }, []);

  const handleFramePositionChange = useCallback((id: string, { dx, dy }: { dx: number; dy: number }) => {
    setFrames((prev) =>
      prev.map((f) =>
        f.id === id
          ? {
              ...f,
              position: {
                x: f.position.x + dx,
                y: f.position.y + dy,
              },
            }
          : f
      )
    );
  }, []);

  const handleFrameDuplicate = useCallback((id: string) => {
    const frame = frames.find((f) => f.id === id);
    if (frame) {
      const newFrame: Frame = {
        ...frame,
        id: generateId(),
        title: `${frame.title} (Copy)`,
        position: {
          x: frame.position.x + 50,
          y: frame.position.y + 50,
        },
      };
      setFrames((prev) => [...prev, newFrame]);
    }
  }, [frames]);

  const handleCanvasClick = useCallback((position: { x: number; y: number }) => {
    const frameCount = frames.length;
    const newFrame: Frame = {
      id: generateId(),
      title: `Frame ${frameCount + 1}`,
      position,
      status: "sketch",
      thumbnailColor: [
        "from-sm-pink/40 to-sm-coral/40",
        "from-sm-purple/40 to-sm-soft-purple/40",
        "from-sm-magenta/40 to-sm-pink/40",
        "from-sm-mint/40 to-sm-soft-purple/40",
      ][frameCount % 4],
    };
    setFrames((prev) => [...prev, newFrame]);
    setSelectedFrames([newFrame.id]);
    toast({
      title: "Frame Created",
      description: `${newFrame.title} added to canvas`,
    });
  }, [frames.length, toast]);

  // Handle frame double-click to open sketch editor
  const handleFrameDoubleClick = useCallback((id: string) => {
    const frame = frames.find(f => f.id === id);
    if (frame) {
      // Open sketch editor instead of text editor
      setSketchEditorFrameId(id);
      setIsSketchEditorOpen(true);
    }
  }, [frames]);

  // Handle saving sketch from editor
  const handleSaveSketch = useCallback((dataUrl: string) => {
    if (sketchEditorFrameId) {
      setFrames(prev => prev.map(f => 
        f.id === sketchEditorFrameId 
          ? { ...f, sketchDataUrl: dataUrl, thumbnail: dataUrl }
          : f
      ));
      toast({ title: "Sketch Saved", description: "Your sketch has been saved to the frame" });
    }
    setIsSketchEditorOpen(false);
    setSketchEditorFrameId(null);
  }, [sketchEditorFrameId, toast]);

  // Get frame for sketch editor
  const sketchEditorFrame = useMemo(() => {
    if (!sketchEditorFrameId) return null;
    const frame = frames.find(f => f.id === sketchEditorFrameId);
    if (!frame) return null;
    return {
      id: frame.id,
      title: frame.title,
      sketchDataUrl: frame.sketchDataUrl,
    };
  }, [sketchEditorFrameId, frames]);

  // Save frame edits
  const handleSaveFrameEdit = useCallback(() => {
    if (editingFrame) {
      setFrames(prev => prev.map(f => 
        f.id === editingFrame.id 
          ? { ...f, title: editTitle, description: editDescription }
          : f
      ));
      setEditingFrame(null);
      toast({ title: "Frame Updated", description: "Changes saved" });
    }
  }, [editingFrame, editTitle, editDescription, toast]);

  // Load demo storyboard
  const handleLoadDemo = useCallback(() => {
    setFrames(demoFrames.map(f => ({ ...f, status: "sketch" as FrameStatus })));
    setConnections(demoConnections);
    setBoardName("Product Launch Animation");
    setSelectedFrames([]);
    toast({
      title: "Demo Loaded!",
      description: "A complete storyboard is ready for you to explore",
    });
  }, [toast]);

  // AI Polish handler
  const handlePolish = useCallback(() => {
    if (selectedFrames.length === 0) {
      toast({ title: "No frames selected", description: "Select frames to polish" });
      return;
    }

    setIsPolishing(true);
    
    // Add pulsing glow to selected frames
    setFrames(prev => prev.map(f => 
      selectedFrames.includes(f.id) ? { ...f, isPolishing: true } : f
    ));

    // Simulate AI processing
    setTimeout(() => {
      setFrames(prev => prev.map(f => 
        selectedFrames.includes(f.id) 
          ? { ...f, status: "polished" as FrameStatus, isPolishing: false }
          : f
      ));
      setIsPolishing(false);
      toast({
        title: "AI Polish Complete!",
        description: `${selectedFrames.length} frames polished – art style aligned`,
      });
    }, 1800);
  }, [selectedFrames, toast]);

  // AI Animate handler
  const handleAnimate = useCallback(() => {
    const polishedFrames = frames.filter(f => selectedFrames.includes(f.id) && f.status === "polished");
    if (polishedFrames.length === 0) {
      toast({ title: "No polished frames", description: "Polish frames first before animating" });
      return;
    }

    setShowAnimationModal(true);
    setIsAnimating(true);
    setAnimationProgress(0);
    setAnimationComplete(false);

    // Simulate animation generation
    const interval = setInterval(() => {
      setAnimationProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsAnimating(false);
          setAnimationComplete(true);
          setShowConfetti(true);
          return 100;
        }
        return prev + 3;
      });
    }, 100);
  }, [frames, selectedFrames, toast]);

  const handleMinimapNavigate = useCallback((position: { x: number; y: number }) => {
    console.log("Navigate to:", position);
  }, []);

  // Check if there are polished frames
  const hasPolishedFrames = useMemo(() => 
    frames.some(f => f.status === "polished"),
  [frames]);

  // Keyboard shortcuts
  const shortcuts = useMemo(
    () => [
      { key: "v", action: () => handleToolChange("select") },
      { key: "p", action: () => handleToolChange("pencil") },
      { key: "r", action: () => handleToolChange("rectangle") },
      { key: "o", action: () => handleToolChange("ellipse") },
      { key: "t", action: () => handleToolChange("text") },
      { key: "i", action: () => handleToolChange("image") },
      { key: "c", action: () => handleToolChange("connector") },
      { key: " ", action: () => handleToolChange("pan") },
      { key: "z", ctrl: true, action: handleUndo },
      { key: "z", ctrl: true, shift: true, action: handleRedo },
      { key: "=", ctrl: true, action: handleZoomIn },
      { key: "-", ctrl: true, action: handleZoomOut },
      { key: "n", ctrl: true, action: () => handleCanvasClick({ x: 200 + Math.random() * 400, y: 150 + Math.random() * 200 }) },
      {
        key: "Delete",
        action: () => {
          selectedFrames.forEach((id) => handleFrameDelete(id));
        },
      },
      {
        key: "Backspace",
        action: () => {
          selectedFrames.forEach((id) => handleFrameDelete(id));
        },
      },
    ],
    [handleToolChange, handleUndo, handleRedo, handleZoomIn, handleZoomOut, selectedFrames, handleFrameDelete, handleCanvasClick]
  );

  useKeyboardShortcuts(shortcuts);

  return (
    <GradientBackground animated={false} className="bg-sm-charcoal">
      {/* Confetti Celebration */}
      <ConfettiCelebration 
        isActive={showConfetti} 
        onComplete={() => setShowConfetti(false)} 
      />

      {/* Header with Back Button */}
      <header className="fixed top-0 left-0 right-0 z-50 px-4 py-3">
        <GlassCard className="max-w-full mx-auto px-4 py-2 flex items-center justify-between">
          {/* Left Section */}
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm hidden sm:inline">Dashboard</span>
            </Link>

            <div className="h-6 w-px bg-white/20" />

            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sm-magenta to-sm-purple flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            </Link>

            <div className="h-6 w-px bg-white/20" />

            {/* Board Name - Inline Edit */}
            <CanvasHeader
              boardName={boardName}
              onBoardNameChange={handleBoardNameChange}
              collaborators={3}
              isSaving={isSaving}
            />
          </div>

          {/* Right Section - Demo Button */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handleLoadDemo}
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/10 hover:text-white"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Load Demo Storyboard
            </Button>
          </div>
        </GlassCard>
      </header>

      {/* Left Toolbar */}
      <CanvasToolbar
        activeTool={activeTool}
        onToolChange={handleToolChange}
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      {/* Main Canvas */}
      <div className="fixed inset-0 pt-16">
        <InfiniteCanvas
          frames={frames.map(f => ({
            id: f.id,
            position: f.position,
            thumbnail: f.sketchDataUrl || f.thumbnail,
            isPolished: f.status === "polished",
            isPolishing: f.isPolishing,
            title: f.title,
            thumbnailColor: f.thumbnailColor,
          }))}
          connections={connections}
          selectedFrames={selectedFrames}
          onFrameSelect={handleFrameSelect}
          onFrameDelete={handleFrameDelete}
          onFrameDuplicate={handleFrameDuplicate}
          onCanvasClick={handleCanvasClick}
          onFrameDoubleClick={handleFrameDoubleClick}
          onConnectionDelete={handleConnectionDelete}
          onFramePositionChange={handleFramePositionChange}
          activeTool={activeTool}
          zoom={zoom}
          connectingFromFrameId={connectingFromFrameId}
        />

        {/* Empty State Hint */}
        <AnimatePresence>
          {frames.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <GlassCard className="p-8 text-center max-w-md pointer-events-auto">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sm-magenta/20 to-sm-purple/20 flex items-center justify-center mx-auto mb-4">
                  <MousePointer className="w-8 h-8 text-white/60" />
                </div>
                <h3 className="font-display font-bold text-xl text-white mb-2">
                  Click anywhere to add your first frame
                </h3>
                <p className="text-white/60 mb-4">
                  Or load a demo storyboard to see the full workflow in action
                </p>
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={() => handleCanvasClick({ x: 200, y: 150 })}
                    className="bg-sm-magenta hover:bg-sm-magenta/90 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Frame
                  </Button>
                  <Button
                    onClick={handleLoadDemo}
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Load Demo
                  </Button>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right Panel - AI Workflow */}
      <AIPanel
        selectedFrames={selectedFrames}
        frames={frames}
        onPolish={handlePolish}
        onAnimate={handleAnimate}
        isPolishing={isPolishing}
        hasPolishedFrames={hasPolishedFrames}
      />

      {/* Frame Editor Panel */}
      <AnimatePresence>
        {editingFrame && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed right-[340px] top-20 bottom-4 w-80 z-40"
          >
            <GlassCard className="h-full p-4 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-lg text-white">Edit Frame</h3>
                <button
                  onClick={() => setEditingFrame(null)}
                  className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>

              <div className="space-y-4 flex-1">
                <div>
                  <label className="text-sm text-white/60 block mb-1">Title</label>
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="bg-white/10 border-white/20 text-white"
                    placeholder="Frame title..."
                  />
                </div>

                <div>
                  <label className="text-sm text-white/60 block mb-1">What happens in this frame?</label>
                  <Textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="bg-white/10 border-white/20 text-white min-h-[120px]"
                    placeholder="Describe the scene, action, or content..."
                  />
                </div>

                <div className="pt-4">
                  <Button
                    onClick={handleSaveFrameEdit}
                    className="w-full bg-sm-magenta hover:bg-sm-magenta/90 text-white"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animation Generation Modal */}
      <AnimatePresence>
        {showAnimationModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center pb-8 px-4"
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => animationComplete && setShowAnimationModal(false)} />
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="relative w-full max-w-lg"
            >
              <GlassCard className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    animationComplete 
                      ? "bg-sm-mint/20" 
                      : "bg-gradient-to-br from-sm-magenta to-sm-pink"
                  )}>
                    {isAnimating ? (
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    ) : (
                      <Film className="w-6 h-6 text-sm-mint" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg text-white">
                      {animationComplete ? "Animation Ready!" : "Generating Animation..."}
                    </h3>
                    <p className="text-sm text-white/60">
                      {animationComplete 
                        ? "Your video is ready to export" 
                        : "This may take a few moments"}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                {!animationComplete && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-white/60">Progress</span>
                      <span className="text-white font-mono">{animationProgress}%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-sm-magenta to-sm-pink"
                        initial={{ width: 0 }}
                        animate={{ width: `${animationProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Preview Thumbnail */}
                <div className={cn(
                  "aspect-video rounded-lg overflow-hidden mb-4 relative",
                  animationComplete ? "bg-sm-charcoal" : "bg-white/5"
                )}>
                  {animationComplete ? (
                    <div className="absolute inset-0 bg-gradient-to-br from-sm-pink/20 to-sm-purple/20 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <Film className="w-8 h-8 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-sm-magenta animate-spin" />
                    </div>
                  )}
                </div>

                {/* Actions */}
                {animationComplete && (
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 border-white/20 text-white hover:bg-white/10"
                      onClick={() => setShowAnimationModal(false)}
                    >
                      Close
                    </Button>
                    <Button
                      className="flex-1 bg-sm-magenta hover:bg-sm-magenta/90 text-white"
                      onClick={() => navigate(`/export/${boardId}`)}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View in Export & Share
                    </Button>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Minimap */}
      <Minimap
        frames={frames.map(f => ({ id: f.id, position: f.position, isPolished: f.status === "polished" }))}
        viewportPosition={{ x: 0, y: 0 }}
        viewportSize={{ width: window.innerWidth, height: window.innerHeight }}
        canvasSize={{ width: 5000, height: 3000 }}
        onNavigate={handleMinimapNavigate}
      />

      {/* Onboarding Overlay */}
      <OnboardingOverlay
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />

      {/* Sketch Editor Modal */}
      <FrameSketchEditor
        frame={sketchEditorFrame}
        open={isSketchEditorOpen}
        onClose={() => {
          setIsSketchEditorOpen(false);
          setSketchEditorFrameId(null);
        }}
        onSave={handleSaveSketch}
      />

      {/* Keyboard Shortcuts Hint */}
      <div className="fixed bottom-4 left-20 z-30">
        <GlassCard className="px-3 py-2 text-xs text-white/50">
          <span className="font-mono">V</span> Select • 
          <span className="font-mono ml-2">C</span> Connect • 
          <span className="font-mono ml-2">Space</span> Pan • 
          <span className="font-mono ml-2">Ctrl+N</span> New Frame
        </GlassCard>
      </div>
    </GradientBackground>
  );
}
