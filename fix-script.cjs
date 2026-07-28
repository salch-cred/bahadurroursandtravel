// DISABLED — this one-off migration script previously replaced the correct local
// package photos (assets/images/packages/*.jpg, etc.) with generic Unsplash stock
// photos across the JS/TS source files. That is the root cause of packages showing
// the wrong/generic images on the live site. The damage has been reverted and the
// live database images have been corrected (see api/seed.ts + Vercel package data).
//
// Do NOT re-run this script — it will re-introduce the same image bug.
console.log('fix-script.cjs is disabled. See git history for details.');
