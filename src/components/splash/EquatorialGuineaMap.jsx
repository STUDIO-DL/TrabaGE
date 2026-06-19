/**
 * Vector map of Equatorial Guinea — all territories.
 * Path data: Natural Earth 10m (Río Muni, Bioko, Annobón) + OSM/Nominatim (Corisco, Elobey).
 * Simplified with Ramer–Douglas–Peucker; tiny islands hand-tuned for visibility at splash scale.
 */
const VIEW_BOX = '0 0 200 184';

const TERRITORIES = [
  {
    id: 'rioMuni',
    name: 'Río Muni',
    path:
      'M144.00,52.42L144.80,55.50L150.36,58.26L194.55,58.26L195.02,96.95L151.63,96.80L150.02,97.01L148.80,99.41L144.16,96.97L143.99,94.99L145.59,94.52L140.81,93.61L141.29,92.50L136.86,95.50L134.88,92.50L130.62,93.22L128.97,90.89L132.34,86.34L132.91,83.17L137.87,77.42L139.34,78.17L142.17,77.02L139.56,77.83L137.62,75.55L144.34,65.91L142.83,60.56L142.92,53.46L144.00,52.42Z',
  },
  {
    id: 'bioko',
    name: 'Bioko',
    path:
      'M114.89,5.69L115.77,6.78L116.10,7.35L116.23,8.05L116.18,8.69L115.84,9.78L115.57,10.22L114.37,11.29L114.03,12.20L112.83,13.62L112.17,15.40L111.59,15.85L111.44,16.63L111.27,16.92L110.32,17.49L110.20,18.02L110.18,19.55L109.98,20.09L108.48,21.81L107.04,24.05L105.96,23.51L105.79,23.29L105.58,23.38L105.09,23.21L104.17,22.70L103.17,22.95L102.84,22.94L101.78,22.34L99.84,22.04L99.20,21.54L98.79,20.21L98.27,19.34L98.51,18.67L98.71,17.26L98.94,16.62L99.37,15.78L99.99,15.23L100.78,15.45L101.20,15.21L102.94,15.45L103.50,15.23L103.68,14.69L103.59,14.08L103.29,13.62L104.22,13.02L104.68,12.58L104.88,12.16L105.11,9.09L105.54,7.92L106.41,6.50L107.58,5.36L108.94,4.97L108.73,5.45L109.76,5.66L110.22,5.69L110.54,5.45L111.29,5.68L112.37,5.84L113.49,5.81L114.42,5.45L114.62,5.65L114.89,5.69Z',
  },
  {
    id: 'annobon',
    name: 'Annobón',
    path:
      'M5.45,178.38L5.24,177.99L5.20,177.61L5.34,177.28L5.68,177.04L6.12,177.79L6.00,178.60L5.54,179.03L4.98,178.63L5.45,178.38Z',
  },
  {
    id: 'corisco',
    name: 'Corisco',
    path: 'M127.49,100.36L129.08,100.51L128.14,99.01L127.49,100.36Z',
  },
  {
    id: 'elobeyGrande',
    name: 'Elobey Grande',
    path: 'M134.49,97.64a1.5,1.2 0 1,0 3,0a1.5,1.2 0 1,0 -3,0Z',
  },
  {
    id: 'elobeyChico',
    name: 'Elobey Chico',
    path: 'M134.55,96.74L134.62,96.99L134.73,96.97L134.55,96.74Z',
  },
];

export default function EquatorialGuineaMap({ className = '', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={VIEW_BOX}
      fill="currentColor"
      role="img"
      aria-label="Mapa de Guinea Ecuatorial"
      className={className}
      {...props}
    >
      {TERRITORIES.map(({ id, name, path }) => (
        <path key={id} d={path} aria-label={name} />
      ))}
    </svg>
  );
}
