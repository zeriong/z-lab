// Resolves the API token for a client instance.

export function resolveToken(options = {}) {
  if (typeof options.token === "string" && options.token.length > 0) {
    return options.token;
  }
  throw new Error("resolveToken: pass { token } explicitly");
}
