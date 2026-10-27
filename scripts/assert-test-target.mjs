import { pathToFileURL } from "node:url";

const allowedOrigins = new Set([
  "http://127.0.0.1:3100",
  "http://localhost:3100",
]);

/** Validate a test-server root before making any requests. This is not an OS network sandbox. */
export function assertTestTarget(value) {
  if (typeof value !== "string" || !value || value !== value.trim()) {
    throw new Error("Test target must be an explicit local URL without whitespace.");
  }

  let target;
  try {
    target = new URL(value);
  } catch {
    throw new Error("Test target must be a valid absolute local URL.");
  }

  if (
    !allowedOrigins.has(target.origin) ||
    target.username ||
    target.password ||
    target.pathname !== "/" ||
    target.search ||
    target.hash ||
    !/^http:\/\/(localhost|127\.0\.0\.1):3100\/?$/.test(value)
  ) {
    throw new Error(
      "Test target must be http://127.0.0.1:3100/ or http://localhost:3100/ with no credentials, path, query, or fragment.",
    );
  }

  return target.href;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    console.log(assertTestTarget(process.argv[2] ?? "http://127.0.0.1:3100/"));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
