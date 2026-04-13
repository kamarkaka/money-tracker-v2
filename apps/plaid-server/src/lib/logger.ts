type Meta = Record<string, string | number | boolean | null | undefined>;

function log(level: string, cat: string, msg: string, meta?: Meta) {
  const entry: Record<string, unknown> = {
    time: new Date().toISOString(),
    level,
    cat,
    msg,
  };
  if (meta) {
    for (const [k, v] of Object.entries(meta)) {
      if (v !== undefined) entry[k] = v;
    }
  }
  const out = JSON.stringify(entry);
  if (level === "error") {
    console.error(out);
  } else {
    console.log(out);
  }
}

export function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "unknown error";
}

export const logger = {
  info: (cat: string, msg: string, meta?: Meta) => log("info", cat, msg, meta),
  warn: (cat: string, msg: string, meta?: Meta) => log("warn", cat, msg, meta),
  error: (cat: string, msg: string, meta?: Meta) => log("error", cat, msg, meta),
};
