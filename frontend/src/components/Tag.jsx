export default function Tag({ label, selected, toggle }) {
    return (
      <button
        onClick={toggle}
        type="button"
        className={`rounded-full border px-3 py-1 text-xs transition ${
          selected
            ? "border-[var(--ring)] bg-[var(--hover)]"
            : "border-[var(--border)] hover-surface"
        }`}
      >
        {label}
      </button>
    );
  }
  
