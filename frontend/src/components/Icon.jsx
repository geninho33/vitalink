function Icon({ name, className = 'h-5 w-5' }) {
  const common = {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.8',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };

  switch (name) {
    case 'layout-dashboard':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="9" rx="1.5" />
          <rect x="14" y="3" width="7" height="5" rx="1.5" />
          <rect x="14" y="12" width="7" height="9" rx="1.5" />
          <rect x="3" y="16" width="7" height="5" rx="1.5" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M8 3v4M16 3v4M3 11h18" />
        </svg>
      );
    case 'heart-pulse':
      return (
        <svg {...common}>
          <path d="M3 12h3l2-5 3 10 2-6h3" />
          <path d="M19.5 12a5.5 5.5 0 1 0-9.7-3.6L12 12l2.2-3.6A5.5 5.5 0 0 1 19.5 12Z" />
        </svg>
      );
    case 'store':
      return (
        <svg {...common}>
          <path d="M4 9h16l-1 11H5L4 9Z" />
          <path d="M4 9 6 4h12l2 5" />
          <path d="M10 13h4" />
        </svg>
      );
    case 'settings':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.6 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
        </svg>
      );
    case 'handshake':
      return (
        <svg {...common}>
          <path d="M8 13 4.5 9.5a2 2 0 0 1 0-3L7 4l3 3" />
          <path d="m16 13 3.5-3.5a2 2 0 0 0 0-3L17 4l-3 3" />
          <path d="M8 13c2 2 4 4 4 4s2-2 4-4" />
          <path d="M9 18h6" />
        </svg>
      );
    case 'building':
      return (
        <svg {...common}>
          <path d="M4 21h16" />
          <path d="M6 21V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v16" />
          <path d="M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1" />
        </svg>
      );
    case 'users':
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="3" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'masks':
    case 'shield':
      return (
        <svg {...common}>
          <path d="M12 3 20 6.5v5c0 4.5-3.1 8.6-8 9.7-4.9-1.1-8-5.2-8-9.7v-5L12 3Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case 'key':
      return (
        <svg {...common}>
          <circle cx="8" cy="15" r="3" />
          <path d="M10.5 13.5 20 4l2 2-2 2-2-1-2 2-1-1" />
        </svg>
      );
    case 'scroll-text':
      return (
        <svg {...common}>
          <path d="M8 4h9a2 2 0 0 1 2 2v14H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
          <path d="M10 9h6M10 13h6M10 17h3" />
        </svg>
      );
    case 'stethoscope':
      return (
        <svg {...common}>
          <path d="M6 4v6a4 4 0 0 0 8 0V4" />
          <path d="M6 4H4M14 4h2" />
          <path d="M18 12v2a4 4 0 0 1-8 0" />
          <circle cx="18" cy="10" r="2" />
        </svg>
      );
    case 'pill':
      return (
        <svg {...common}>
          <path d="m10.5 5.5 8 8a3.5 3.5 0 0 1-5 5l-8-8a3.5 3.5 0 0 1 5-5Z" />
          <path d="m8.5 10.5 5 5" />
        </svg>
      );
    case 'chevron':
      return (
        <svg {...common}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      );
    case 'menu':
      return (
        <svg {...common}>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      );
    case 'panel-left':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M9 4v16" />
        </svg>
      );
    case 'logout':
      return (
        <svg {...common}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="m16 17 5-5-5-5M21 12H9" />
        </svg>
      );
    case 'user':
      return (
        <svg {...common}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="3" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}

export default Icon;
