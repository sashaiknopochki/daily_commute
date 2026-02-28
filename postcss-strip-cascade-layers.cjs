/**
 * PostCSS plugin: strip CSS @layer wrappers for iOS 12 / Safari < 15.4.
 *
 * Tailwind v4 wraps all generated CSS in @layer theme / @layer base /
 * @layer utilities blocks. Safari 12 treats @layer as an unknown at-rule
 * and silently discards the entire block — so every Tailwind class is
 * invisible on iOS 12, producing naked unstyled HTML.
 *
 * Unwrapping is safe: Tailwind utility classes (.flex, .text-xl …) are
 * class selectors (specificity 0,1,0) which naturally win over the
 * element-level base resets (specificity 0,0,1 for tags, 0,0,0 for *),
 * so the visual result is identical with or without the layer wrappers.
 */
function stripCascadeLayers() {
  return {
    postcssPlugin: "postcss-strip-cascade-layers",
    AtRule: {
      layer(node) {
        if (node.nodes) {
          node.replaceWith(node.nodes); // @layer foo { ... } → ...
        } else {
          node.remove(); // @layer base, utilities; ordering stmts → drop
        }
      },
    },
  };
}
stripCascadeLayers.postcss = true;

module.exports = stripCascadeLayers;
