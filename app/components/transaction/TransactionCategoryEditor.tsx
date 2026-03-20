"use client";

import { useState, useRef, useEffect, useMemo } from "react";

interface Category {
  id: string;
  name: string;
  parentId: string | null;
  children?: Category[];
}

interface TransactionCategoryEditorProps {
  transactionId: string;
  currentCategoryId: string | null;
  categories: Category[];
  onUpdate: (transactionId: string, categoryId: string | null) => Promise<void>;
}

export function TransactionCategoryEditor({
  transactionId,
  currentCategoryId,
  categories,
  onUpdate,
}: TransactionCategoryEditorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const flatCategories = useMemo(
    () =>
      categories
        .filter((c) => !c.parentId)
        .flatMap((c) => [
          { id: c.id, name: c.name },
          ...(c.children?.map((ch) => ({ id: ch.id, name: `${c.name} > ${ch.name}` })) ?? []),
        ]),
    [categories],
  );

  const currentName = useMemo(() => {
    if (!currentCategoryId) return "Uncategorized";
    return flatCategories.find((c) => c.id === currentCategoryId)?.name ?? "Uncategorized";
  }, [currentCategoryId, flatCategories]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return [{ id: "", name: "Uncategorized" }, ...flatCategories];
    return [{ id: "", name: "Uncategorized" }, ...flatCategories].filter((c) =>
      c.name.toLowerCase().includes(q),
    );
  }, [search, flatCategories]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Focus input when dropdown opens
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  const handleToggle = () => {
    if (!open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // 220px ≈ dropdown height (max-h-48 + search input + borders)
      setDropUp(spaceBelow < 220);
    }
    setOpen(!open);
  };

  const handleSelect = async (categoryId: string | null) => {
    setOpen(false);
    setSearch("");
    if (categoryId === currentCategoryId) return;
    setLoading(true);
    await onUpdate(transactionId, categoryId);
    setLoading(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        className="flex w-full cursor-pointer items-center justify-between gap-1 rounded-md border border-zinc-300 px-3 py-2 text-left text-sm text-zinc-900 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700 md:px-2 md:py-1 md:text-xs"
      >
        <span className="truncate">{loading ? "Saving..." : currentName}</span>
        <svg
          className={`h-3 w-3 shrink-0 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className={`absolute left-0 z-50 w-full rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800 ${dropUp ? "bottom-full mb-1" : "top-full mt-1"}`}>
          {dropUp ? (
            <>
              <ul className="max-h-48 overflow-y-auto py-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-300 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-600">
                {filtered.length === 0 ? (
                  <li className="px-3 py-2 text-xs text-zinc-400">No matches</li>
                ) : (
                  filtered.map((c) => (
                    <li key={c.id || "__uncategorized"}>
                      <button
                        type="button"
                        onClick={() => handleSelect(c.id || null)}
                        className={`flex w-full cursor-pointer items-center px-3 py-2.5 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700 md:py-1.5 md:text-xs ${
                          (c.id || null) === currentCategoryId
                            ? "font-medium text-zinc-900 dark:text-zinc-50"
                            : "text-zinc-700 dark:text-zinc-300"
                        }`}
                      >
                        {c.name}
                      </button>
                    </li>
                  ))
                )}
              </ul>
              <div className="border-t border-zinc-200 p-1.5 dark:border-zinc-700">
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search categories..."
                  className="w-full bg-transparent px-2 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none dark:text-zinc-50 dark:placeholder-zinc-500 md:py-1 md:text-xs"
                />
              </div>
            </>
          ) : (
            <>
              <div className="border-b border-zinc-200 p-1.5 dark:border-zinc-700">
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search categories..."
                  className="w-full bg-transparent px-2 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none dark:text-zinc-50 dark:placeholder-zinc-500 md:py-1 md:text-xs"
                />
              </div>
              <ul className="max-h-48 overflow-y-auto py-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-300 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-600">
                {filtered.length === 0 ? (
                  <li className="px-3 py-2 text-xs text-zinc-400">No matches</li>
                ) : (
                  filtered.map((c) => (
                    <li key={c.id || "__uncategorized"}>
                      <button
                        type="button"
                        onClick={() => handleSelect(c.id || null)}
                        className={`flex w-full cursor-pointer items-center px-3 py-2.5 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700 md:py-1.5 md:text-xs ${
                          (c.id || null) === currentCategoryId
                            ? "font-medium text-zinc-900 dark:text-zinc-50"
                            : "text-zinc-700 dark:text-zinc-300"
                        }`}
                      >
                        {c.name}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
