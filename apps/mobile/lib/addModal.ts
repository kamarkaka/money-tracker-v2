import { createContext, useContext } from "react";
import type { Transaction } from "@money-tracker/shared";

interface ModalContextValue {
  // Is any transaction modal open (add or edit)?
  isModalOpen: boolean;
  // Open add modal
  openAdd: () => void;
  // Open edit modal with a transaction
  openEdit: (tx: Transaction) => void;
  // Close whatever is open
  closeModal: () => void;
  // Toggle: if something is open, close it; otherwise open add
  toggle: () => void;
  // Current edit transaction (null = add mode)
  editTransaction: Transaction | null;
  // Callback after save/delete
  onComplete?: () => void;
  setOnComplete: (cb: (() => void) | undefined) => void;
}

export const ModalContext = createContext<ModalContextValue>({
  isModalOpen: false,
  openAdd: () => {},
  openEdit: () => {},
  closeModal: () => {},
  toggle: () => {},
  editTransaction: null,
  setOnComplete: () => {},
});

export function useTransactionModal() {
  return useContext(ModalContext);
}

// Keep backward compat
export const AddModalContext = ModalContext;
export function useAddModal() {
  const ctx = useContext(ModalContext);
  return { open: ctx.isModalOpen, setOpen: (v: boolean) => v ? ctx.openAdd() : ctx.closeModal() };
}
