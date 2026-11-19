// Template: src/lib/security/response-headers.ts
// Port values from Amplify customHttp.yml — then delete customHttp.yml in cleanup (05-cleanup.md).
// CSP with nonce stays in middleware/proxy if you use it.

export const REFERRER_POLICY = "strict-origin-when-cross-origin";
export const X_CONTENT_TYPE_OPTIONS = "nosniff";
export const X_FRAME_OPTIONS = "DENY";
export const HSTS_HEADER_VALUE = "max-age=63072000; includeSubDomains; preload";

export type SecurityHeader = { key: string; value: string };

export function buildStaticSecurityHeaders(): SecurityHeader[] {
  return [
    { key: "X-Frame-Options", value: X_FRAME_OPTIONS },
    { key: "X-Content-Type-Options", value: X_CONTENT_TYPE_OPTIONS },
    { key: "Referrer-Policy", value: REFERRER_POLICY },
    { key: "Strict-Transport-Security", value: HSTS_HEADER_VALUE },
  ];
}

// next.config: async headers() { return [{ source: "/:path*", headers: buildStaticSecurityHeaders() }]; }