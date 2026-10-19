import fs from "fs";
import path from "path";

export async function GET() {
  const file = path.join(process.cwd(), "openapi.yaml");
  const yaml = fs.readFileSync(file, "utf8");

  return new Response(yaml, {
    headers: {
      "Content-Type": "text/yaml",
    },
  });
}