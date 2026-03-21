"use client";

import { useState } from "react";
import { Modal } from "@/app/components/ui/Modal";
import { FormField } from "@/app/components/ui/FormField";

interface AddInstitutionModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string, sophtronMemberId: string) => Promise<void>;
}

export function AddInstitutionModal({ open, onClose, onSubmit }: AddInstitutionModalProps) {
  const [name, setName] = useState("");
  const [sophtronId, setSophtronId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sophtronId.trim()) return;
    setLoading(true);
    setError("");
    try {
      await onSubmit(name.trim(), sophtronId.trim());
      setName("");
      setSophtronId("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add institution");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Institution" className="w-full max-w-md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="Institution Name">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Chase Bank"
            required
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 bg-input-bg dark:text-zinc-50"
          />
        </FormField>
        <FormField label="Sophtron Member ID">
          <input
            type="text"
            value={sophtronId}
            onChange={(e) => setSophtronId(e.target.value)}
            placeholder="UUID from Sophtron"
            required
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 bg-input-bg dark:text-zinc-50"
          />
        </FormField>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="cursor-pointer rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
          >
            {loading ? "Adding..." : "Add"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
