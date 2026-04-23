'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="error-container">
      <h2 className="error-title">Failed to load manga</h2>
      <p className="error-message">{error.message || 'Could not load manga details.'}</p>
      <div className="error-actions">
        <button className="error-retry" onClick={reset}>
          Try again
        </button>
        <Link href="/" className="error-home">
          Go home
        </Link>
      </div>
    </div>
  );
}
