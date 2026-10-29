// Laattojen paikat puolikkaan laatan yksiköissä: laatta on 2 yksikköä leveä ja korkea.
// x = sarake, y = rivi, z = kerros. Laattoja on oltava parillinen määrä, ja pöydän pitää
// mahtua pystysuuntaiselle puhelimen näytölle (leveys 8 yksikköä = 4 laattaa).

function grid(xs, ys, z) {
  const out = [];
  for (const y of ys) for (const x of xs) out.push({ x, y, z });
  return out;
}

const BASE_4x5 = grid([0, 2, 4, 6], [0, 2, 4, 6, 8], 0);
const BASE_4x6 = grid([0, 2, 4, 6], [0, 2, 4, 6, 8, 10], 0);

export const LAYOUTS = [
  {
    name: 'Pyramidi',
    tiles: [
      ...BASE_4x5,
      ...grid([1, 3, 5], [1, 3, 5, 7], 1),
      ...grid([2, 4], [2, 4, 6], 2),
      ...grid([3], [3, 5], 3),
    ],
  },
  {
    // Kaksi kolmikerroksista tornia vastakkaisissa kulmissa.
    name: 'Kaksi tornia',
    tiles: [
      ...BASE_4x6,
      ...grid([1, 3], [1, 3], 1), ...grid([2], [1, 3], 2),
      ...grid([3, 5], [7, 9], 1), ...grid([4], [7, 9], 2),
    ],
  },
  {
    // Neljä pilaria kulmissa ja matala kumpu keskellä.
    name: 'Neljä pilaria',
    tiles: [
      ...BASE_4x6,
      ...[1, 2, 3].flatMap((z) => grid([0, 6], [0, 10], z)),
      ...grid([2, 4], [4, 6], 1),
      ...grid([3], [5], 2),
      { x: 3, y: 5, z: 3 },
    ],
  },
  {
    // Kolme harjannetta vaakasuunnassa: laaja ja matala.
    name: 'Harjanteet',
    tiles: [
      ...BASE_4x6,
      ...grid([1, 3, 5], [1, 5, 9], 1),
      ...grid([2, 4], [1, 9], 2),
      { x: 3, y: 5, z: 2 },
    ],
  },
  {
    // Portaat, jotka nousevat alakulmasta ylös oikealle.
    name: 'Portaat',
    tiles: [
      ...BASE_4x6,
      ...grid([2, 4, 6], [0, 2, 4, 6, 8], 1),
      ...grid([4, 6], [0, 2, 4, 6], 2),
      ...grid([6], [0, 2, 4], 3),
    ],
  },
];

for (const l of LAYOUTS) {
  if (l.tiles.length % 2) throw new Error(`Pöydässä "${l.name}" on pariton määrä laattoja: ${l.tiles.length}`);
}

export function pickLayout(rand) {
  return LAYOUTS[Math.floor(rand() * LAYOUTS.length)];
}

// Litteä varapöytä sekoitukseen, jos jäljellä olevista paikoista ei saa ratkaistavaa.
export function flatLayout(count) {
  const out = [];
  for (let i = 0; i < count; i++) out.push({ x: (i % 4) * 2, y: Math.floor(i / 4) * 2, z: 0 });
  return out;
}
