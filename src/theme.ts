export const palette = {
  cream: '#F5EDE0',
  paper: '#EFE4D2',
  green: '#1F4D3A',
  mustard: '#E8B23A',
  ink: '#12100E',
  red: '#C44536',
  white: '#FFFAF0',
} as const;

export const fonts = {
  hand: '"Caveat", cursive',
  body: '"Patrick Hand", cursive',
  num: '"Barlow Condensed", sans-serif',
} as const;

export const video = {
  width: 1080,
  height: 1920,
  fps: 30,
} as const;

/** Margenes seguros para la UI de Shorts. */
export const safe = {
  top: 150,
  bottom: 420,
  side: 72,
} as const;

export const grainSvg = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'>
     <filter id='n'>
       <feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/>
       <feColorMatrix type='saturate' values='0'/>
     </filter>
     <rect width='100%' height='100%' filter='url(#n)' opacity='0.55'/>
   </svg>`,
)}")`;
