"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { TagBadge } from "./TagBadge";

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TagSelectorProps {
  allTags: Tag[];
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  onCreateTag?: (name: string) => Promise<Tag | null>;
}

export function TagSelector({ allTags, selectedTagIds, onChange, onCreateTag }: TagSelectorProps) {
  const i18n = useTranslations("tag");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selectedTags = allTags.filter((t) => selectedTagIds.includes(t.id));
  const availableTags = allTags.filter(
    (t) => !selectedTagIds.includes(t.id) && t.name.toLowerCase().includes(search.toLowerCase())
  );
  const showCreate = search.trim() && !allTags.some((t) => t.name.toLowerCase() === search.trim().toLowerCase());

  const addTag = (tagId: string) => {
    onChange([...selectedTagIds, tagId]);
    setSearch("");
  };

  const removeTag = (tagId: string) => {
    onChange(selectedTagIds.filter((id) => id !== tagId));
  };

  const handleCreate = async () => {
    if (!onCreateTag || !search.trim()) return;
    const newTag = await onCreateTag(search.trim());
    if (newTag) {
      addTag(newTag.id);
    }
  };

  return (
    <div ref={ref} className="relative">
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-card-border bg-input-bg px-2 py-1.5">
        {selectedTags.map((tag) => (
          <TagBadge
            key={tag.id}
            name={tag.name}
            color={tag.color}
            onRemove={() => removeTag(tag.id)}
          />
        ))}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={selectedTags.length === 0 ? i18n("addToTransaction") : ""}
          className="min-w-[80px] flex-1 border-0 bg-transparent px-1 py-0.5 text-sm text-zinc-900 outline-none dark:text-zinc-50"
        />
      </div>
      {open && (availableTags.length > 0 || showCreate) && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-40 overflow-y-auto rounded-md border border-card-border bg-card-bg shadow-lg">
          {availableTags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => addTag(tag.id)}
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              <TagBadge name={tag.name} color={tag.color} />
            </button>
          ))}
          {showCreate && onCreateTag && (
            <button
              onClick={handleCreate}
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-zinc-100 dark:text-blue-400 dark:hover:bg-zinc-700"
            >
              {i18n("createNew", { name: search.trim() })}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
