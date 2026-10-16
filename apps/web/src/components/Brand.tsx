import { Link } from 'react-router-dom';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="brand" to="/" aria-label="NightParcel home">
      <svg className="brand-symbol" viewBox="0 0 36 36" aria-hidden="true">
        <path d="M7 10.4 18 4l11 6.4v15.2L18 32 7 25.6Z" />
        <path d="m7 10.4 11 6.3 11-6.3M18 16.7V32" />
        <path className="brand-seal" d="m13.2 11.8 4.8-2.7 4.8 2.7-4.8 2.8Z" />
      </svg>
      <span>{compact ? 'NightParcel' : <><strong>Night</strong>Parcel</>}</span>
    </Link>
  );
}
