export default function Divider({ label }) {
    return (
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-default" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-3 text-xs muted" style={{ background: "var(--card-bg)" }}>{label}</span>
        </div>
      </div>
    );
  }
  
