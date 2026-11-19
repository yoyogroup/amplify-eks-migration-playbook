// Template: src/app/api/health/route.ts
// Wire probes in deploy/k8s/*/web/values.yaml to /api/health

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ status: "ok" });
}