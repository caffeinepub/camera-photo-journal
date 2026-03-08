import { Button } from "@/components/ui/button";
import { type Photo, deletePhoto, getAllPhotos } from "@/db";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { Camera, ChevronLeft, ChevronRight, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// ─── Thumbnail ────────────────────────────────────────────────────────────────

interface ThumbProps {
  photo: Photo;
  index: number;
  onOpen: (photo: Photo) => void;
}

function PhotoThumbnail({ photo, index, onOpen }: ThumbProps) {
  const [src, setSrc] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(photo.blob);
    urlRef.current = url;
    setSrc(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [photo.blob]);

  const marker = `gallery.item.${index + 1}` as const;

  return (
    <motion.button
      data-ocid={marker}
      onClick={() => onOpen(photo)}
      className="gallery-thumb relative aspect-square overflow-hidden rounded-sm bg-card cursor-pointer group"
      style={{ animationDelay: `${(index % 9) * 40}ms` }}
      whileTap={{ scale: 0.96 }}
      aria-label={`Open photo${photo.name ? `: ${photo.name}` : ""}`}
    >
      {src && (
        <img
          src={src}
          alt={photo.name || `Photo taken ${photo.dateGroup}`}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      )}
      {/* Date-time stamp on hover */}
      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end px-1.5 pb-1.5">
        <span className="text-white text-[10px] leading-none truncate">
          {format(new Date(photo.dateTaken), "HH:mm")}
        </span>
      </div>
    </motion.button>
  );
}

// ─── Full-Screen Viewer ───────────────────────────────────────────────────────

interface ViewerProps {
  photo: Photo;
  onClose: () => void;
  onDelete: (id: string) => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

function PhotoViewer({
  photo,
  onClose,
  onDelete,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: ViewerProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(photo.blob);
    urlRef.current = url;
    setSrc(url);
    setConfirmDelete(false);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [photo.blob]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev && onPrev) onPrev();
      if (e.key === "ArrowRight" && hasNext && onNext) onNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setIsDeleting(true);
    try {
      await deletePhoto(photo.id);
      onDelete(photo.id);
      toast.success("Photo deleted");
    } catch {
      toast.error("Failed to delete photo");
      setIsDeleting(false);
    }
  }, [confirmDelete, photo.id, onDelete]);

  return (
    <motion.div
      data-ocid="viewer.dialog"
      className="viewer-overlay fixed inset-0 z-50 flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 safe-top">
        <button
          type="button"
          data-ocid="viewer.close_button"
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          aria-label="Close viewer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex-1 mx-3 text-center">
          {photo.name ? (
            <p className="font-display text-white text-base leading-tight truncate">
              {photo.name}
            </p>
          ) : null}
          <p className="text-white/50 text-xs">
            {format(new Date(photo.dateTaken), "MMM d, yyyy · HH:mm")}
          </p>
        </div>

        <button
          type="button"
          data-ocid="viewer.delete_button"
          onClick={handleDelete}
          disabled={isDeleting}
          className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
            confirmDelete
              ? "bg-destructive text-white"
              : "bg-white/10 hover:bg-destructive/80 text-white/70 hover:text-white"
          }`}
          aria-label={confirmDelete ? "Confirm delete" : "Delete photo"}
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Confirm delete hint */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            className="mx-auto px-4 py-1.5 rounded-full text-xs text-white/70 bg-white/10"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
          >
            Tap the trash icon again to confirm deletion
            <button
              type="button"
              data-ocid="viewer.confirm_button"
              className="sr-only"
              onClick={handleDelete}
            >
              Confirm delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Photo */}
      <div className="flex-1 flex items-center justify-center relative px-2">
        {src && (
          <motion.img
            key={photo.id}
            src={src}
            alt={photo.name || "Photo"}
            className="max-w-full max-h-full object-contain rounded-sm"
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.25 }}
          />
        )}

        {/* Prev / Next navigation */}
        {hasPrev && (
          <button
            type="button"
            onClick={onPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
            aria-label="Previous photo"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {hasNext && (
          <button
            type="button"
            onClick={onNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
            aria-label="Next photo"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Spacer for bottom nav */}
      <div style={{ height: "var(--nav-height)" }} />
    </motion.div>
  );
}

// ─── Gallery Page ─────────────────────────────────────────────────────────────

interface DateGroup {
  label: string;
  photos: Photo[];
}

export default function GalleryPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewerPhoto, setViewerPhoto] = useState<Photo | null>(null);

  // Load photos
  const loadPhotos = useCallback(async () => {
    try {
      const all = await getAllPhotos();
      setPhotos(all);
    } catch {
      toast.error("Failed to load photos");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  // Group by date
  const groups: DateGroup[] = photos.reduce<DateGroup[]>((acc, photo) => {
    const existing = acc.find((g) => g.label === photo.dateGroup);
    if (existing) {
      existing.photos.push(photo);
    } else {
      acc.push({ label: photo.dateGroup, photos: [photo] });
    }
    return acc;
  }, []);

  // Flat list for prev/next navigation
  const flatPhotos = photos; // already sorted newest-first

  const viewerIndex = viewerPhoto
    ? flatPhotos.findIndex((p) => p.id === viewerPhoto.id)
    : -1;

  const handleDelete = useCallback((id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    setViewerPhoto(null);
  }, []);

  const handlePrev = useCallback(() => {
    if (viewerIndex > 0) setViewerPhoto(flatPhotos[viewerIndex - 1]);
  }, [viewerIndex, flatPhotos]);

  const handleNext = useCallback(() => {
    if (viewerIndex < flatPhotos.length - 1)
      setViewerPhoto(flatPhotos[viewerIndex + 1]);
  }, [viewerIndex, flatPhotos]);

  // Global thumbnail index for deterministic markers
  let thumbIndex = 0;

  return (
    <>
      <main className="flex flex-col min-h-screen pb-[calc(var(--nav-height)+1rem)]">
        {/* Header */}
        <header className="sticky top-0 z-10 px-4 pt-safe-top pt-4 pb-3 bg-background/95 backdrop-blur-sm border-b border-border">
          <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">
            Journal
          </h1>
          <p className="text-sm text-muted-foreground">
            {photos.length === 0
              ? "No photos yet"
              : `${photos.length} photo${photos.length !== 1 ? "s" : ""}`}
          </p>
        </header>

        {/* Content */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="grid grid-cols-3 gap-1 w-48 opacity-30">
              {Array.from({ length: 9 }, (_, i) => `skeleton-${i}`).map(
                (id, i) => (
                  <div
                    key={id}
                    className="aspect-square rounded-sm bg-muted animate-pulse"
                    style={{ animationDelay: `${i * 60}ms` }}
                  />
                ),
              )}
            </div>
          </div>
        ) : photos.length === 0 ? (
          <div
            data-ocid="gallery.empty_state"
            className="flex-1 flex flex-col items-center justify-center gap-6 px-8 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-card flex items-center justify-center border border-border">
              <Camera className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-display text-xl font-semibold text-foreground mb-1">
                No photos yet
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Head to the camera to take your first photo.
              </p>
            </div>
            <Link to="/new-report">
              <Button
                data-ocid="gallery.primary_button"
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Camera className="w-4 h-4" />
                New Report
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-6 pt-4">
            {groups.map((group) => (
              <section key={group.label}>
                {/* Date header */}
                <div className="px-4 pb-2">
                  <h2 className="font-display text-sm font-semibold text-primary tracking-wide uppercase">
                    {group.label}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {group.photos.length} photo
                    {group.photos.length !== 1 ? "s" : ""}
                  </p>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-3 gap-px bg-border">
                  {group.photos.map((photo) => {
                    const idx = thumbIndex++;
                    return (
                      <PhotoThumbnail
                        key={photo.id}
                        photo={photo}
                        index={idx}
                        onOpen={setViewerPhoto}
                      />
                    );
                  })}
                </div>
              </section>
            ))}

            {/* Footer */}
            <footer className="px-4 py-6 text-center">
              <p className="text-xs text-muted-foreground">
                © {new Date().getFullYear()}.{" "}
                <a
                  href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  Built with ♥ using caffeine.ai
                </a>
              </p>
            </footer>
          </div>
        )}
      </main>

      {/* Full-screen viewer */}
      <AnimatePresence>
        {viewerPhoto && (
          <PhotoViewer
            key={viewerPhoto.id}
            photo={viewerPhoto}
            onClose={() => setViewerPhoto(null)}
            onDelete={handleDelete}
            onPrev={handlePrev}
            onNext={handleNext}
            hasPrev={viewerIndex > 0}
            hasNext={viewerIndex < flatPhotos.length - 1}
          />
        )}
      </AnimatePresence>
    </>
  );
}
