import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { cn, IconButton } from './primitives';

/** Diálogo modal accesible sobre <dialog> nativo (foco atrapado y Esc gratis). */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 'max-w-lg'
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cn(
        'pop m-auto w-[calc(100%-2rem)] rounded-xl border border-rule bg-sheet p-0 text-ink shadow-[0_24px_60px_-12px_rgba(24,34,47,0.35)] backdrop:bg-ink/35 backdrop:backdrop-blur-[2px]',
        width
      )}
    >
      {open && (
        <div className="flex max-h-[85vh] flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-rule-soft px-5 pt-4 pb-3">
            <div>
              <h2 className="lettering text-[17px] font-semibold">{title}</h2>
              {description && <p className="mt-0.5 text-[13px] text-graphite">{description}</p>}
            </div>
            <IconButton label="Cerrar" size="sm" onClick={onClose}>
              <X className="size-4" />
            </IconButton>
          </header>
          <div className="scroll-thin overflow-y-auto px-5 py-4">{children}</div>
          {footer && (
            <footer className="flex justify-end gap-2 border-t border-rule-soft px-5 py-3">{footer}</footer>
          )}
        </div>
      )}
    </dialog>
  );
}
