import fs from "fs";
import path from "path";
import HomeClient from "./home-client";

export default function HomePage() {
  const htmlFile = fs.readFileSync(
    path.join(process.cwd(), "matpilot_homepage.html"),
    "utf-8"
  );

  const styleMatch = htmlFile.match(/<style>([\s\S]*?)<\/style>/);
  const bodyMatch = htmlFile.match(/<body[^>]*>([\s\S]*?)<script>/);
  const scriptMatch = htmlFile.match(/<script>([\s\S]*?)<\/script>/);

  const styles = styleMatch?.[1] || "";
  const bodyHtml = bodyMatch?.[1] || "";
  const scriptJs = scriptMatch?.[1] || "";

  const modifiedBody = bodyHtml.replace(
    '<!-- Primary Action Button -->',
    `<a href="/login" class="px-5 py-2.5 rounded-lg border border-matBorder bg-matSurface hover:bg-matElevated text-white font-medium text-sm transition-all duration-300 hover:border-matOrange hidden sm:flex items-center gap-2">Login</a>\n            <!-- Primary Action Button -->`
  );

  return (
    <HomeClient styles={styles} html={modifiedBody} script={scriptJs} />
  );
}
