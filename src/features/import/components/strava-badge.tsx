'use client';

interface StravaBadgeProps {
  variant?: 'orange' | 'white' | 'black';
  className?: string;
}

/**
 * Official "Powered by Strava" badge component
 * Following Strava Brand Guidelines: https://developers.strava.com/guidelines/
 */
export function StravaBadge({ variant = 'orange', className = '' }: StravaBadgeProps) {
  const colors = {
    orange: {
      primary: '#FC4C02',
      text: '#FC4C02',
    },
    white: {
      primary: '#FFFFFF',
      text: '#FFFFFF',
    },
    black: {
      primary: '#000000',
      text: '#000000',
    },
  };

  const { primary, text } = colors[variant];

  return (
    <a
      href="https://www.strava.com"
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity ${className}`}
      title="Powered by Strava"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066l-2.084 4.116z"
          fill={primary}
        />
        <path
          d="M10.233 13.828L7.9 9.111H4.47l5.763 11.38 2.089-4.116-2.089-2.547z"
          fill={primary}
          opacity="0.6"
        />
        <path
          d="M7.9 9.111l2.333 4.717 2.089 2.547 2.089-4.116h3.065L12 0 7.9 9.111z"
          fill={primary}
        />
      </svg>
      <span
        className="text-xs font-medium"
        style={{ color: text }}
      >
        Powered by Strava
      </span>
    </a>
  );
}

/**
 * "Connect with Strava" button component
 * Following Strava Brand Guidelines
 */
export function StravaConnectButton({
  onClick,
  loading = false,
  className = '',
}: {
  onClick: () => void;
  loading?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium text-white transition-all hover:opacity-90 disabled:opacity-50 ${className}`}
      style={{ backgroundColor: '#FC4C02' }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066l-2.084 4.116z"
          fill="white"
        />
        <path
          d="M10.233 13.828L7.9 9.111H4.47l5.763 11.38 2.089-4.116-2.089-2.547z"
          fill="white"
          opacity="0.6"
        />
        <path
          d="M7.9 9.111l2.333 4.717 2.089 2.547 2.089-4.116h3.065L12 0 7.9 9.111z"
          fill="white"
        />
      </svg>
      {loading ? 'Connexion...' : 'Se connecter avec Strava'}
    </button>
  );
}
