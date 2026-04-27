import { useRef } from "react";
import { Button } from "@/components/ui/button";

const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.82;
const MAX_BYTES = 1.2 * 1024 * 1024;

async function fileToCompressedDataUrl(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.readAsDataURL(file);
  });

  if (file.size <= 80 * 1024 && file.type !== "image/png") return dataUrl;

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Image decode failed"));
    i.src = dataUrl;
  });

  let { width, height } = img;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const scale = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  let out = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  if (out.length > MAX_BYTES) {
    out = canvas.toDataURL("image/jpeg", 0.6);
  }
  return out;
}

interface Props {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  small?: boolean;
}

export default function ImagePicker({ label, value, onChange, small }: Props) {
  const ref = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file.");
      return;
    }
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      onChange(dataUrl);
    } catch (err) {
      alert(`Failed to load image: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      {value ? (
        <div className="flex items-center gap-2">
          <img
            src={value}
            alt={label}
            className={
              small
                ? "h-10 w-10 object-cover rounded border border-slate-300"
                : "h-16 w-16 object-cover rounded border border-slate-300"
            }
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => ref.current?.click()}
            className="h-7 text-xs"
          >
            Replace
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(null)}
            className="h-7 text-xs text-red-600 hover:text-red-700"
          >
            Remove
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => ref.current?.click()}
          className="h-7 text-xs"
        >
          + {label}
        </Button>
      )}
    </div>
  );
}
