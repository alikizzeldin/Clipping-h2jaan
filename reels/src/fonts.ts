import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

// Loaded once at start-up; Remotion waits for them before rendering a frame.
// All are open-licence fonts (licences in public/fonts/licenses). A variable font is also
// registered under a "<Family> <Weight>" name pinned to one weight, so a look can use it as a
// heavy display face without every scene having to set fontWeight.
const faces: {family: string; url: string; weight?: string}[] = [
  // the classic look
  {family: 'Anton', url: 'fonts/Anton-Regular.ttf'},
  {family: 'Unbounded', url: 'fonts/Unbounded.ttf', weight: '200 900'},
  {family: 'JetBrains Mono', url: 'fonts/JetBrainsMono.ttf', weight: '100 800'},
  {family: 'Inter', url: 'fonts/Inter.ttf', weight: '100 900'},
  {family: 'Tajawal', url: 'fonts/Tajawal-ExtraBold.ttf', weight: '800'},
  {family: 'Cairo', url: 'fonts/Cairo-Bold.ttf', weight: '700'},
  {family: 'Permanent Marker', url: 'fonts/PermanentMarker.woff2'},
  // display faces for the daily looks
  {family: 'Bebas Neue', url: 'fonts/BebasNeue-Regular.ttf'},
  {family: 'Archivo Black', url: 'fonts/ArchivoBlack-Regular.ttf'},
  {family: 'Bungee', url: 'fonts/Bungee-Regular.ttf'},
  {family: 'Monoton', url: 'fonts/Monoton-Regular.ttf'},
  {family: 'Righteous', url: 'fonts/Righteous-Regular.ttf'},
  {family: 'Pacifico', url: 'fonts/Pacifico-Regular.ttf'},
  {family: 'Black Ops One', url: 'fonts/BlackOpsOne-Regular.ttf'},
  {family: 'Rubik Mono One', url: 'fonts/RubikMonoOne-Regular.ttf'},
  {family: 'Russo One', url: 'fonts/RussoOne-Regular.ttf'},
  {family: 'Barlow Condensed ExtraBold', url: 'fonts/BarlowCondensed-ExtraBold.ttf'},
  {family: 'Playfair Display Black', url: 'fonts/PlayfairDisplay-VF.ttf', weight: '900'},
  {family: 'Big Shoulders Black', url: 'fonts/BigShouldersDisplay-VF.ttf', weight: '900'},
  {family: 'Oswald Bold', url: 'fonts/Oswald-VF.ttf', weight: '700'},
  {family: 'Syne ExtraBold', url: 'fonts/Syne-VF.ttf', weight: '800'},
  {family: 'Space Grotesk Bold', url: 'fonts/SpaceGrotesk-VF.ttf', weight: '700'},
  // mono / typewriter / pixel
  {family: 'VT323', url: 'fonts/VT323-Regular.ttf'},
  {family: 'Special Elite', url: 'fonts/SpecialElite-Regular.ttf'},
  {family: 'Press Start 2P', url: 'fonts/PressStart2P-Regular.ttf'},
  {family: 'IBM Plex Mono Bold', url: 'fonts/IBMPlexMono-Bold.ttf'},
  {family: 'Space Mono Bold', url: 'fonts/SpaceMono-Bold.ttf'},
  // Arabic
  {family: 'Lalezar', url: 'fonts/Lalezar-Regular.ttf'},
  {family: 'Rakkas', url: 'fonts/Rakkas-Regular.ttf'},
  {family: 'Reem Kufi Bold', url: 'fonts/ReemKufi-VF.ttf', weight: '700'},
  {family: 'Changa Bold', url: 'fonts/Changa-VF.ttf', weight: '700'},
  {family: 'El Messiri Bold', url: 'fonts/ElMessiri-VF.ttf', weight: '700'},
  {family: 'Marhey Bold', url: 'fonts/Marhey-VF.ttf', weight: '700'},
  {family: 'Noto Kufi Arabic Black', url: 'fonts/NotoKufiArabic-VF.ttf', weight: '900'},
];

export const fontsLoaded = Promise.all(
  faces.map((face) => loadFont({family: face.family, url: staticFile(face.url), weight: face.weight})),
);
