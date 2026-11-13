import {continueRender, delayRender, staticFile} from 'remotion';

/**
 * Carga las tipografias locales (OFL) antes de renderizar.
 * Se ejecuta una sola vez al evaluar el bundle.
 */
const handle = delayRender('Cargando tipografias');

const faces: FontFace[] = [
  new FontFace('Caveat', `url(${staticFile('fonts/Caveat.ttf')}) format('truetype')`, {
    weight: '400 700',
    display: 'block',
  }),
  new FontFace('Patrick Hand', `url(${staticFile('fonts/PatrickHand-Regular.ttf')}) format('truetype')`, {
    weight: '400',
    display: 'block',
  }),
  new FontFace('Barlow Condensed', `url(${staticFile('fonts/BarlowCondensed-Bold.ttf')}) format('truetype')`, {
    weight: '700',
    display: 'block',
  }),
];

Promise.all(faces.map((face) => face.load()))
  .then((loaded) => {
    const fontSet = document.fonts as unknown as {add: (face: FontFace) => void};
    loaded.forEach((face) => fontSet.add(face));
    continueRender(handle);
  })
  .catch((error) => {
    console.error('No se pudieron cargar las tipografias', error);
    continueRender(handle);
  });
