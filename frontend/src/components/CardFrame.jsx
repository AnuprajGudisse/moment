export default function CardFrame({ aspect = "1 / 1", children }) {
  return (
    <div
      className="overflow-hidden rounded-2xl border"
      style={{ background: "var(--card-bg)", borderColor: "var(--border)" }}
    >
      {/* top strip */}
      <div className="h-6 border-b" style={{ background: "var(--hover)", borderColor: "var(--border)" }} />
      {/* media slot */}
      <div
        className="w-full"
        style={{ aspectRatio: aspect, maxHeight: "80vh", background: "var(--hover)" }}
      >
        {children}
      </div>
      {/* bottom strip */}
      <div className="h-6 border-t" style={{ background: "var(--hover)", borderColor: "var(--border)" }} />
    </div>
  );
}
