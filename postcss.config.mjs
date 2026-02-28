// Next.js's PostCSS loader only accepts string plugin names or [string, options]
// tuples — raw plugin objects are rejected. The custom strip-cascade-layers
// plugin lives in a separate .cjs file so it can be resolved by relative path.
export default {
  plugins: [
    "@tailwindcss/postcss",
    "./postcss-strip-cascade-layers.cjs",
  ],
};
