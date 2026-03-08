import { useCamera } from "@/camera/useCamera";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { savePhoto } from "@/db";
import { format } from "date-fns";
import {
  CameraOff,
  Check,
  Loader2,
  RefreshCw,
  SwitchCamera,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CapturedState {
  blob: Blob;
  objectUrl: string;
}

// ─── Camera Page ──────────────────────────────────────────────────────────────

export default function CameraPage() {
  const camera = useCamera({ facingMode: "environment", quality: 0.88 });
  const [captured, setCaptured] = useState<CapturedState | null>(null);
  const [photoName, setPhotoName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  // Start camera on mount
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally run only on isSupported change
  useEffect(() => {
    if (camera.isSupported !== false) {
      camera.startCamera();
    }
    return () => {
      camera.stopCamera();
    };
  }, [camera.isSupported]);

  // Clean up blob URLs on unmount or when captured changes
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  // ── Capture ────────────────────────────────────────────────────────────────

  const handleCapture = useCallback(async () => {
    const file = await camera.capturePhoto();
    if (!file) return;

    // Revoke any previous URL
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setCaptured({ blob: file, objectUrl: url });
    setPhotoName("");
  }, [camera]);

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!captured) return;
    setIsSaving(true);
    try {
      const now = Date.now();
      await savePhoto({
        id: now.toString(),
        name: photoName.trim(),
        blob: captured.blob,
        dateTaken: now,
        dateGroup: format(new Date(now), "MMMM d, yyyy"),
      });
      toast.success("Photo saved!");
      handleDiscard();
    } catch {
      toast.error("Failed to save photo");
    } finally {
      setIsSaving(false);
    }
  }, [captured, photoName]);

  // ── Discard ────────────────────────────────────────────────────────────────

  const handleDiscard = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setCaptured(null);
    setPhotoName("");
  }, []);

  // ── Render states ──────────────────────────────────────────────────────────

  const renderCameraContent = () => {
    if (camera.isSupported === false) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground px-8 text-center">
          <CameraOff className="w-12 h-12 opacity-40" />
          <p className="font-display text-lg">Camera not supported</p>
          <p className="text-sm opacity-60">
            Your browser or device doesn't support camera access.
          </p>
        </div>
      );
    }

    if (camera.error) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
          <CameraOff className="w-12 h-12 text-destructive opacity-70" />
          <p className="font-display text-lg text-foreground">
            {camera.error.type === "permission"
              ? "Camera access denied"
              : camera.error.message}
          </p>
          <p className="text-sm text-muted-foreground">
            {camera.error.type === "permission"
              ? "Allow camera access in your browser settings."
              : "Something went wrong with the camera."}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => camera.retry()}
            className="mt-2 gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </Button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="camera-page">
      {/* ── Viewfinder ─────────────────────────────────────────────────── */}
      <div className="relative flex-1 overflow-hidden bg-black">
        {/* Video element — always rendered so the ref is available */}
        <video
          ref={camera.videoRef}
          autoPlay
          playsInline
          muted
          data-ocid="camera.canvas_target"
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            display: camera.isActive && !camera.isLoading ? "block" : "none",
            transform:
              camera.currentFacingMode === "user" ? "scaleX(-1)" : "none",
          }}
        />

        {/* Hidden canvas for capture */}
        <canvas ref={camera.canvasRef} className="hidden" />

        {/* Loading spinner */}
        {camera.isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}

        {/* Error / unsupported states */}
        {!camera.isLoading && renderCameraContent()}

        {/* Viewfinder corners overlay */}
        {camera.isActive && !camera.isLoading && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Top-left corner */}
            <div className="absolute top-6 left-6 w-8 h-8 border-t-2 border-l-2 border-white/30 rounded-tl-sm" />
            {/* Top-right corner */}
            <div className="absolute top-6 right-6 w-8 h-8 border-t-2 border-r-2 border-white/30 rounded-tr-sm" />
            {/* Bottom-left corner */}
            <div className="absolute bottom-6 left-6 w-8 h-8 border-b-2 border-l-2 border-white/30 rounded-bl-sm" />
            {/* Bottom-right corner */}
            <div className="absolute bottom-6 right-6 w-8 h-8 border-b-2 border-r-2 border-white/30 rounded-br-sm" />
          </div>
        )}
      </div>

      {/* ── Controls bar ────────────────────────────────────────────────── */}
      <div
        className="relative flex items-center justify-between px-8 bg-black safe-bottom"
        style={{ height: "calc(var(--nav-height) + 5rem)" }}
      >
        {/* Camera flip */}
        <button
          type="button"
          data-ocid="camera.toggle"
          onClick={() => camera.switchCamera()}
          disabled={camera.isLoading || !camera.isActive}
          className="w-12 h-12 flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"
          aria-label="Switch camera"
        >
          <SwitchCamera className="w-6 h-6" />
        </button>

        {/* Shutter button */}
        <button
          type="button"
          data-ocid="camera.primary_button"
          onClick={handleCapture}
          disabled={!camera.isActive || camera.isLoading}
          className="shutter-btn relative w-20 h-20 rounded-full disabled:opacity-30 transition-transform duration-100 active:scale-90"
          aria-label="Take photo"
        >
          {/* Outer ring */}
          <span className="absolute inset-0 rounded-full border-4 border-white/80" />
          {/* Inner circle */}
          <span className="absolute inset-2 rounded-full bg-white" />
        </button>

        {/* Spacer to balance layout */}
        <div className="w-12 h-12" />
      </div>

      {/* ── Post-capture overlay ─────────────────────────────────────────── */}
      <AnimatePresence>
        {captured && (
          <motion.div
            key="capture-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="absolute inset-0 capture-overlay flex flex-col"
            style={{ background: "oklch(0.04 0 0 / 0.92)" }}
          >
            {/* Preview image */}
            <motion.div
              className="flex-1 overflow-hidden"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              <img
                src={captured.objectUrl}
                alt="Preview of captured frame"
                className="w-full h-full object-contain"
              />
            </motion.div>

            {/* Name input + actions */}
            <motion.div
              className="px-6 pt-4 pb-6 safe-bottom flex flex-col gap-4 bg-black/60"
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Input
                data-ocid="capture.input"
                value={photoName}
                onChange={(e) => setPhotoName(e.target.value)}
                placeholder="Name this photo (optional)"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-primary focus-visible:ring-primary/30 text-base"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                }}
                autoFocus
              />

              <div className="flex gap-3">
                <Button
                  data-ocid="capture.cancel_button"
                  variant="outline"
                  onClick={handleDiscard}
                  className="flex-1 border-white/20 text-white/80 hover:bg-white/10 hover:text-white gap-2"
                >
                  <X className="w-4 h-4" />
                  Discard
                </Button>
                <Button
                  data-ocid="capture.save_button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {isSaving ? "Saving…" : "Save"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
