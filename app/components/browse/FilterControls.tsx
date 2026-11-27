"use client";

// The small retro form pieces of the Browse sidebar
import { displayFont, uiFont } from "../fonts";

const RAM_CHOICES = [1, 2, 4, 6, 8, 12, 16, 32];

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className={`${displayFont.className} mb-2 mt-5 border-b-2 border-[#d62fb8] pb-1 text-lg text-[#4fe3f0] first:mt-0`}
    >
      {children}
    </h3>
  );
}

export function Check({
  checked,
  onChange,
  children,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <label
      className={`${uiFont.className} flex cursor-pointer items-center gap-2 py-0.5 text-base text-[#ece9ff] ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="peer sr-only"
      />
      <span className="retro-inset flex h-5 w-5 shrink-0 items-center justify-center bg-[#14122b] text-sm font-bold leading-none text-[#4fe3f0] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-[#4fe3f0]">
        {checked ? "✕" : ""}
      </span>
      {children}
    </label>
  );
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`retro-btn ${active ? "retro-btn-indigo" : "retro-btn-white"} ${uiFont.className} !px-1.5 !py-0 text-[11px] leading-5`}
    >
      {children}
    </button>
  );
}

// Two sliders, for the low and the high end of a range
export function Range({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
}) {
  return (
    <div className={`${uiFont.className} text-sm text-[#ece9ff]`}>
      <div className="flex justify-between">
        <span>{label}</span>
        <span className="text-[#4fe3f0]">
          {value[0]} - {value[1]}
        </span>
      </div>
      <input
        type="range"
        aria-label={`${label} from`}
        min={min}
        max={max}
        step={step}
        value={value[0]}
        onChange={(e) =>
          onChange([Math.min(Number(e.target.value), value[1]), value[1]])
        }
        className="mt-1 block w-full accent-[#d62fb8]"
      />
      <input
        type="range"
        aria-label={`${label} to`}
        min={min}
        max={max}
        step={step}
        value={value[1]}
        onChange={(e) =>
          onChange([value[0], Math.max(Number(e.target.value), value[0])])
        }
        className="block w-full accent-[#4fe3f0]"
      />
    </div>
  );
}

export function RamSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <label
      className={`${uiFont.className} flex items-center justify-between gap-2 text-sm text-[#ece9ff]`}
    >
      {label}
      <select
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value === "" ? null : Number(e.target.value))
        }
        className="retro-inset bg-[#14122b] px-2 py-1 text-[#4fe3f0]"
      >
        <option value="">Any</option>
        {RAM_CHOICES.map((n) => (
          <option key={n} value={n}>
            {n} GB
          </option>
        ))}
      </select>
    </label>
  );
}
