import { promises as fs } from "node:fs";

export async function removeFile(file: string) {
  for (let attempt = 0; ; attempt++) {
    try { await fs.unlink(file); return; }
    catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") return;
      if (attempt >= 5 || !["EPERM", "EACCES", "EBUSY"].includes(code || "")) throw error;
      await new Promise(resolve => setTimeout(resolve, 25 * (attempt + 1)));
    }
  }
}
