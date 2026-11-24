import { uiFont } from "./fonts";

// The close square at the right of a window's title bar. It is a real button
// when onClose is given, and just decoration otherwise.
function CloseSquare({ onClose }: { onClose?: () => void }) {
  const square =
    "retro-raised flex h-[18px] w-[18px] shrink-0 items-center justify-center bg-[#d6d3f5] text-[12px] font-bold leading-none text-[#14122b]";
  return onClose ? (
    <button
      type="button"
      aria-label="Close"
      onClick={onClose}
      className={`${square} cursor-pointer active:translate-x-px active:translate-y-px`}
    >
      ✕
    </button>
  ) : (
    <span className={square} aria-hidden>
      ✕
    </span>
  );
}

// The maximize square. Only some windows have it; it is decoration for now and
// becomes a real button when onMaximize is given.
function MaximizeSquare({ onMaximize }: { onMaximize?: () => void }) {
  const square =
    "retro-raised flex h-[18px] w-[18px] shrink-0 items-center justify-center bg-[#d6d3f5]";
  const icon = (
    <span className="block h-[8px] w-[9px] border-2 border-[#14122b] border-t-[3px]" />
  );
  return onMaximize ? (
    <button
      type="button"
      aria-label="Maximize"
      onClick={(e) => {
        // don't also trigger a click on whatever the window sits inside
        e.stopPropagation();
        onMaximize();
      }}
      className={`${square} cursor-pointer active:translate-x-px active:translate-y-px`}
    >
      {icon}
    </button>
  ) : (
    <span className={square} aria-hidden>
      {icon}
    </span>
  );
}

// A Windows-2000-style window: lavender frame and title bar, grey sunken body.
export default function RetroWindow({
  title,
  onClose,
  maximizable,
  onMaximize,
  children,
  className = "",
  bodyClassName = "",
  style,
}: {
  title: string;
  onClose?: () => void;
  // show the maximize square next to the close square
  maximizable?: boolean;
  onMaximize?: () => void;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`retro-raised bg-[#a9a3e3] p-[3px] shadow-[0_0_24px_rgba(214,47,184,0.35)] ${className}`}
      style={style}
    >
      <div className="flex items-center gap-2 bg-gradient-to-b from-[#c9c4f6] to-[#8d86d6] px-1.5 py-[3px]">
        <span className="retro-raised h-[14px] w-[14px] shrink-0 bg-gradient-to-br from-[#4fe3f0] via-[#3a2bd1] to-[#d62fb8]" />
        <span
          className={`${uiFont.className} min-w-0 flex-1 truncate text-sm font-bold text-[#14122b]`}
        >
          {title}
        </span>
        <span className="flex shrink-0 gap-[3px]">
          {maximizable && <MaximizeSquare onMaximize={onMaximize} />}
          <CloseSquare onClose={onClose} />
        </span>
      </div>
      <div className={`retro-inset mt-[3px] bg-[#3b3a44] ${bodyClassName}`}>
        {children}
      </div>
    </div>
  );
}
