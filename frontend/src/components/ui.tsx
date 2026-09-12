import { type ReactNode } from "react";

// ── Status Badge ─────────────────────────────────────────────────────────────

type BadgeVariant = "success" | "warning" | "error" | "info" | "neutral" | "processing";

const BADGE_STYLES: Record<BadgeVariant, { bg: string; color: string; dot: string }> = {
  success:    { bg: "#F0FDF4", color: "#16A34A", dot: "#22C55E" },
  warning:    { bg: "#FFFBEB", color: "#D97706", dot: "#F59E0B" },
  error:      { bg: "#FEF2F2", color: "#DC2626", dot: "#EF4444" },
  info:       { bg: "#EFF6FF", color: "#2563EB", dot: "#3B82F6" },
  neutral:    { bg: "#F8FAFC", color: "#64748B", dot: "#94A3B8" },
  processing: { bg: "#EEF2FF", color: "#6366F1", dot: "#818CF8" },
};

export function StatusBadge({ variant, label }: { variant: BadgeVariant; label: string }) {
  const s = BADGE_STYLES[variant];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ background: s.bg, color: s.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
      {label}
    </span>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

export function StatCard({
  label,
  value,
  change,
  positive,
  icon,
  accent,
}: {
  label: string;
  value: string;
  change: string;
  positive: boolean;
  icon: ReactNode;
  accent?: string;
}) {
  return (
    <div
      className="rounded-xl p-5 border"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: accent ? `${accent}15` : "#EEF2FF" }}
        >
          <span style={{ color: accent ?? "#6366F1" }}>{icon}</span>
        </div>
        <span
          className="text-xs font-medium px-2 py-1 rounded-full"
          style={{
            background: positive ? "#F0FDF4" : "#FEF2F2",
            color: positive ? "#16A34A" : "#DC2626",
          }}
        >
          {positive ? "↑" : "↓"} {change}
        </span>
      </div>
      <div className="text-2xl font-bold mb-1" style={{ fontFamily: "Plus Jakarta Sans, sans-serif", color: "var(--foreground)" }}>
        {value}
      </div>
      <div className="text-sm" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </div>
    </div>
  );
}

// ── Button ────────────────────────────────────────────────────────────────────

type BtnVariant = "primary" | "secondary" | "ghost" | "danger";

const BTN_STYLES: Record<BtnVariant, string> = {
  primary:   "text-white font-semibold",
  secondary: "border font-medium",
  ghost:     "font-medium",
  danger:    "font-medium",
};

export function Btn({
  variant = "primary",
  children,
  onClick,
  className = "",
  small = false,
}: {
  variant?: BtnVariant;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  small?: boolean;
}) {
  const base = `inline-flex items-center gap-2 rounded-lg transition-all duration-150 cursor-pointer ${small ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm"} ${BTN_STYLES[variant]}`;
  const style: React.CSSProperties =
    variant === "primary"
      ? { background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }
      : variant === "secondary"
      ? { background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }
      : variant === "danger"
      ? { background: "#FEF2F2", color: "#DC2626" }
      : { background: "var(--muted)", color: "var(--muted-foreground)" };

  return (
    <button className={`${base} ${className}`} style={style} onClick={onClick}>
      {children}
    </button>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export function Modal({
  open,
  onClose,
  title,
  children,
  width = 480,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: number;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative rounded-2xl shadow-2xl border overflow-hidden"
        style={{ background: "var(--card)", borderColor: "var(--border)", width, maxWidth: "100%", maxHeight: "90vh" }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h3 className="font-bold text-base" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{title}</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-400"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: "calc(90vh - 80px)" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────

export function Input({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
}: {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{label}</label>}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="px-3 py-2.5 rounded-lg border text-sm outline-none transition-all"
        style={{ borderColor: "var(--border)", color: "var(--foreground)", background: "var(--card)" }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "#6366F1"; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
      />
    </div>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold" style={{ fontFamily: "Plus Jakarta Sans, sans-serif", color: "var(--foreground)" }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

export function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="font-semibold text-base mb-1" style={{ color: "var(--foreground)" }}>{title}</h3>
      {subtitle && <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>{subtitle}</p>}
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

export function Card({ children, className = "", padding = true }: { children: ReactNode; className?: string; padding?: boolean }) {
  return (
    <div
      className={`rounded-xl border ${padding ? "p-5" : ""} ${className}`}
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      {children}
    </div>
  );
}

// ── Toggle ────────────────────────────────────────────────────────────────────

export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="relative inline-flex items-center w-10 h-6 rounded-full transition-colors duration-200"
      style={{ background: on ? "#6366F1" : "#CBD5E1" }}
    >
      <span
        className="absolute w-4 h-4 bg-white rounded-full shadow transition-transform duration-200"
        style={{ transform: on ? "translateX(20px)" : "translateX(4px)" }}
      />
    </button>
  );
}

// ── Tab Bar ───────────────────────────────────────────────────────────────────

export function TabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string; count?: number }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-1 border-b mb-5" style={{ borderColor: "var(--border)" }}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className="px-4 py-2.5 text-sm font-medium relative transition-colors"
          style={{
            color: active === t.id ? "#6366F1" : "var(--muted-foreground)",
            borderBottom: active === t.id ? "2px solid #6366F1" : "2px solid transparent",
            marginBottom: "-1px",
          }}
        >
          {t.label}
          {t.count !== undefined && (
            <span
              className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full"
              style={{
                background: active === t.id ? "#EEF2FF" : "var(--muted)",
                color: active === t.id ? "#6366F1" : "var(--muted-foreground)",
              }}
            >
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
