"use client";

import { useState, useEffect, useCallback } from "react";

export function usePageGuide(page: string) {
  const [shouldShow, setShouldShow] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetch(`/api/guide?page=${page}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.shouldShow) {
          setShouldShow(true);
        }
        setChecked(true);
      })
      .catch(() => setChecked(true));
  }, [page]);

  const complete = useCallback(async () => {
    setShouldShow(false);
    await fetch("/api/guide", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page }),
    });
  }, [page]);

  return { shouldShow, checked, complete };
}
