import { createContext, useContext } from "react";
import type { Transaction } from "@money-tracker/shared";

interface ModalContextValue {
  isModalOpen: boolean;
  openAdd: () => void;
  openEdit: (tx: Transaction) => void;
  openDuplicate: (tx: Transaction) => void;
  closeModal: () => void;
  toggle: () => void;
  editTransaction: Transaction | null;
  duplicateTransaction: Transaction | null;
  onComplete?: () => void;
  setOnComplete: (cb: (() => void) | undefined) => void;
}

export const ModalContext = createContext<ModalContextValue>({
  isModalOpen: false,
  openAdd: () => {},
  openEdit: () => {},
  openDuplicate: () => {},
  closeModal: () => {},
  toggle: () => {},
  editTransaction: null,
  duplicateTransaction: null,
  setOnComplete: () => {},
});

export function useTransactionModal() {
  return useContext(ModalContext);
}

