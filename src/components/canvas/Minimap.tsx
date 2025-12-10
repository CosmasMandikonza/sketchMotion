import { GlassCard } from "@/components/layout/GlassCard";
import { cn } from "@/lib/utils";

interface MinimapProps {
  frames: Array<{ id: string; position: { x: number; y: number }; isPolished?: boolean }>;
  viewportPosition: { x: number; y: number };
  viewportSize: { width: number; height: number };
  canvasSize: { width: number; height: number };
  onNavigate: (position: { x: number; y: number }) => void;
}

export function Minimap({
  frames,
  viewportPosition,
  viewportSize,
  canvasSize,
  onNavigate,
}: MinimapProps) {
  const scale = 0.05;
  const minimapWidth = canvasSize.width * scale;
  const minimapHeight = canvasSize.height * scale;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale - viewportSize.width / 2;
    const y = (e.clientY - rect.top) / scale - viewportSize.height / 2;
    onNavigate({ x, y });
  };

  return (
    <GlassCard className="fixed bottom-4 right-4 p-2 z-40">
      <div
        className="relative bg-sm-charcoal/30 rounded-lg cursor-pointer"
        style={{ width: minimapWidth, height: minimapHeight }}
        onClick={handleClick}
      >
        {/* Frame indicators */}
        {frames.map((frame) => (
          <div
            key={frame.id}
            className={cn(
              "absolute w-2 h-1.5 rounded-sm",
              frame.isPolished ? "bg-sm-mint/80" : "bg-white/60"
            )}
            style={{
              left: frame.position.x * scale,
              top: frame.position.y * scale,
            }}
          />
        ))}

        {/* Viewport indicator */}
        <div
          className="absolute border-2 border-sm-magenta/60 rounded-sm bg-sm-magenta/10"
          style={{
            left: viewportPosition.x * scale,
            top: viewportPosition.y * scale,
            width: viewportSize.width * scale,
            height: viewportSize.height * scale,
          }}
        />
      </div>
    </GlassCard>
  );
}
