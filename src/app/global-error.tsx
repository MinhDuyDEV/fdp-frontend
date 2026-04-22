'use client';

import { useEffect } from 'react';

export default function GlobalError({
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
    <html lang="vi">
      <body>
        <div className="error-container">
          <h2 className="error-title">Something went wrong</h2>
          <p className="error-message">{error.message || 'An unexpected error occurred.'}</p>
          <button className="error-retry" onClick={reset}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
