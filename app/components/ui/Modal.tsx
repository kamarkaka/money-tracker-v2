"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/app/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className={cn(
        "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0 w-[90vw] max-h-[90vh] rounded-lg border border-card-border bg-card-bg p-0 shadow-xl backdrop:bg-black/50",
        "md:w-auto",
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-card-border px-4 py-3 md:px-6 md:py-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2>
        <button
          onClick={onClose}
          className="cursor-pointer rounded-md p-2 text-zinc-400 hover:bg-accent-subtle hover:text-accent"
        >
          &#x2715;
        </button>
      </div>
      <div className="overflow-y-auto px-4 py-4 md:px-6" style={{ maxHeight: "calc(90vh - 60px)" }}>{children}</div>
    </dialog>
  );
}
