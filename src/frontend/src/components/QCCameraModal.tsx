import { useCamera } from "@/camera/useCamera";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Camera,
  CameraOff,
  Check,
  Loader2,
  RefreshCw,
  RotateCcw,
  X,
} from "lucide-react";
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
  }) => void;
  onClose: () => void;
}

export function QCCameraModal({
  open,
  rowIndex,
  onConfirm,
  onClose,
}: QCCameraModalProps) {
  const camera = useCamera({ facingMode: "environment", quality: 0.8 });
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [defectType, setDefectType] = useState("");
  const [noOfDefects, setNoOfDefects] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const urlRef = useRef<string | null>(null);

  // Start camera when modal opens
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    if (open) {
      camera.startCamera();
    } else {
      camera.stopCamera();
      // reset state
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
      setCapturedUrl(null);
      setDefectType("");
      setNoOfDefects("");
      setActionTaken("");
    }
  }, [open]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
      }
    };
  }, []);

  const handleCapture = useCallback(async () => {
    const file = await camera.capturePhoto();
    if (!file) return;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const url = URL.createObjectURL(file);
    urlRef.current = url;
    setCapturedUrl(url);
    await camera.stopCamera();
  }, [camera]);

  const handleRetake = useCallback(async () => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setCapturedUrl(null);
    await camera.startCamera();
  }, [camera]);

  const handleConfirm = useCallback(() => {
    onConfirm({
      defectType,
      noOfDefects,
      actionTaken,
      photoDataUrl: capturedUrl ?? undefined,
    });
  }, [defectType, noOfDefects, actionTaken, capturedUrl, onConfirm]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="qc-camera-modal"
        className="fixed inset-0 z-50 flex flex-col bg-black"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 bg-black/80">
          <button
            type="button"
            data-ocid="camera.cancel_button"
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label="Close camera"
          >
            <X className="w-5 h-5" />
          </button>
          <p className="text-white font-display text-sm font-semibold">
            Row {rowIndex + 1} — Photo Assist
          </p>
          <div className="w-10" />
        </div>

        {/* Viewfinder */}
        <div className="flex-1 relative overflow-hidden bg-black">
          {!capturedUrl && (
            <>
              <video
                ref={camera.videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                  display:
                    camera.isActive && !camera.isLoading ? "block" : "none",
                }}
              />
              <canvas ref={camera.canvasRef} className="hidden" />

              {camera.isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              )}

              {!camera.isLoading && camera.error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
                  <CameraOff className="w-10 h-10 text-white/40" />
                  <p className="text-white/70 text-sm">
                    {camera.error.message}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => camera.retry()}
                    className="gap-2 border-white/20 text-white hover:bg-white/10"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retry
                  </Button>
                </div>
              )}

              {!camera.isLoading &&
                !camera.error &&
                camera.isSupported === false && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
                    <Camera className="w-10 h-10 text-white/40" />
                    <p className="text-white/70 text-sm">
                      Camera not available. You can still fill the fields
                      manually.
                    </p>
                  </div>
                )}
            </>
          )}

          {capturedUrl && (
            <img
              src={capturedUrl}
              alt="Captured for QC row"
              className="absolute inset-0 w-full h-full object-contain"
            />
          )}
        </div>

        {/* Controls */}
        <div className="bg-zinc-950 px-4 pt-4 pb-6 space-y-4">
          {!capturedUrl ? (
            /* Capture button */
            <div className="flex justify-center">
              <button
                type="button"
                data-ocid="camera.capture_button"
                onClick={handleCapture}
                disabled={!camera.isActive || camera.isLoading}
                className="relative w-16 h-16 rounded-full disabled:opacity-30 transition-transform active:scale-90"
                aria-label="Capture photo"
              >
                <span className="absolute inset-0 rounded-full border-4 border-white/80" />
                <span className="absolute inset-2 rounded-full bg-white" />
              </button>
            </div>
          ) : (
            /* After capture — fill fields */
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground text-center">
                Photo captured. Fill in the details (optional):
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Defect Type
                  </Label>
                  <Input
                    value={defectType}
                    onChange={(e) => setDefectType(e.target.value)}
                    placeholder="e.g. Stitch skip"
                    className="bg-zinc-900 border-zinc-700 text-white text-sm h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    No. of Defects
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={noOfDefects}
                    onChange={(e) => setNoOfDefects(e.target.value)}
                    placeholder="0"
                    className="bg-zinc-900 border-zinc-700 text-white text-sm h-9"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Action Taken
                </Label>
                <Input
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value)}
                  placeholder="e.g. Repaired and re-inspected"
                  className="bg-zinc-900 border-zinc-700 text-white text-sm h-9"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <Button
                  variant="outline"
                  onClick={handleRetake}
                  className="flex-1 gap-2 border-zinc-700 text-white/80 hover:bg-zinc-800"
                >
                  <RotateCcw className="w-4 h-4" />
                  Retake
                </Button>
                <Button
                  data-ocid="camera.confirm_button"
                  onClick={handleConfirm}
                  className="flex-1 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Check className="w-4 h-4" />
                  Confirm
                </Button>
              </div>
            </div>
          )}

          {!capturedUrl && (
            <p className="text-center text-xs text-zinc-600">
              No camera? You can close and edit cells directly.
            </p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
