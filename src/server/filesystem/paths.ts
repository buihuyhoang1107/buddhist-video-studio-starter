import path from "node:path";

export const projectRoot = process.cwd();
export const tempRoot = path.join(projectRoot, "temp");
export const outputRoot = path.join(projectRoot, "output");
export const referencesRoot = path.join(projectRoot, "references", "stories");
export const userAssetsRoot = path.join(projectRoot, "user-assets");

export function jobDir(jobId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId)) {
    throw new Error("Invalid job ID");
  }
  return path.join(tempRoot, jobId);
}
