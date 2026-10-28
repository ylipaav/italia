// Laattojen paikat puolikkaan laatan yksiköissä: laatta on 2 yksikköä leveä ja korkea.
// x = sarake, y = rivi, z = kerros. Laattoja on oltava parillinen määrä.

function grid(xs, ys, z) {
  const out = [];
  for (const y of ys) for (const x of xs) out.push({ x, y, z });
  return out;
}

// Pyramidi puhelimelle: 4×5 + 3×4 + 2×3 + 1×2 = 40 laattaa (20 paria) neljässä kerroksessa.
export const LAYOUT = [
  ...grid([0, 2, 4, 6], [0, 2, 4, 6, 8], 0),
  ...grid([1, 3, 5], [1, 3, 5, 7], 1),
  ...grid([2, 4], [2, 4, 6], 2),
  ...grid([3], [3, 5], 3),
];

// Litteä varapöytä sekoitukseen, jos jäljellä olevista paikoista ei saa ratkaistavaa.
export function flatLayout(count) {
  const out = [];
  for (let i = 0; i < count; i++) out.push({ x: (i % 4) * 2, y: Math.floor(i / 4) * 2, z: 0 });
  return out;
}
