// Extracts the script payload and named sections from 3dsandbox.html verbatim,
// so Node tests run the *actual shipped* logic (same THREE r128 as the game).
import fs from 'fs';
export const html = fs.readFileSync(new URL('../3dsandbox.html', import.meta.url), 'utf8');
export const script = html.split('<script>')[1].split('</' + 'script>')[0];

export function section(startMarker, endMarker) {
  const i = script.indexOf(startMarker);
  if (i < 0) throw new Error('section start not found: ' + startMarker);
  const j = script.indexOf(endMarker, i);
  if (j < 0) throw new Error('section end not found: ' + endMarker);
  return script.slice(i, j);
}
