import { readFile } from "node:fs/promises";
import ts from "typescript";

// Test local TypeScript without producing compiled files beside source code.
export async function resolve(specifier, context, next) {
  try { return await next(specifier, context); }
  catch (error) {
    if (!specifier.startsWith(".")) throw error;
    for (const extension of [".ts", ".tsx"]) {
      try { return await next(specifier + extension, context); } catch { /* Try the next extension. */ }
    }
    throw error;
  }
}
export async function load(url, context, next) {
  if (url.startsWith("file:") && /\.tsx?$/.test(url) && !url.includes("/node_modules/")) {
    const source = await readFile(new URL(url), "utf8");
    return { format: "module", shortCircuit: true, source: ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText };
  }
  return next(url, context);
}
