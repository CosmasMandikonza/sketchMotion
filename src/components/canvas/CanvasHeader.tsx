import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, Cloud, Pencil } from "lucide-react";

interface CanvasHeaderProps {
  boardName: string;
  onBoardNameChange: (name: string) => void;
  collaborators: number;
  isSaving: boolean;
}

export function CanvasHeader({
  boardName,
  onBoardNameChange,
  collaborators,
  isSaving,
}: CanvasHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(boardName);

  const handleSave = () => {
    onBoardNameChange(tempName);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setTempName(boardName);
      setIsEditing(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {/* Board Name - Inline Edit */}
      {isEditing ? (
        <div className="flex items-center gap-2">
          <Input
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="h-8 w-64 bg-white/10 border-white/20 text-white"
            autoFocus
          />
          <Button
            size="sm"
            onClick={handleSave}
            className="h-8 bg-sm-magenta hover:bg-sm-magenta/90"
          >
            <Check className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <button
          onClick={() => {
            setTempName(boardName);
            setIsEditing(true);
          }}
          className="flex items-center gap-2 text-white font-semibold hover:text-white/80 transition-colors group"
        >
          {boardName}
          <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
        </button>
      )}

      {/* Save Status */}
      <div className="flex items-center gap-1.5 text-white/50 text-sm">
        {isSaving ? (
          <>
            <Cloud className="w-4 h-4 animate-pulse" />
            <span>Saving...</span>
          </>
        ) : (
          <>
            <Check className="w-4 h-4 text-sm-mint" />
            <span>Saved</span>
          </>
        )}
      </div>

      {/* Collaborators indicator */}
      {collaborators > 1 && (
        <div className="flex -space-x-2 ml-2">
          {Array.from({ length: Math.min(collaborators, 3) }).map((_, i) => (
            <div
              key={i}
              className="w-6 h-6 rounded-full border-2 border-white/20 bg-gradient-to-br from-sm-pink to-sm-purple"
            />
          ))}
          {collaborators > 3 && (
            <div className="w-6 h-6 rounded-full border-2 border-white/20 bg-white/20 flex items-center justify-center text-xs text-white">
              +{collaborators - 3}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
