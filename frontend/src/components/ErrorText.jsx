export default function ErrorText({ children }) {
    if (!children) return null;
    return <p className="mt-1 text-xs text-rose-600">{children}</p>;
  }
  