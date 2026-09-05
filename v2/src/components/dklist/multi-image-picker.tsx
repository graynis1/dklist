"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { XIcon, PlusIcon } from "lucide-react";

/**
 * Real customer report (2026-09-05): a plain native `<input type="file"
 * multiple>` can't be revised incrementally - picking files again always
 * REPLACES the browser's whole selection, so adding one more photo after
 * already choosing two, or removing a single wrong one, meant starting
 * over from scratch ("3 eklendi yanlış resim çıkarmak istense revize etme
 * şansı yok"). This keeps its own File[] in React state instead of
 * relying on the native input's FileList: opening the picker again
 * APPENDS to that state, and each thumbnail gets its own remove button.
 *
 * The native input itself stays hidden with no `name` attribute (it's
 * never what actually submits) - `hiddenInputName` is rendered as a
 * separate set of real `<input type="file">` elements is NOT how this
 * works either, since File objects held in JS state can't be assigned
 * back into a native input's FileList. Instead the parent form's submit
 * handler must read `files` (via the `onChange` callback below) and
 * `formData.append(name, file)` for each one itself - see
 * CreateStoreForm's submit() for the actual wiring.
 */
export function MultiImagePicker({
  onChange,
  required,
  label = "Fotoğraflar",
}: {
  onChange: (files: File[]) => void;
  required?: boolean;
  label?: string;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Computed directly from `files` during render (not a setState-in-effect
  // cascade) - the effect below only handles the one genuinely external
  // side effect, revoking each blob URL once it's no longer needed.
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => {
    return () => previews.forEach((u) => URL.revokeObjectURL(u));
  }, [previews]);

  function addFiles(newFiles: FileList | null) {
    if (!newFiles || newFiles.length === 0) return;
    const next = [...files, ...Array.from(newFiles)];
    setFiles(next);
    onChange(next);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeAt(index: number) {
    const next = files.filter((_, i) => i !== index);
    setFiles(next);
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm text-muted-foreground">
        {label} {required && files.length === 0 && "(en az 1)"}
      </label>
      <div className="flex flex-wrap gap-2">
        {previews.map((src, i) => (
          <div key={i} className="group relative size-20 overflow-hidden rounded-lg border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="size-full object-cover" />
            <button
              type="button"
              onClick={() => removeAt(i)}
              aria-label="Kaldır"
              className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <XIcon className="size-3" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex size-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-foreground/30 hover:text-foreground"
        >
          <PlusIcon className="size-4" />
          Ekle
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />
      <p className="text-xs text-muted-foreground/70">
        Herhangi bir resim formatı kabul edilir, yüklerken otomatik olarak optimize edilir.
      </p>
    </div>
  );
}
