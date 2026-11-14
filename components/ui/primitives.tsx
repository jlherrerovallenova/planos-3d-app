import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';
import {
  forwardRef,
  useEffect,
  useId,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes
} from 'react';

export const cn = clsx;

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'quiet';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-prussian text-white hover:bg-[#1a3594] disabled:bg-prussian/45 shadow-[inset_0_-1px_0_rgba(0,0,0,0.25)]',
  secondary:
    'bg-paper text-ink border border-rule hover:border-graphite/50 hover:bg-white disabled:opacity-50',
  ghost: 'text-ink hover:bg-ink/[0.06] disabled:opacity-40',
  quiet: 'text-graphite hover:text-ink hover:bg-ink/[0.05] disabled:opacity-40',
  danger: 'text-pencil hover:bg-pencil-soft disabled:opacity-40'
};

const sizes = {
  sm: 'h-7 px-2.5 text-[12.5px] gap-1.5 rounded-md',
  md: 'h-8.5 px-3 text-[13px] gap-2 rounded-md',
  lg: 'h-10 px-4 text-[14px] gap-2 rounded-lg'
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', icon, loading, className, children, disabled, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-colors select-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  );
});

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  active?: boolean;
  tone?: 'default' | 'danger' | 'onDark';
  size?: 'sm' | 'md';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, active, tone = 'default', size = 'md', className, children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md transition-colors disabled:opacity-35',
        size === 'sm' ? 'size-7' : 'size-8.5',
        tone === 'onDark'
          ? active
            ? 'bg-white text-ink'
            : 'text-white/80 hover:bg-white/12 hover:text-white'
          : tone === 'danger'
            ? 'text-graphite hover:bg-pencil-soft hover:text-pencil'
            : active
              ? 'bg-prussian-soft text-prussian'
              : 'text-graphite hover:bg-ink/[0.06] hover:text-ink',
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
});

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  size = 'md',
  className,
  label
}: {
  value: T;
  options: { value: T; label: ReactNode; title?: string }[];
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
  className?: string;
  label?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('flex rounded-md border border-rule bg-vellum/60 p-0.5', className)}
    >
      {options.map((o) => (
        <button
          key={String(o.value)}
          role="radio"
          aria-checked={o.value === value}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-[5px] font-medium whitespace-nowrap transition-colors',
            size === 'sm' ? 'h-6 px-2 text-[12px]' : 'h-7.5 px-2.5 text-[12.5px]',
            o.value === value
              ? 'bg-paper text-ink shadow-[0_1px_2px_rgba(24,34,47,0.12)]'
              : 'text-graphite hover:text-ink'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
  aside,
  className
}: {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="lettering text-[12.5px] font-semibold text-graphite">{label}</span>
        {aside}
      </div>
      {children}
      {hint && <p className="text-[12px] leading-snug text-faint">{hint}</p>}
    </div>
  );
}

const inputBase =
  'w-full rounded-md border border-rule bg-paper px-2.5 text-[13px] text-ink placeholder:text-faint transition-colors hover:border-graphite/40 focus:border-prussian focus:outline-none focus:ring-2 focus:ring-prussian/15';

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function TextInput({ className, ...rest }, ref) {
    return <input ref={ref} className={cn(inputBase, 'h-8.5', className)} {...rest} />;
  }
);

export function TextArea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputBase, 'min-h-20 resize-y py-2 leading-snug', className)} {...rest} />;
}

/** Número con formato español que solo confirma al salir o pulsar Intro. */
export function NumberInput({
  value,
  onCommit,
  placeholder,
  suffix,
  className,
  ariaLabel
}: {
  value?: number;
  onCommit: (v: number | undefined) => void;
  placeholder?: string;
  suffix?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const fmt = (v?: number) =>
    typeof v === 'number'
      ? v.toLocaleString('es-ES', {
          minimumFractionDigits: suffix === 'm²' ? 2 : 0,
          maximumFractionDigits: 2,
          useGrouping: false
        })
      : '';
  const [draft, setDraft] = useState(fmt(value));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setDraft(fmt(value)), [value]);
  const commit = () => {
    const n = parseFloat(draft.replace(',', '.'));
    const next = Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : undefined;
    if (next !== value) onCommit(next);
    setDraft(fmt(next));
  };
  return (
    <div className={cn('relative', className)}>
      <input
        aria-label={ariaLabel}
        inputMode="decimal"
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
        className={cn(inputBase, 'tnum h-8 pr-8 text-right')}
      />
      {suffix && (
        <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[12px] text-faint">
          {suffix}
        </span>
      )}
    </div>
  );
}

export function Select<T extends string>({
  value,
  onChange,
  options,
  className,
  ariaLabel
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={cn(inputBase, 'h-8 cursor-pointer pr-7', className)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start justify-between gap-3">
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-ink">{label}</span>
        {description && (
          <span className="mt-0.5 block text-[12px] leading-snug text-faint">{description}</span>
        )}
      </span>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 h-5 w-8.5 shrink-0 rounded-full transition-colors',
          checked ? 'bg-prussian' : 'bg-rule'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform',
            checked && 'translate-x-3.5'
          )}
        />
      </button>
    </label>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="lettering inline-flex h-5 min-w-5 items-center justify-center rounded border border-rule bg-paper px-1 text-[11px] font-semibold text-graphite shadow-[0_1px_0_var(--color-rule)]">
      {children}
    </kbd>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('size-4 animate-spin', className)} />;
}

/** Bloque del inspector con título y acciones opcionales. */
export function Section({
  title,
  children,
  actions,
  className
}: {
  title: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('border-b border-rule-soft px-4 py-4 last:border-b-0', className)}>
      <header className="mb-3 flex items-center justify-between gap-2">
        <h3 className="lettering text-[13.5px] font-semibold text-ink">{title}</h3>
        {actions && <div className="flex items-center gap-1">{actions}</div>}
      </header>
      {children}
    </section>
  );
}

export function Swatch({ background, className }: { background?: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('block shrink-0 rounded-[4px] border border-ink/15', className)}
      style={{ background: background || 'var(--color-rule)' }}
    />
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-rule px-3 py-4 text-center text-[12.5px] text-faint">
      {children}
    </p>
  );
}
