import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

// Loaded once at start-up; Remotion waits for them before rendering a frame.
const faces = [
  {family: 'Anton', url: 'fonts/Anton-Regular.ttf'},
  {family: 'Unbounded', url: 'fonts/Unbounded.ttf', weight: '200 900'},
  {family: 'JetBrains Mono', url: 'fonts/JetBrainsMono.ttf', weight: '100 800'},
  {family: 'Inter', url: 'fonts/Inter.ttf', weight: '100 900'},
  {family: 'Tajawal', url: 'fonts/Tajawal-ExtraBold.ttf', weight: '800'},
  {family: 'Cairo', url: 'fonts/Cairo-Bold.ttf', weight: '700'},
];

export const fontsLoaded = Promise.all(
  faces.map((face) => loadFont({family: face.family, url: staticFile(face.url), weight: face.weight})),
);
