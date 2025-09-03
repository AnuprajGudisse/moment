export default function Input({
    id,
    type = "text",
    value,
    onChange,
    placeholder,
    autoComplete,
    className = "",
  }) {
    return (
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm shadow-sm outline-none transition focus:ring-2 focus:ring-[var(--ring)] ${className}`}
      />
    );
  }
  
