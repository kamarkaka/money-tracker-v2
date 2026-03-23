import { useAddModal } from "@/lib/addModal";
import { TransactionModal } from "./TransactionModal";

export function AddTransactionOverlay() {
  const { open, setOpen } = useAddModal();

  return (
    <TransactionModal
      open={open}
      onClose={() => setOpen(false)}
    />
  );
}
