import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Upload, X, Star, GripVertical, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { uploadImage } from "@/lib/upload";
import { cn } from "@/lib/utils";

export type UploadedImage = { id?: string; url: string; alt_text?: string | null };

interface ImageUploaderProps {
  bucket: "products" | "banners" | "categories" | "brands" | "avatars";
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  max?: number;
  single?: boolean;
  pathPrefix?: string;
}

function SortableItem({
  image,
  index,
  onRemove,
  onSetCover,
}: {
  image: UploadedImage;
  index: number;
  onRemove: () => void;
  onSetCover: () => void;
}) {
  const key = image.id ?? image.url;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: key });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative aspect-square overflow-hidden rounded-xl border border-border/60 bg-card"
    >
      <img src={image.url} alt="" className="h-full w-full object-cover" />
      {index === 0 && (
        <span className="absolute left-2 top-2 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gold-foreground">
          Capa
        </span>
      )}
      <div className="absolute inset-0 flex items-end justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="rounded-md bg-black/50 p-1.5 text-white backdrop-blur"
          aria-label="Reordenar"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <div className="flex gap-1">
          {index !== 0 && (
            <button
              type="button"
              onClick={onSetCover}
              className="rounded-md bg-black/50 p-1.5 text-white backdrop-blur"
              aria-label="Definir como capa"
            >
              <Star className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onRemove}
            className="rounded-md bg-destructive/80 p-1.5 text-white backdrop-blur"
            aria-label="Remover"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function ImageUploader({
  bucket,
  images,
  onChange,
  max = 8,
  single,
  pathPrefix,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length) return;
    const arr = Array.from(files);
    const room = single ? 1 : Math.max(0, max - images.length);
    const toUpload = arr.slice(0, room);
    if (!toUpload.length) return;
    setUploading(true);
    try {
      const uploaded: UploadedImage[] = [];
      for (const file of toUpload) {
        const { url } = await uploadImage(bucket, file, pathPrefix);
        uploaded.push({ url });
      }
      onChange(single ? uploaded : [...images, ...uploaded]);
      toast.success(`${uploaded.length} imagem(ns) enviada(s)`);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao enviar imagem");
    } finally {
      setUploading(false);
    }
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = images.map((i) => i.id ?? i.url);
    const oldIdx = ids.indexOf(active.id as string);
    const newIdx = ids.indexOf(over.id as string);
    onChange(arrayMove(images, oldIdx, newIdx));
  }

  const items = images.map((i) => i.id ?? i.url);

  return (
    <div className="space-y-3">
      {!single && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {images.map((img, idx) => (
                <SortableItem
                  key={img.id ?? img.url}
                  image={img}
                  index={idx}
                  onRemove={() => onChange(images.filter((_, i) => i !== idx))}
                  onSetCover={() => {
                    const next = [...images];
                    const [item] = next.splice(idx, 1);
                    next.unshift(item);
                    onChange(next);
                  }}
                />
              ))}
              {images.length < max && (
                <UploadTile uploading={uploading} onFiles={handleFiles} multiple />
              )}
            </div>
          </SortableContext>
        </DndContext>
      )}
      {single && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images[0] && (
            <div className="group relative aspect-square overflow-hidden rounded-xl border border-border/60 bg-card">
              <img src={images[0].url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onChange([])}
                className="absolute right-2 top-2 rounded-md bg-destructive/80 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Remover"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {!images[0] && <UploadTile uploading={uploading} onFiles={handleFiles} />}
        </div>
      )}
    </div>
  );
}

function UploadTile({
  uploading,
  onFiles,
  multiple,
}: {
  uploading: boolean;
  onFiles: (f: FileList | null) => void;
  multiple?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/40 text-center text-xs text-muted-foreground transition-colors hover:border-gold hover:bg-card",
        uploading && "pointer-events-none opacity-60",
      )}
    >
      {uploading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <>
          <Upload className="h-5 w-5" />
          <span>Enviar</span>
        </>
      )}
      <input
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />
    </label>
  );
}
