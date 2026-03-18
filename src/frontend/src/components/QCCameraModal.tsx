import { useCamera } from "@/camera/useCamera";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, CameraOff, Check, Loader2, RotateCcw, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

interface QCCameraModalProps {
  open: boolean;
  rowIndex: number;
  onConfirm: (data: {
    defectType: string;
    noOfDefects: string;
    actionTaken: string;
    photoDataUrl?: string;
    photoTimestamp?: number;
  }) => void;
  onClose: () => void;
}

export function QCCameraModal({
  open,
  rowIndex,
  onConfirm,
  onClose,
}: QCCameraModalProps) {
  const camera = useCamera({ facingMode: "environment", quality: 0.85 });
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [defectType, setDefectType] = useState("");
  const [noOfDefects, setNoOfDefects] = useState("");
  const [actionTaken, setActionTaken] = useState("");

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    if (open) {
      camera.startCamera();
    } else {
      camera.stopCamera();
      setCapturedDataUrl(null);
      setDefectType("");
      setNoOfDefects("");
      setActionTaken("");
    }
  }, [open]);

  const handleCapture = useCallback(async () => {
    const file = await camera.capturePhoto();
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setCapturedDataUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, [camera]);

  const handleConfirm = useCallback(() => {
    onConfirm({
      defectType,
      noOfDefects,
      actionTaken,
      photoDataUrl: capturedDataUrl ?? undefined,
      photoTimestamp: capturedDataUrl ? Date.now() : undefined,
    });
  }, [defectType, noOfDefects, actionTaken, capturedDataUrl, onConfirm]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-background/95 flex flex-col"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      data-ocid="camera.modal"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="font-semibold text-sm">
          Row {rowIndex + 1} — Camera
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          data-ocid="camera.close_button"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Camera / Preview */}
      <div className="flex-1 relative overflow-hidden bg-black">
        <AnimatePresence mode="wait">
          {capturedDataUrl ? (
            <motion.img
              key="preview"
              src={capturedDataUrl}
              alt="Captured"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 w-full h-full object-contain"
            />
          ) : (
            <motion.div
              key="live"
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <video
                ref={camera.videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <canvas ref={camera.canvasRef} className="hidden" />
              {camera.error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center p-4">
                  <CameraOff className="w-10 h-10 text-destructive" />
                  <p className="text-sm text-destructive">
                    {camera.error.message}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => camera.retry()}
                    data-ocid="camera.retry_button"
                  >
                    Retry
                  </Button>
                </div>
              )}
              {camera.isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Capture button or retake */}
      <div className="px-4 py-3 flex items-center justify-center gap-3 border-t border-border">
        {capturedDataUrl ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCapturedDataUrl(null)}
            data-ocid="camera.retake_button"
          >
            <RotateCcw className="w-4 h-4 mr-1" /> Retake
          </Button>
        ) : (
          <Button
            size="lg"
            className="rounded-full w-16 h-16 p-0"
            onClick={handleCapture}
            disabled={!camera.isActive || camera.isLoading}
            data-ocid="camera.capture_button"
          >
            <Camera className="w-6 h-6" />
          </Button>
        )}
      </div>

      {/* Optional fields */}
      <div className="px-4 pb-4 space-y-2 border-t border-border pt-3">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">
          Optional — auto-fill row data
        </p>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs">Defect</Label>
            <Input
              value={defectType}
              onChange={(e) => setDefectType(e.target.value)}
              placeholder="Type..."
              className="text-xs h-8"
              data-ocid="camera.defect_input"
            />
          </div>
          <div>
            <Label className="text-xs">No. of Defects</Label>
            <Input
              type="number"
              min={0}
              value={noOfDefects}
              onChange={(e) => setNoOfDefects(e.target.value)}
              placeholder="0"
              className="text-xs h-8"
              data-ocid="camera.defect_count_input"
            />
          </div>
          <div>
            <Label className="text-xs">Action</Label>
            <Input
              value={actionTaken}
              onChange={(e) => setActionTaken(e.target.value)}
              placeholder="Action..."
              className="text-xs h-8"
              data-ocid="camera.action_input"
            />
          </div>
        </div>
        <Button
          className="w-full mt-2"
          onClick={handleConfirm}
          data-ocid="camera.confirm_button"
        >
          <Check className="w-4 h-4 mr-2" /> Confirm & Apply
        </Button>
      </div>
    </div>
  );
}
