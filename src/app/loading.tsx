export default function Loading() {
  return (
    <div className="loading-grid">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="loading-card">
          <div className="skeleton skeleton-cover" />
          <div className="skeleton skeleton-title" />
        </div>
      ))}
    </div>
  );
}
