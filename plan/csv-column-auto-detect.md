# CSV Column Auto-Detection Plan

## Current State

The `ImportCsvModal` has a header-based `autoDetectMapping()` that matches column headers by keyword (e.g. "date", "description", "amount"). This works when headers are present and clearly named, but fails when:
- The CSV has no headers (or `hasHeader` is unchecked)
- Headers are abbreviated, non-English, or unconventional (e.g. "Txn Dt", "Betrag")
- Headers are generic (e.g. "Column1", "Field A")

## Goal

After a CSV is parsed, run a content-based inference pass that examines actual cell values (not just headers) to guess each column's role. The result pre-fills the column mapping dropdowns. Header-based matching remains as a supplementary signal but is no longer the sole source.

## Detection Strategy

### Phase 1: Per-Column Scoring

For each column, sample the data rows (up to 20) and compute a confidence score (0–1) for each possible role.

#### Date Detection
- Try parsing each cell with every supported date format (`MM/DD/YYYY`, `YYYY-MM-DD`, etc.)
- A column scores high for "date" if ≥80% of non-empty cells parse as a valid date in at least one format
- Side effect: auto-select the `dateFormat` dropdown to the best-matching format
- Distinguisher: date strings contain separators (`/`, `-`) and have 2–3 numeric segments, or contain month abbreviations

#### Amount / Debit / Credit Detection
- Strip `$`, `€`, commas, whitespace; attempt `parseFloat`
- A column scores high if ≥80% of non-empty cells are valid numbers
- Sub-classification:
  - **Amount**: mix of positive and negative values, or all negative, or all positive
  - **Debit**: all values ≥ 0 AND a sibling numeric column also exists (suggests debit/credit pair)
  - **Credit**: same logic, paired with debit
- If only one numeric column exists → "amount"
- If exactly two numeric columns exist → check header hints or positional heuristics (first = debit, second = credit) but allow user to swap
- Confidence boost if values have exactly 2 decimal places (currency pattern)

#### Description Detection
- A text column (not date, not numeric) with high cardinality (many unique values relative to row count)
- Typically the longest average cell length among text columns
- Usually present in every row (low empty-cell rate)

#### Category Detection
- A text column with low cardinality (few unique values relative to row count — e.g. ≤30% unique)
- Values tend to be short single words or short phrases
- If the user has existing categories, check if cell values overlap with known category names — high overlap boosts confidence

#### Account Detection
- A text column with very low cardinality (likely ≤5 unique values)
- If the user has existing accounts, check if cell values overlap with known account names
- Rare in most bank exports (usually a single-account export)

### Phase 2: Global Assignment

After scoring every column for every role, run a global assignment to pick the best overall mapping:

1. **Required roles first**: date, description, amount (or debit+credit)
2. For each role, pick the column with the highest score, provided it exceeds a minimum threshold (e.g. 0.4)
3. No column can be assigned two roles
4. Use a greedy approach: assign highest-confidence (role, column) pair first, remove both from the pool, repeat
5. Optional roles (category, account) are assigned only if confidence > 0.5

### Phase 3: Header Boosting (existing logic as tiebreaker)

If headers are present (`hasHeader` is true), apply the existing keyword matching as a score boost (+0.3) rather than a hard assignment. This means:
- A column with header "Date" that also contains date-like values gets a very high score
- A column with header "Date" that contains only numbers will still be nudged toward "date" but might lose to a column with actual date content

## Implementation Plan

### Step 1: Create `inferColumnMapping` utility function

Location: add to `ImportCsvModal.tsx` (or extract to a utility if it gets large)

```ts
interface ColumnScore {
  date: number;
  description: number;
  amount: number;
  debit: number;
  credit: number;
  category: number;
  account: number;
}

interface InferResult {
  mapping: Record<string, string>;  // colIndex → role
  dateFormat: string;               // best-guess date format
}

function inferColumnMapping(
  rows: string[][],         // data rows (excluding header if applicable)
  headers: string[] | null, // header row, if hasHeader is true
  knownCategories: string[],
  knownAccounts: string[],
): InferResult
```

### Step 2: Implement per-column analyzers

Individual pure functions, each returning a 0–1 score:

- `scoreDateColumn(values: string[]): { score: number; format: string }`
- `scoreNumericColumn(values: string[]): { score: number; hasNegatives: boolean; hasMixed: boolean }`
- `scoreDescriptionColumn(values: string[]): number`
- `scoreCategoryColumn(values: string[], knownCategories: string[]): number`
- `scoreAccountColumn(values: string[], knownAccounts: string[]): number`

### Step 3: Implement global assignment

Greedy assignment with conflict resolution as described in Phase 2.

### Step 4: Integrate into the modal

In `handleFileChange`, after parsing:

```ts
const dataRows = rows.slice(hasHeader ? 1 : 0);
const headers = hasHeader ? rows[0] : null;
const { mapping, dateFormat: inferredFormat } = inferColumnMapping(
  dataRows.slice(0, 20), // sample
  headers,
  categories.map(c => c.name), // from parent, if passed down
  accounts.map(a => a.name),
);
setColumnMapping(mapping);
setDateFormat(inferredFormat);
```

### Step 5: Pass categories/accounts to ImportCsvModal

Currently `ImportCsvModal` receives only `accounts: Account[]`. It also needs `categories` for category-name matching during inference.

Update props:
```ts
interface ImportCsvModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  accounts: Account[];
  categories: Category[];  // ADD
}
```

The parent `TransactionPage` already has `categories` state, so just thread it through.

## Edge Cases

- **All-empty column**: score 0 for every role, skip
- **Single data row**: inference is unreliable — fall back to header-only matching
- **Multiple date columns** (e.g. "Transaction Date" and "Posted Date"): pick the one with the higher score; usually both will score equally, so header hints or left-most position breaks the tie
- **Currency symbols in amounts**: strip before parsing (`$1,234.56` → `1234.56`)
- **Parenthetical negatives**: `(50.00)` should parse as `-50.00` (common in accounting exports)

## UX Notes

- Auto-detection runs instantly on file upload — no loading state needed (pure computation on ≤20 rows)
- Users can still override any auto-detected mapping via the existing dropdowns
- The dropdowns are pre-filled with the guessed role, so users only need to fix mistakes
- Consider showing a subtle indicator (e.g., "auto-detected" text or a small icon) next to auto-filled mappings — but this is optional polish
