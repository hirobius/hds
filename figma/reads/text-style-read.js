// Read-only use_figma script (hds#302). Paste its JSON result into a file and
// run scripts/figma-text-style-verification.mjs on it.
const out = [];
let total = 0,
  unstyled = 0;
for (const page of figma.root.children) {
  await page.loadAsync();
  const comps = page
    .findAllWithCriteria({ types: ['COMPONENT_SET', 'COMPONENT'] })
    .filter((c) => c.type === 'COMPONENT_SET' || c.parent.type !== 'COMPONENT_SET');
  for (const c of comps) {
    const t = c.findAllWithCriteria({ types: ['TEXT'] });
    let u = 0,
      mixed = 0;
    for (const n of t) {
      const s = n.textStyleId;
      if (s === figma.mixed) {
        mixed++;
        u++;
      } else if (!s) u++;
    }
    total += t.length;
    unstyled += u;
    if (u > 0)
      out.push({ page: page.name, id: c.id, name: c.name, text: t.length, unstyled: u, mixed });
  }
}
out.sort((a, b) => b.unstyled - a.unstyled);
return {
  totalTextLayers: total,
  textLayersWithoutStyle: unstyled,
  componentsWithUnstyledText: out,
};
