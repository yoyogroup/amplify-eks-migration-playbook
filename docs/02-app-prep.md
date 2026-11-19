# 02 — App repo preparation

Target layout (wiplatform PR #142 / #145):

```text
Dockerfile
.dockerignore
deploy/
  README.md
  k8s/int/web/values.yaml
  k8s/prod/web/values.yaml
src/app/api/health/route.ts
src/lib/security/response-headers.ts   # or your path
next.config.*                        # standalone + headers when DOCKER_BUILD=1
```

Start from [templates/](../templates/).

---

## Dockerfile

Patterns from wiplatform + Avbob/Deals:

- **Multi-stage:** `builder` (Node Alpine) → `runner` (minimal Alpine + `node` binary only)
- **Pinned Node:** match `.nvmrc` / `engines` (wiplatform moved to **Node 24** in PR #154)
- **`DOCKER_BUILD=1`:** enables `output: 'standalone'` in `next.config`
- **Build:** `npm ci` → `next build --webpack` (not Turbopack default under Tekton **4Gi** — OOM in wiplatform Dockerfile comments)
- **`NEXT_WEBPACK_PARALLELISM=1`**, builder `NODE_OPTIONS=--max-old-space-size=1536` (Tekton limit headroom for Kaniko)
- **Offline build:** self-host fonts / no runtime fetch to Google Fonts in Docker (wiplatform `layout.tsx` in PR #142)
- **Runner:** user **1000**, port **3000**, `CMD ["node", "server.js"]`

---

## Health route

- Path: **`GET /api/health`** → `200` JSON `{ "status": "ok" }`
- `export const dynamic = "force-dynamic"` so probes are not statically optimized away
- Align **liveness/readiness** in values YAML with this path (see [templates/values-int.yaml](../templates/values-int.yaml))
- If middleware/proxy gates CSRF, **exempt** `/api/health` (wiplatform `proxy.test.ts` in PR #142)

---

## Security headers (from `customHttp.yml`)

1. Port header definitions to `buildStaticSecurityHeaders()` ([templates/response-headers.ts](../templates/response-headers.ts))
2. Wire `headers()` in `next.config` to call that helper
3. Keep **nonce CSP** in middleware/proxy if you already have it (do not duplicate full CSP in `customHttp.yml`)
4. **CI check:** docker smoke `curl -fsSI /login` and grep `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Strict-Transport-Security` (wiplatform CI in PR #142, #155)

---

## `deploy/k8s/*/web/values.yaml`

Follow **yoyo-deals-marketplace** / **yoyo-avbob** shape:

| Section | Notes |
| --- | --- |
| `name` / `project` | Kubernetes release name; must be unique in target namespace (wiplatform: `wiplatform-portal-nextjs` not `wiplatform-portal` — CPS-1881) |
| `deployment.image.repository` | `<AWS_ACCOUNT>.dkr.ecr.<REGION>.amazonaws.com/<APP_NAME>-<REGION>-<ENV>` |
| `deployment.image.tag` | `bootstrap-pending` until first Tekton build; then SHA from imagetag-updater |
| `deployment.env.config` | Plain env from inventory |
| `deployment.env.secret` | Maps env var → K8s secret name (usually `name:` chart release) |
| `externalSecret` | `awsSecretName: <env>/pl-<env>-proxy/<APP_NAME>` |
| `serviceAccount` + IRSA annotation | Placeholder ARN until Platform sets role — **YOYOINFRA-style ticket** |
| `targetGroupBinding.enabled: false` | When Platform shared ingress owns routing (wiplatform + Deals INT) |
| `job.enabled` | `false` if no DB migration hook (wiplatform); `true` if Marketplace-style migrate Job |
| `tekton` | `branch`, `valuesfile`, `buildargs`, `sceptrecommands`, Kaniko resources **2Gi request / 4Gi limit** |

### ECR naming (critical)

Tekton `servicename` = `{{ .Values.name }}-{{ .Values.env.region }}-{{ .Values.env.environment }}` (cloud_catalog `yoyo-app-tekton`).

`deployment.image.repository`, `tekton.sceptrecommands` `ServiceName`, and optional `job.image.repository` **must match**.  
Mismatch caused Kaniko push failures — fixed in wiplatform PR [#148](https://github.com/yoyogroup/wiplatform-portal-nextjs/pull/148).

### `NEXT_PUBLIC_*`

- List each as **separate** `tekton.buildargs` entry (`yoyo-app-tekton` ≥ 0.5.0 forwards all entries)
- Mirror as Dockerfile `ARG` / `ENV` in builder stage
- Do **not** put `NEXT_PUBLIC_*` under `deployment.env.config` (no effect on client bundle)

### S3 / AWS SDK

- Prefer **IRSA** on ServiceAccount; omit `S3_ACCESS_KEY_*` from secrets when code uses default credential chain (wiplatform PR #145 `buildS3ClientConfig`)

---

## `deploy/README.md`

Short operator doc in the app repo:

- INT vs PROD table (host, SM path, ECR name, Tekton branch)
- Secret **key names** only
- imagetag-updater / branch protection note
- Link to Platform tickets (ingress, IRSA, DNS)

---

## PR checklist (app prep)

- [ ] `npm run lint` / `typecheck` / `test` green
- [ ] `docker build` + health + header smoke (CI job recommended)
- [ ] Values YAML parses; no secret values in git
- [ ] `helm template` (optional, with chart from JFrog/cloud_catalog)
- [ ] `name` collision check with existing Argo apps in same namespace