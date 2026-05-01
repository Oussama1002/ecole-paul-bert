/** Décor SVG pour les écrans d’accueil — style maternelle / primaire */
export function SchoolLoginIllustration() {
  return (
    <div
      className="relative flex h-full min-h-[320px] w-full flex-col items-center justify-center overflow-hidden p-8 text-white lg:min-h-0"
      aria-hidden
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 400 360"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#5BA8C9" />
            <stop offset="100%" stopColor="#3A8FB0" />
          </linearGradient>
          <linearGradient id="hillGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#6BC88A" />
            <stop offset="100%" stopColor="#3D9A5C" />
          </linearGradient>
        </defs>
        <rect width="400" height="360" fill="url(#skyGrad)" />
        <ellipse cx="200" cy="400" rx="280" ry="120" fill="url(#hillGrad)" opacity="0.95" />
        <circle cx="300" cy="70" r="36" fill="#FFE08A" opacity="0.95" />
        <circle cx="300" cy="70" r="44" fill="#FFE08A" opacity="0.2" />
        <ellipse cx="80" cy="95" rx="42" ry="14" fill="white" opacity="0.35" />
        <ellipse cx="130" cy="78" rx="52" ry="18" fill="white" opacity="0.4" />
        <ellipse cx="95" cy="110" rx="38" ry="12" fill="white" opacity="0.28" />

        {/* Petite école */}
        <g transform="translate(118, 155)">
          <rect x="0" y="40" width="164" height="100" rx="4" fill="#FFF8EE" />
          <polygon points="82,0 164,48 0,48" fill="#E88A72" />
          <rect x="68" y="85" width="28" height="55" rx="2" fill="#C4B5E0" />
          <circle cx="82" cy="112" r="3" fill="#5D6D7E" />
          <rect x="18" y="58" width="36" height="32" rx="2" fill="#B8E0F5" />
          <rect x="110" y="58" width="36" height="32" rx="2" fill="#B8E0F5" />
          <rect x="18" y="100" width="36" height="28" rx="2" fill="#B8E0F5" />
          <rect x="110" y="100" width="36" height="28" rx="2" fill="#B8E0F5" />
        </g>

        {/* Arbre */}
        <g transform="translate(48, 200)">
          <rect x="18" y="50" width="12" height="55" rx="2" fill="#8B6914" opacity="0.85" />
          <circle cx="24" cy="38" r="32" fill="#52B078" />
          <circle cx="10" cy="48" r="18" fill="#6BC88A" />
          <circle cx="40" cy="46" r="20" fill="#6BC88A" />
        </g>
        <g transform="translate(310, 210)">
          <rect x="14" y="42" width="10" height="48" rx="2" fill="#8B6914" opacity="0.85" />
          <circle cx="19" cy="32" r="26" fill="#52B078" />
        </g>

        {/* Ballon */}
        <g className="animate-float-slow" transform="translate(52, 118)">
          <ellipse cx="0" cy="0" rx="14" ry="18" fill="#E88A72" />
          <path d="M 0 18 L 4 38" stroke="#FFF8EE" strokeWidth="2" fill="none" />
        </g>
      </svg>

      <div className="relative z-10 max-w-sm text-center">
        <p className="font-display text-3xl font-extrabold leading-tight drop-shadow-md">
          Bienvenue à l&apos;école
        </p>
        <p className="mt-3 text-base font-medium text-white/90 drop-shadow">
          Un espace chaleureux pour suivre les élèves, les classes et la vie de
          l&apos;établissement.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {['Apprentissage', 'Bienveillance', 'Partage'].map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
