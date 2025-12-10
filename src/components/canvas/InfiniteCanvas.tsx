import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { FrameCard } from "./FrameCard";
import { cn } from "@/lib/utils";

interface Frame {
  id: string;
  position: { x: number; y: number };
  thumbnail?: string;
  isPolished?: boolean;
  isPolishing?: boolean;
  title?: string;
  thumbnailColor?: string;
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
  activeTool: string;
  zoom: number;
  connectingFromFrameId?: string | null;
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
  activeTool,
  zoom,
  connectingFromFrameId,
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
            <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FF6B9D" />
              <stop offset="100%" stopColor="#C471ED" />
            </linearGradient>
            <linearGradient id="connectionGradientHover" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FF3D8F" />
              <stop offset="100%" stopColor="#A78BFA" />
            </linearGradient>
            <marker
              id="arrowhead"
              markerWidth="12"
              markerHeight="9"
              refX="10"
              refY="4.5"
              orient="auto"
            >
              <polygon points="0 0, 12 4.5, 0 9" fill="#C471ED" />
            </marker>
            <marker
              id="arrowheadHover"
              markerWidth="12"
              markerHeight="9"
              refX="10"
              refY="4.5"
              orient="auto"
            >
              <polygon points="0 0, 12 4.5, 0 9" fill="#FF3D8F" />
            </marker>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <filter id="glowStrong" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
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
                  strokeWidth="20"
                  fill="none"
                  style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredConnection(connection.id)}
                  onMouseLeave={() => setHoveredConnection(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onConnectionDelete?.(connection.id);
                  }}
                />
                {/* Visible path */}
                <path
                  d={path}
                  stroke={isHovered ? "url(#connectionGradientHover)" : "url(#connectionGradient)"}
                  strokeWidth={isHovered ? 4 : 3}
                  fill="none"
                  markerEnd={isHovered ? "url(#arrowheadHover)" : "url(#arrowhead)"}
                  filter={isHovered ? "url(#glowStrong)" : "url(#glow)"}
                  strokeLinecap="round"
                  style={{
                    pointerEvents: 'none',
                    transition: 'stroke 0.16s ease, stroke-width 0.16s ease, filter 0.16s ease',
                  }}
                />
                {/* Sequence number badge */}
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
                  {/* Pill background */}
                  <rect
                    x={-14}
                    y={-9}
                    width={28}
                    height={18}
                    rx={999}
                    ry={999}
                    fill={isHovered ? "rgba(255,61,143,0.95)" : "rgba(15,23,42,0.90)"}
                    stroke={isHovered ? "#FF9BD5" : "rgba(248,250,252,0.6)"}
                    strokeWidth={1.5}
                    style={{
                      transition: 'fill 0.16s ease, stroke 0.16s ease',
                    }}
                  />
                  {/* Number */}
                  <text
                    x={0}
                    y={0}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="white"
                    fontSize="10"
                    fontWeight="600"
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
            position={frame.position}
            zoom={zoom}
            onPositionChange={(delta) =>
              onFramePositionChange(frame.id, delta)
            }
          />
        ))}
      </motion.div>
    </div>
  );
}
