export default function Tag({ label, selected, toggle }) {
    const handleClick = (e) => {
      e.preventDefault(); // Prevent form submission
      e.stopPropagation(); // Stop event bubbling
      console.log(`Tag clicked: ${label}, currently selected: ${selected}`);
      if (toggle) {
        toggle();
      }
    };

    return (
      <button
        onClick={handleClick}
        type="button"
        className={`rounded-full border px-3 py-1 text-xs transition cursor-pointer ${
          selected
            ? "border-[var(--ring)] bg-[var(--hover)] text-[var(--text)]"
            : "border-[var(--border)] hover:bg-[var(--hover)] text-[var(--muted)]"
        }`}
      >
        {label}
      </button>
    );
  }
  
