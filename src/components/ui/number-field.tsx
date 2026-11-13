import React, { useEffect, useRef, useState } from "react";

export interface NumberFieldProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "type" | "value" | "onChange" | "min" | "max"
  > {
  /** Controlled numeric or string value */
  value: number | string | null | undefined;
  /** Called immediately on keystroke; `num` is `undefined` when empty */
  onValueChange: (num: number | undefined, raw: string) => void;
  /** Allow a single decimal point (default: false) */
  allowDecimal?: boolean;
  /** Optional minimum bound */
  min?: number;
  /** Optional maximum bound */
  max?: number;
  /** Clamp out-of-range values on blur (default: false) */
  clampOnBlur?: boolean;
}

function toDraft(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === "") return "";
  if (typeof val === "number") return Number.isFinite(val) ? String(val) : "";
  return String(val);
}

/**
 * Controlled numeric input that keeps a local string draft while focused so
 * users can backspace/delete to an empty field without snapping back to "0"
 * or trapping digits.
 */
export function NumberField({
  value,
  onValueChange,
  allowDecimal = false,
  min,
  max,
  clampOnBlur = false,
  onFocus,
  onBlur,
  inputMode,
  ...rest
}: NumberFieldProps) {
  const [draft, setDraft] = useState<string>(() => toDraft(value));
  const focusedRef = useRef(false);

  useEffect(() => {
    if (focusedRef.current) return;
    const next = toDraft(value);
    setDraft((prev) => (prev === next ? prev : next));
  }, [value]);

  const pattern = allowDecimal ? /^\d*\.?\d*$/ : /^\d*$/;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (!pattern.test(raw)) return;
    setDraft(raw);
    if (raw === "" || raw === ".") {
      onValueChange(undefined, raw);
      return;
    }
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) {
      onValueChange(parsed, raw);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    focusedRef.current = true;
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    focusedRef.current = false;
    if (draft === "" || draft === ".") {
      // Sync back to whatever parent stored (e.g. "" if string/nullable, "0" if number)
      setDraft(toDraft(value));
      onBlur?.(e);
      return;
    }
    let parsed = Number(draft);
    if (Number.isFinite(parsed) && clampOnBlur) {
      if (min !== undefined && parsed < min) parsed = min;
      if (max !== undefined && parsed > max) parsed = max;
      const clampedRaw = String(parsed);
      setDraft(clampedRaw);
      onValueChange(parsed, clampedRaw);
    } else {
      setDraft(toDraft(value));
    }
    onBlur?.(e);
  };

  return (
    <input
      {...rest}
      type="text"
      inputMode={inputMode ?? (allowDecimal ? "decimal" : "numeric")}
      value={draft}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
    />
  );
}
