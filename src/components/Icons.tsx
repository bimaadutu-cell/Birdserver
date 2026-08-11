/**
 * Premium inline SVG icon set for BirdServer.
 * Each icon takes size (default 20) and optional color prop.
 */

type P = { size?: number; color?: string; className?: string; strokeWidth?: number };

const S = (p: P & { children: React.ReactNode }) => (
  <svg
    width={p.size || 20}
    height={p.size || 20}
    viewBox="0 0 24 24"
    fill="none"
    stroke={p.color || "currentColor"}
    strokeWidth={p.strokeWidth || 1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={p.className}
  >
    {p.children}
  </svg>
);

export const IconDashboard = (p: P) => (
  <S {...p}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </S>
);

export const IconServer = (p: P) => (
  <S {...p}>
    <rect x="3" y="4" width="18" height="7" rx="1.5" />
    <rect x="3" y="13" width="18" height="7" rx="1.5" />
    <path d="M7 7.5h.01M7 16.5h.01" />
  </S>
);

export const IconUsers = (p: P) => (
  <S {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M2 20c0-3.5 3.1-6 7-6s7 2.5 7 6" />
    <circle cx="17" cy="7" r="2.6" />
    <path d="M15 14c3.5 0 7 2 7 5" />
  </S>
);

export const IconReseller = (p: P) => (
  <S {...p}>
    <path d="M3 8l1.5-3h15L21 8" />
    <path d="M3 8v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V8" />
    <path d="M8 12h8" />
    <path d="M12 8v8" />
  </S>
);

export const IconNode = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="3" />
    <circle cx="4" cy="6" r="1.5" />
    <circle cx="20" cy="6" r="1.5" />
    <circle cx="4" cy="18" r="1.5" />
    <circle cx="20" cy="18" r="1.5" />
    <path d="M5 7l5 4M19 7l-5 4M5 17l5-4M19 17l-5-4" />
  </S>
);

export const IconKey = (p: P) => (
  <S {...p}>
    <circle cx="8" cy="15" r="4" />
    <path d="M11 12l9-9" />
    <path d="M16 7l3 3" />
    <path d="M14 9l3 3" />
  </S>
);

export const IconCpu = (p: P) => (
  <S {...p}>
    <rect x="5" y="5" width="14" height="14" rx="2" />
    <rect x="9" y="9" width="6" height="6" rx="0.5" />
    <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
  </S>
);

export const IconMemory = (p: P) => (
  <S {...p}>
    <rect x="2" y="7" width="20" height="10" rx="1.5" />
    <path d="M6 7v10M10 7v10M14 7v10M18 7v10" />
    <path d="M5 21v-4M9 21v-4M13 21v-4M17 21v-4" />
  </S>
);

export const IconDisk = (p: P) => (
  <S {...p}>
    <ellipse cx="12" cy="6" rx="8" ry="3" />
    <path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
    <path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
  </S>
);

export const IconActivity = (p: P) => (
  <S {...p}>
    <path d="M3 12h4l3-8 4 16 3-8h4" />
  </S>
);

export const IconRunning = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M10 8.5l6 3.5-6 3.5z" fill={p.color || "currentColor"} />
  </S>
);

export const IconCheck = (p: P) => (
  <S {...p}>
    <path d="M5 12l5 5L20 6" />
  </S>
);

export const IconClose = (p: P) => (
  <S {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </S>
);

export const IconWarn = (p: P) => (
  <S {...p}>
    <path d="M12 3l10 18H2z" />
    <path d="M12 10v5M12 18h.01" />
  </S>
);

export const IconLogs = (p: P) => (
  <S {...p}>
    <path d="M5 3h11l3 3v15H5z" />
    <path d="M9 8h8M9 12h8M9 16h5" />
  </S>
);

export const IconAudit = (p: P) => (
  <S {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-4-4" />
    <path d="M11 8v3l2 2" />
  </S>
);

export const IconRuntime = (p: P) => (
  <S {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M7 8h.01" />
    <path d="M10 15l3-6" />
  </S>
);

export const IconSettings = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </S>
);

export const IconPort = (p: P) => (
  <S {...p}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path d="M8 4v4M16 4v4M8 16v4M16 16v4M4 8h4M4 16h4M16 8h4M16 16h4" />
  </S>
);

export const IconFolder = (p: P) => (
  <S {...p}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </S>
);

export const IconFile = (p: P) => (
  <S {...p}>
    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
    <path d="M14 3v6h6" />
  </S>
);

export const IconMove = (p: P) => (
  <S {...p}>
    <path d="M12 3v18M3 12h18" />
    <path d="M8 7l-5 5 5 5M16 7l5 5-5 5M7 8l5-5 5 5M7 16l5 5 5-5" />
  </S>
);

export const IconArchive = (p: P) => (
  <S {...p}>
    <rect x="3" y="3" width="18" height="5" rx="1" />
    <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
    <path d="M10 12h4" />
  </S>
);

export const IconExtract = (p: P) => (
  <S {...p}>
    <path d="M12 3v9" />
    <path d="M7 8l5-5 5 5" />
    <rect x="4" y="14" width="16" height="7" rx="1" />
  </S>
);

export const IconUpload = (p: P) => (
  <S {...p}>
    <path d="M12 3v13M6 9l6-6 6 6" />
    <path d="M4 21h16" />
  </S>
);

export const IconDownload = (p: P) => (
  <S {...p}>
    <path d="M12 3v13M6 15l6 6 6-6" />
    <path d="M4 21h16" strokeWidth={1.4}/>
  </S>
);

export const IconTrash = (p: P) => (
  <S {...p}>
    <path d="M4 7h16M9 7V4h6v3" />
    <path d="M6 7l1 13h10l1-13" />
    <path d="M10 11v6M14 11v6" />
  </S>
);

export const IconPlay = (p: P) => (
  <S {...p}>
    <path d="M8 5l12 7-12 7z" fill={p.color || "currentColor"} />
  </S>
);

export const IconStop = (p: P) => (
  <S {...p}>
    <rect x="6" y="6" width="12" height="12" rx="1" fill={p.color || "currentColor"} />
  </S>
);

export const IconRestart = (p: P) => (
  <S {...p}>
    <path d="M4 12a8 8 0 1 0 3-6.2" />
    <path d="M3 4v5h5" />
  </S>
);

export const IconEdit = (p: P) => (
  <S {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z" />
  </S>
);

export const IconLogout = (p: P) => (
  <S {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5M21 12H9" />
  </S>
);

export const IconMenu = (p: P) => (
  <S {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </S>
);

export const IconArrow = (p: P) => (
  <S {...p}>
    <path d="M19 12H5M12 5l-7 7 7 7" />
  </S>
);

export const IconBird = (p: P) => (
  <svg
    width={p.size || 20}
    height={p.size || 20}
    viewBox="0 0 64 64"
    fill="none"
    className={p.className}
  >
    <defs>
      <linearGradient id={`birdgrad-${p.size || 20}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#00c8ff" />
        <stop offset="100%" stopColor="#0080ff" />
      </linearGradient>
    </defs>
    <path
      d="M32 8c-8 0-14 5-15 12l-8 4c-1 1-1 3 1 3l7 0c-1 3-2 6-2 10 0 10 8 18 18 18 8 0 15-6 17-13 6-1 10-6 10-13 0-8-7-14-15-14-1 0-2 0-3 1-2-5-6-8-10-8z"
      fill={p.color || `url(#birdgrad-${p.size || 20})`}
    />
    <circle cx="26" cy="26" r="2.2" fill="#050a14" />
  </svg>
);
