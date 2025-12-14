import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { FrameCard } from "./FrameCard";
import { cn } from "@/lib/utils";

interface RemoteSelection {
  userId: string;
  userName: string;
  color: string;
}

interface Frame {
  id: string;
  position: { x: number; y: number };
  thumbnail?: string;
  isPolished?: boolean;
  isPolishing?: boolean;
  title?: string;
  thumbnailColor?: string;
  durationMs?: number;
  motionNotes?: string;
  // Remote collaboration
  isRemoteMoving?: boolean;
  remoteSelection?: RemoteSelection | null;
}

interface Connection {
  id: string;
  from: string;
  to: string;
}

interface InfiniteCanvasProps {
  frames: Frame[];
  connections: Connection[];
  selectedFrames: string[];
  onFrameSelect: (id: string, multiSelect?: boolean) => void;
  onFrameDelete: (id: string) => void;
  onFrameDuplicate: (id: string) => void;
  onCanvasClick: (position: { x: number; y: number }) => void;
  onFrameDoubleClick?: (id: string) => void;
  onConnectionDelete?: (id: string) => void;
  onFramePositionChange: (id: string, delta: { dx: number; dy: number }) => void;
  onFramePolish?: (id: string) => void;
  activeTool: string;
  zoom: number;
  connectingFromFrameId?: string | null;
  // New props
  beatModeEnabled?: boolean;
  onFrameDurationChange?: (id: string, durationMs: number) => void;
}

export function InfiniteCanvas({
  frames,
  connections,
  selectedFrames,
  onFrameSelect,
  onFrameDelete,
  onFrameDuplicate,
  onCanvasClick,
  onFrameDoubleClick,
  onConnectionDelete,
  onFramePositionChange,
  onFramePolish,
  activeTool,
  zoom,
  connectingFromFrameId,
  beatModeEnabled = false,
  onFrameDurationChange,
}: InfiniteCanvasProps) {
  const [hoveredConnection, setHoveredConnection] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (activeTool === "pan" || e.button === 1) {
        setIsPanning(true);
        setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      }
    },
    [activeTool, pan]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
      }
    },
    [isPanning, startPan]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === canvasRef.current && activeTool === "select") {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left - pan.x) / zoom;
        const y = (e.clientY - rect.top - pan.y) / zoom;
        onCanvasClick({ x, y });
      }
    },
    [activeTool, pan, zoom, onCanvasClick]
  );

  // Smart connection path that routes based on relative frame positions
  const getSmartConnectionPath = (from: Frame, to: Frame) => {
    const frameWidth = 192;
    const frameHeight = 144;

    // Get frame centers
    const fromCenter = {
      x: from.position.x + frameWidth / 2,
      y: from.position.y + frameHeight / 2,
    };
    const toCenter = {
      x: to.position.x + frameWidth / 2,
      y: to.position.y + frameHeight / 2,
    };

    // Determine direction (where is target relative to source?)
    const dx = toCenter.x - fromCenter.x;
    const dy = toCenter.y - fromCenter.y;

    let fromPoint: { x: number; y: number };
    let toPoint: { x: number; y: number };

    // Choose connection points based on relative position
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal connection (target is mostly left or right)
      if (dx > 0) {
        // Target is to the RIGHT - arrow goes right
        fromPoint = { x: from.position.x + frameWidth, y: fromCenter.y };
        toPoint = { x: to.position.x, y: toCenter.y };
      } else {
        // Target is to the LEFT - arrow goes left
        fromPoint = { x: from.position.x, y: fromCenter.y };
        toPoint = { x: to.position.x + frameWidth, y: toCenter.y };
      }
    } else {
      // Vertical connection (target is mostly above or below)
      if (dy > 0) {
        // Target is BELOW - arrow goes down
        fromPoint = { x: fromCenter.x, y: from.position.y + frameHeight };
        toPoint = { x: toCenter.x, y: to.position.y };
      } else {
        // Target is ABOVE - arrow goes up
        fromPoint = { x: fromCenter.x, y: from.position.y };
        toPoint = { x: toCenter.x, y: to.position.y + frameHeight };
      }
    }

    // Calculate bezier control points for smooth curve
    const distance = Math.sqrt(dx * dx + dy * dy);
    const controlOffset = Math.max(distance * 0.35, 50);

    let cp1: { x: number; y: number };
    let cp2: { x: number; y: number };

    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal curve - control points extend horizontally
      cp1 = { x: fromPoint.x + (dx > 0 ? controlOffset : -controlOffset), y: fromPoint.y };
      cp2 = { x: toPoint.x + (dx > 0 ? -controlOffset : controlOffset), y: toPoint.y };
    } else {
      // Vertical curve - control points extend vertically
      cp1 = { x: fromPoint.x, y: fromPoint.y + (dy > 0 ? controlOffset : -controlOffset) };
      cp2 = { x: toPoint.x, y: toPoint.y + (dy > 0 ? -controlOffset : controlOffset) };
    }

    return {
      path: `M ${fromPoint.x} ${fromPoint.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${toPoint.x} ${toPoint.y}`,
      midpoint: {
        x: (fromPoint.x + toPoint.x) / 2,
        y: (fromPoint.y + toPoint.y) / 2,
      },
    };
  };

  // Calculate sequence numbers for connections based on graph traversal
  const calculateSequenceNumbers = (conns: Connection[], frms: Frame[]): Map<string, number> => {
    const sequenceMap = new Map<string, number>();
    if (conns.length === 0) return sequenceMap;

    // Find all frame IDs that are targets (have incoming arrows)
    const toIds = new Set(conns.map((c) => c.to));
    
    // Find root frames: frames that are sources but NOT targets (start of chains)
    const rootConnections = conns.filter((c) => !toIds.has(c.from));
    
    const visited = new Set<string>();
    let sequence = 1;

    // Process each chain starting from root connections
    const processChain = (startFromId: string) => {
      let currentFromId = startFromId;
      
      while (currentFromId) {
        const conn = conns.find(
          (c) => c.from === currentFromId && !visited.has(c.id)
        );
        
        if (!conn) break;
        
        sequenceMap.set(conn.id, sequence);
        visited.add(conn.id);
        sequence++;
        currentFromId = conn.to;
      }
    };

    // Start from each root
    rootConnections.forEach((conn) => {
      if (!visited.has(conn.id)) {
        processChain(conn.from);
      }
    });

    // Handle any remaining connections (disconnected or cycles)
    conns.forEach((conn) => {
      if (!visited.has(conn.id)) {
        sequenceMap.set(conn.id, sequence);
        sequence++;
      }
    });

    return sequenceMap;
  };

  const sequenceMap = calculateSequenceNumbers(connections, frames);

  return (
    <div
      ref={canvasRef}
      className={cn(
        "absolute inset-0 overflow-hidden canvas-grid",
        isPanning ? "cursor-grabbing" : activeTool === "pan" ? "cursor-grab" : "cursor-default"
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleCanvasClick}
    >
      <motion.div
        className="absolute"
        style={{
          x: pan.x,
          y: pan.y,
          scale: zoom,
          transformOrigin: "0 0",
        }}
      >
        {/* Connection Lines */}
        <svg className="absolute inset-0 w-[5000px] h-[5000px]" style={{ pointerEvents: 'none' }}>
          <defs>
            {/* Clean white arrowhead */}
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="8"
              refX="9"
              refY="4"
              orient="auto"
            >
              <path 
                d="M 0 0 L 10 4 L 0 8 L 2 4 Z" 
                fill="rgba(255, 255, 255, 0.8)"
              />
            </marker>
            <marker
              id="arrowheadHover"
              markerWidth="12"
              markerHeight="10"
              refX="10"
              refY="5"
              orient="auto"
            >
              <path 
                d="M 0 0 L 12 5 L 0 10 L 2.5 5 Z" 
                fill="rgba(255, 255, 255, 1)"
              />
            </marker>
            {/* Subtle glow for visibility */}
            <filter id="connectionGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur"/>
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          {connections.map((connection) => {
            const fromFrame = frames.find((f) => f.id === connection.from);
            const toFrame = frames.find((f) => f.id === connection.to);
            if (!fromFrame || !toFrame) return null;

            const { path, midpoint } = getSmartConnectionPath(fromFrame, toFrame);
            const isHovered = hoveredConnection === connection.id;
            const sequenceNumber = sequenceMap.get(connection.id) || 1;

            // Position label slightly above the curve
            const labelX = midpoint.x;
            const labelY = midpoint.y - 18;

            return (
              <g key={connection.id}>
                {/* Invisible wider path for easier clicking */}
                <path
                  d={path}
                  stroke="transparent"
                  strokeWidth="24"
                  fill="none"
                  style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredConnection(connection.id)}
                  onMouseLeave={() => setHoveredConnection(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onConnectionDelete?.(connection.id);
                  }}
                />
                
                {/* Background glow line (solid, subtle) */}
                <path
                  d={path}
                  stroke={isHovered ? "rgba(255, 255, 255, 0.3)" : "rgba(255, 255, 255, 0.15)"}
                  strokeWidth={isHovered ? 6 : 4}
                  fill="none"
                  strokeLinecap="round"
                  filter="url(#connectionGlow)"
                  style={{ pointerEvents: 'none' }}
                />
                
                {/* Main dashed line */}
                <path
                  d={path}
                  stroke={isHovered ? "rgba(255, 255, 255, 0.95)" : "rgba(255, 255, 255, 0.7)"}
                  strokeWidth={isHovered ? 3 : 2.5}
                  strokeDasharray={isHovered ? "12 6" : "8 6"}
                  fill="none"
                  markerEnd={isHovered ? "url(#arrowheadHover)" : "url(#arrowhead)"}
                  strokeLinecap="round"
                  style={{
                    pointerEvents: 'none',
                    transition: 'stroke 0.15s ease, stroke-width 0.15s ease',
                  }}
                />
                
                {/* Sequence number badge - cleaner circle style */}
                <g
                  transform={`translate(${labelX}, ${labelY})`}
                  style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredConnection(connection.id)}
                  onMouseLeave={() => setHoveredConnection(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onConnectionDelete?.(connection.id);
                  }}
                >
                  {/* Circle background */}
                  <circle
                    r={12}
                    fill={isHovered ? "rgba(255, 255, 255, 0.95)" : "rgba(30, 30, 40, 0.9)"}
                    stroke={isHovered ? "rgba(255, 255, 255, 1)" : "rgba(255, 255, 255, 0.6)"}
                    strokeWidth={2}
                    style={{
                      transition: 'fill 0.15s ease, stroke 0.15s ease',
                    }}
                  />
                  {/* Number */}
                  <text
                    x={0}
                    y={0}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={isHovered ? "#1a1a2e" : "white"}
                    fontSize="11"
                    fontWeight="700"
                    fontFamily="system-ui, -apple-system, sans-serif"
                    style={{ pointerEvents: 'none' }}
                  >
                    {sequenceNumber}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>

        {/* Frame Cards */}
        {frames.map((frame, index) => (
          <FrameCard
            key={frame.id}
            id={frame.id}
            index={index}
            title={frame.title}
            thumbnail={frame.thumbnail}
            thumbnailColor={frame.thumbnailColor}
            isSelected={selectedFrames.includes(frame.id)}
            isConnecting={connectingFromFrameId === frame.id}
            isPolished={frame.isPolished}
            isPolishing={frame.isPolishing}
            onClick={() => onFrameSelect(frame.id)}
            onDoubleClick={() => onFrameDoubleClick?.(frame.id)}
            onDelete={() => onFrameDelete(frame.id)}
            onDuplicate={() => onFrameDuplicate(frame.id)}
            onPolish={() => onFramePolish?.(frame.id)}
            position={frame.position}
            zoom={zoom}
            onPositionChange={(delta) =>
              onFramePositionChange(frame.id, delta)
            }
            beatModeEnabled={beatModeEnabled}
            durationMs={frame.durationMs}
            onDurationChange={(newDuration) => onFrameDurationChange?.(frame.id, newDuration)}
            motionNotes={frame.motionNotes}
            // Remote collaboration
            isRemoteMoving={frame.isRemoteMoving}
            remoteSelection={frame.remoteSelection}
          />
        ))}
      </motion.div>
    </div>
  );
}
