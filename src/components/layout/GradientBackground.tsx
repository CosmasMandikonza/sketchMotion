import { cn } from "@/lib/utils";

interface GradientBackgroundProps {
  children: React.ReactNode;
  className?: string;
  animated?: boolean;
}

export function GradientBackground({ 
  children, 
  className,
  animated = true 
}: GradientBackgroundProps) {
  return (
    <div 
      className={cn(
        "min-h-screen w-full relative",
        className
      )}
    >
      {/* Fixed radial gradient background */}
      <div 
        className={cn(
          "fixed inset-0 z-0",
          animated && "animate-breathing-gradient"
        )}
        style={{
          background: `
            radial-gradient(
              ellipse 120% 80% at 50% 100%,
              #0066FF 0%,
              #FF6BD5 35%,
              #FF8A33 60%,
              transparent 80%
            ),
            #050608
          `,
        }}
      />
      
      {/* Noise texture overlay */}
      <div className="fixed inset-0 z-[1] opacity-[0.03] pointer-events-none bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E')]" />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
