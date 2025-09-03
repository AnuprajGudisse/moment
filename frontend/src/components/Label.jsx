export default function Label({ htmlFor, children }) {
    return (
      <label htmlFor={htmlFor} className="text-sm font-medium" style={{ color: "var(--text)" }}>
        {children}
      </label>
    );
  }
  
