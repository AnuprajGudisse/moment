export default function CardFrame({ aspect = "1 / 1", children }) {
  return (
    <div className="paper grain overflow-hidden">
      {/* top sprocket strip */}
      <div className="h-6 sprockets bg-emulsion border-b border-black/5" />
      {/* media slot */}
      <div
        className="w-full bg-ink"
        style={{ aspectRatio: aspect, maxHeight: "80vh" }}
      >
        {children}
      </div>
      {/* bottom sprocket strip */}
      <div className="h-6 sprockets bg-emulsion border-t border-black/5" />
    </div>
  );
}
