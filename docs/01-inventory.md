# 01 — Inventory Amplify and the repo

Do this **before** writing Helm values. Output is a filled inventory table (attach to the first migration PR or a dedicated inventory PR).

---

## Where to look

### AWS Amplify Console

For **each connected branch** and **“All branches”**:

- Environment variables (plain and “secret” in Amplify UI)
- Branch-specific overrides vs inherited defaults
- Build settings (`amplify.yml` commands, Node version)
- Custom headers (`customHttp.yml` or console equivalent)
- Rewrites / redirects
- Connected domain and which branch it maps to

### Repo

- `amplify.yml`, `customHttp.yml`
- `.env*` examples (never commit real `.env`)
- `process.env` / `NEXT_PUBLIC_*` usage: `git grep -E 'process\.env|NEXT_PUBLIC_'`
- Runtime-only vars vs build-time (`NEXT_PUBLIC_*` is baked into the client bundle at `next build`)

### Peer apps on EKS

Copy **classification patterns** from sibling `deploy/k8s/*/web/values.yaml` in the same product area (e.g. Marketplace, Avbob)—not necessarily the same **values**.

---

## Classify each key

| Class | Goes where | Examples (generic) |
| --- | --- | --- |
| **Plain config** | `deployment.env.config` in values YAML | `PORT`, `YOYO_APP_ORIGIN`, public API base URLs, `COGNITO_CLIENT_ID` (public app client id) |
| **Secret** | SM + `deployment.env.secret` + `externalSecret.data` (property name only in git) | API passwords, `BETTER_AUTH_SECRET`, private API keys |
| **Build arg** | `tekton.buildargs` + Dockerfile `ARG` | `NEXT_PUBLIC_*`, `NODE_OPTIONS` for Kaniko heap |
| **Drop** | Nowhere | Amplify-only keys with zero `git grep` hits; deprecated OAuth paths not registered in Hosted Auth |

### Rules

1. **UNKNOWN** — If you cannot read Amplify or prod truth, mark `UNKNOWN` and ask the ticket owner. **Never guess** URLs, client IDs, or bucket names.
2. **Already in git on a sister app** — Often safe as plain config in values (still confirm for your app).
3. **Not on sister apps** — Default to Secrets Manager unless it is clearly public (`NEXT_PUBLIC_*`, Cognito client id).
4. **Optional app env** — If Amplify did not set it and code treats empty as OK, omit from chart (wiplatform: `CONFIG_SERVER_USER_ROLE` — PR #153 / #145).
5. **Legacy Amplify “secret” env** — Re-home to SM; do not echo into `.env.production` in Tekton.

---

## Inventory table template

Copy into your PR or `deploy/INVENTORY.md` (names only; no values in git):

| Env var / setting | Source (branch / All branches) | Used in code? | Class (config / secret / build arg / drop) | Target (values path or SM property) | Notes |
| --- | --- | --- | --- | --- | --- |
| `YOYO_APP_ORIGIN` | All branches | yes | config | `deployment.env.config` | Must match public ingress host |
| `BETTER_AUTH_SECRET` | INT override | yes | secret | `externalSecret` → `BETTER_AUTH_SECRET` | |
| `NEXT_PUBLIC_FOO` | All branches | yes | build arg | `tekton.buildargs` | Also Dockerfile `ARG` |
| `GLOBAL_AUTH_*` | PROD only | no | drop | — | Zero references on main dev branch |
| `<UNKNOWN>` | UNKNOWN | | UNKNOWN | — | Ask: owner + ticket |

### Amplify-specific rows (non-env)

| Item | Source | Action in EKS migration |
| --- | --- | --- |
| `customHttp.yml` headers | Amplify | Move to app (`response-headers` + `next.config`) — [02-app-prep](02-app-prep.md) |
| `amplify.yml` build | Amplify | Replaced by Dockerfile + Tekton |
| Amplify SSR/compute | Console | Replaced by pod `resources` in values |
| S3 static keys in Amplify | Console | Prefer **IRSA**; drop static keys from secret |
| Domain / CDN | Console | Platform ALB + DNS — [04-rollout](04-rollout.md) |

---

## wiplatform examples (classification only)

From PR [#145](https://github.com/yoyogroup/wiplatform-portal-nextjs/pull/145) / [#153](https://github.com/yoyogroup/wiplatform-portal-nextjs/pull/153):

- **Cognito-only on EKS (INT/dev path):** legacy `YOYO_OAUTH_CLIENT_ID` + `/auth/callback` **not** migrated when Hosted Auth only registers `/auth/cognito-callback`.
- **PROD pre-#137 exception:** temporary legacy OAuth + datamart keys in SM (#153) — document as **temporary** until feature release catches up.
- **Maps:** `NEXT_PUBLIC_GOOGLE_MAPS_*` = build args; Map ID can be config-like; API key still goes through build args (browser-visible).

---

## Exit criteria

- [ ] Table complete for INT and PROD (or explicit “PROD UNKNOWN” with ticket)
- [ ] Every secret has SM property name listed for `externalSecret.data`
- [ ] Every dropped Amplify var confirmed with `git grep`
- [ ] Platform tickets filed for IRSA, ingress, DNS, egress (if app calls on-prem URLs)