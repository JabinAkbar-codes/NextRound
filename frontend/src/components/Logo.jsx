/**
 * NextRound mark: a rounded chevron-in-a-ring motif ("advancing to the next
 * round") paired with the wordmark set in Borel (loaded in index.html) —
 * used for this logo text only, nowhere else in the app. size scales the
 * icon; the text stays a fixed relationship to it via em units so the whole
 * lockup scales together.
 */
export default function Logo({ size = 26, showWordmark = true }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.34 }}>
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nrMark" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#5aa6e6" />
            <stop offset="1" stopColor="#2c5f96" />
          </linearGradient>
        </defs>
        <circle cx="16" cy="16" r="15" stroke="url(#nrMark)" strokeWidth="2.2" />
        <path
          d="M12 9.5L19.5 16L12 22.5"
          stroke="url(#nrMark)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showWordmark && (
        <span
          style={{

            display: 'inline-block',
            fontFamily: "'Borel', cursive",
            fontWeight: 400,
            fontSize: size * 0.88,
            letterSpacing: '0.01em',
            color: '#244c78',
            lineHeight: 1,
            transform: `translateY(${size * -0.15}px)`,
            marginTop: '23px',
          }}
        >
          Next<span style={{ color: '#3d8ed9' }}>Round</span>
        </span>
      )}
    </span>
  )
}