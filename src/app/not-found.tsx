import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'IBM Plex Mono', monospace",
      background: 'var(--paper)', color: 'var(--ink)',
    }}>
      <div style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: '8rem', fontWeight: 900, lineHeight: 1,
        color: 'var(--aged)',
      }}>404</div>
      <div style={{ fontSize: '0.8rem', color: 'var(--smoke)', marginTop: 8, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        Không tìm thấy trang
      </div>
      <Link
        href="/"
        style={{
          marginTop: 24,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '0.72rem', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.08em',
          background: 'var(--ink)', color: 'var(--paper)',
          padding: '10px 24px', textDecoration: 'none',
          display: 'inline-block',
        }}
      >
        ← Về trang chủ
      </Link>
    </div>
  )
}
