export function createSourceMeta(warnings: string[] = []) {
  return {
    source: "firestore" as const,
    sourceLabel: "Firestore live",
    sourceMessage: "Course Hub data was loaded through server-side Firebase Admin SDK routes.",
    warnings
  };
}
