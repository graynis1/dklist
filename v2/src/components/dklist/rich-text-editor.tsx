"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { BoldIcon, ItalicIcon, Heading2Icon, Heading3Icon, ListIcon, ListOrderedIcon, LinkIcon, ImageIcon, QuoteIcon, EraserIcon } from "lucide-react";
import { looksLikeHtml, plainTextToEditableHtml } from "@/lib/blog-content";

/**
 * Customer's ask (2026-09-09 batch): blog authoring was a plain `<textarea>`
 * with no rich formatting and no working image paste - Word/Google Docs
 * paste either lost images entirely or rendered as literal "<p><strong>..."
 * text (see blog/[slug]/page.tsx's own `looksLikeHtml` comment on the
 * two-formats-in-one-column history). This is a real contentEditable
 * editor rather than a big new dependency (Tiptap/Prosemirror) - matches
 * this codebase's established preference (see the blog renderer's own
 * "no typography plugin, tag-targeted utilities instead" choice) for a
 * lighter fix over a heavier one under time pressure. `document.
 * execCommand` is deprecated in spec but still functional in every real
 * desktop/mobile browser - the pragmatic choice here, not an oversight.
 *
 * Ships its own sync-to-hidden-input so it drops into the existing plain
 * `<form action={serverAction}>` submission this app already uses
 * everywhere else - no client-side fetch/JSON wiring needed for the save
 * itself, only for image upload.
 */
export function RichTextEditor({
  name,
  defaultValue,
  uploadAction,
}: {
  name: string;
  defaultValue?: string;
  uploadAction: (formData: FormData) => Promise<{ status: boolean; url?: string; message?: string }>;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Real customer report (2026-09-09): manually inserting an image via the
  // toolbar button was "çok zor" (very hard) - the native file-picker
  // dialog steals focus for as long as the user takes to pick a file, and
  // by the time control returns, the browser has cleared the contentEditable
  // selection entirely (unlike a synchronous toolbar click with no dialog
  // in between, which browsers tolerate fine). Without this, insertImage
  // landed wherever the browser defaulted to (observed: always the very
  // end), never where the cursor actually was - forcing manual cut/paste
  // to fix placement every time. Saved on mousedown (fires before the
  // button steals focus) and restored right before the actual insert.
  const savedRangeRef = useRef<Range | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  }

  function restoreSelection() {
    editorRef.current?.focus();
    const sel = window.getSelection();
    if (sel && savedRangeRef.current) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
  }

  const syncHidden = useCallback(() => {
    if (hiddenInputRef.current && editorRef.current) {
      hiddenInputRef.current.value = editorRef.current.innerHTML;
    }
  }, []);

  useEffect(() => {
    if (editorRef.current && defaultValue) {
      // Editing an old, pre-editor plain-text post - convert its newlines
      // into real paragraphs first, or contentEditable/innerHTML would
      // collapse the whole thing onto one run-on line (see
      // plainTextToEditableHtml's own doc comment).
      editorRef.current.innerHTML = looksLikeHtml(defaultValue) ? defaultValue : plainTextToEditableHtml(defaultValue);
      syncHidden();
    }
  }, [defaultValue, syncHidden]);

  const uploadFile = useCallback(
    async (file: File): Promise<string | null> => {
      setUploading(true);
      setError(null);
      try {
        const formData = new FormData();
        formData.set("image", file);
        const result = await uploadAction(formData);
        if (!result.status || !result.url) {
          setError(result.message ?? "Resim yüklenemedi.");
          return null;
        }
        return result.url;
      } catch {
        setError("Resim yüklenemedi.");
        return null;
      } finally {
        setUploading(false);
      }
    },
    [uploadAction],
  );

  /** Word/Google Docs paste embeds images as `data:` URIs directly in the
   * pasted HTML - functional to render as-is, but bloats the stored
   * content and every future reader's page weight. Lets the browser's own
   * paste happen first, then swaps each data-URI image for a real
   * uploaded file, matching how every other image on this site is stored.
   *
   * Real customer report (2026-09-09, still happening after the first
   * paste-handling pass): some Word documents' images vanish on paste
   * with no broken-image icon at all, no error - not the same bug as the
   * data:-URI case above, which was already confirmed working (real
   * images uploaded correctly for an earlier post). Root cause: certain
   * Word versions/paste paths put a `file://...` local-path reference in
   * the clipboard's HTML instead of an embedded `data:` image - the
   * browser can't (and for security, won't) read an arbitrary local file
   * path from web content, so it silently renders nothing. There's no way
   * to recover the actual image bytes from a `file://` reference (the
   * browser never grants JS access to it) - this at least turns a
   * silent, confusing disappearance into a visible, actionable message
   * instead of leaving the writer wondering if they did something wrong. */
  const handlePaste = useCallback(() => {
    const editor = editorRef.current;
    // Real, severe regression caught via customer report (2026-09-09):
    // the very first version of this "unreachable image" check scanned
    // EVERY `img` in the whole editor on EVERY paste, not just newly
    // pasted ones - editing an existing post (real, already-uploaded
    // images with relative `/api/blog-image/...` src, not `http(s)`/
    // `data:`) meant ANY subsequent paste anywhere in the document wiped
    // out that post's real, already-working images. Fixed by snapshotting
    // which `<img>` elements already existed BEFORE this paste (captured
    // synchronously here, before the browser's default paste runs) and
    // only ever touching ones that are NOT in that snapshot afterward.
    const preExistingImages = editor ? new Set(editor.querySelectorAll("img")) : new Set<Element>();

    setTimeout(async () => {
      if (!editor) return;
      const newImages = Array.from(editor.querySelectorAll<HTMLImageElement>("img")).filter((img) => !preExistingImages.has(img));

      const dataImages = newImages.filter((img) => img.getAttribute("src")?.startsWith("data:"));
      for (const img of dataImages) {
        try {
          const res = await fetch(img.src);
          const blob = await res.blob();
          const file = new File([blob], "pasted-image.png", { type: blob.type || "image/png" });
          const url = await uploadFile(file);
          if (url) img.src = url;
          else img.remove(); // couldn't upload - drop rather than leave a giant data: URI in the stored content
        } catch {
          img.remove();
        }
      }

      // Real customer report: some Word documents' images vanish on paste
      // with no broken-image icon at all - root cause: certain Word
      // versions/paste paths put a `file://...` local-path reference in
      // the clipboard's HTML instead of an embedded `data:` image, which
      // the browser can't (and for security, won't) read. No way to
      // recover the actual bytes from a `file://` reference - this at
      // least turns a silent disappearance into a visible, actionable
      // message. Only ever applied to images THIS paste just introduced
      // (see preExistingImages above) - never pre-existing content.
      const unreachableImages = newImages.filter((img) => !/^(https?:|data:)/.test(img.getAttribute("src") ?? ""));
      if (unreachableImages.length > 0) {
        setError(
          `Word'den ${unreachableImages.length} resim yapıştırılamadı (Word bu resmi bilgisayarınızdaki bir dosya yolu olarak kopyaladı, tarayıcı bunu okuyamıyor). Lütfen resmi "Resim Ekle" butonuyla tekrar ekleyin.`,
        );
        for (const img of unreachableImages) {
          const note = document.createElement("span");
          note.textContent = "[resim eklenemedi - lütfen \"Resim Ekle\" ile tekrar ekleyin]";
          note.className = "text-destructive text-xs italic";
          img.replaceWith(note);
        }
      }

      syncHidden();
    }, 0);
  }, [syncHidden, uploadFile]);

  function exec(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    syncHidden();
  }

  async function handleFileInsert(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const url = await uploadFile(file);
    if (url) {
      restoreSelection();
      exec("insertImage", url);
    }
  }

  function insertLink() {
    // Same selection-loss risk as the image picker - window.prompt() also
    // steals focus, and createLink needs the ORIGINAL text selection
    // (not just a cursor) to wrap it in a link.
    const url = window.prompt("Bağlantı adresi (https://...)");
    if (url) {
      restoreSelection();
      exec("createLink", url);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-b-0 border-border bg-muted/40 p-1.5">
        <ToolbarButton onClick={() => exec("bold")} title="Kalın">
          <BoldIcon className="size-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("italic")} title="İtalik">
          <ItalicIcon className="size-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("formatBlock", "<h2>")} title="Alt Başlık">
          <Heading2Icon className="size-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("formatBlock", "<h3>")} title="Küçük Alt Başlık">
          <Heading3Icon className="size-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("insertUnorderedList")} title="Madde Listesi">
          <ListIcon className="size-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("insertOrderedList")} title="Numaralı Liste">
          <ListOrderedIcon className="size-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("formatBlock", "<blockquote>")} title="Alıntı">
          <QuoteIcon className="size-4" />
        </ToolbarButton>
        <ToolbarButton onMouseDown={saveSelection} onClick={insertLink} title="Bağlantı Ekle">
          <LinkIcon className="size-4" />
        </ToolbarButton>
        <ToolbarButton onMouseDown={saveSelection} onClick={() => fileInputRef.current?.click()} title="Resim Ekle" disabled={uploading}>
          <ImageIcon className="size-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("removeFormat")} title="Biçimlendirmeyi Temizle">
          <EraserIcon className="size-4" />
        </ToolbarButton>
        {uploading && <span className="ml-1 text-xs text-muted-foreground">Resim yükleniyor...</span>}
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={syncHidden}
        onPaste={handlePaste}
        onBlur={syncHidden}
        className="min-h-64 w-full rounded-b-lg border border-border bg-background p-3 text-sm leading-relaxed outline-none focus:border-ring [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-semibold [&_img]:my-2 [&_img]:max-w-full [&_img]:rounded-md [&_li]:ml-5 [&_li]:list-disc [&_ol_li]:list-decimal"
      />
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileInsert} />
      <input ref={hiddenInputRef} type="hidden" name={name} defaultValue={defaultValue} />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function ToolbarButton({
  onClick,
  onMouseDown,
  title,
  disabled,
  children,
}: {
  onClick: () => void;
  onMouseDown?: () => void;
  title: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button type="button" variant="ghost" size="icon-sm" title={title} disabled={disabled} onMouseDown={onMouseDown} onClick={onClick}>
      {children}
    </Button>
  );
}
