# 03 — Platform wiring (cloud_catalog + AWS)

App repo values are **inert** until `cloud_catalog` registers Argo + Tekton. **Secrets Manager** and most rollout checks are **Dev** work in the app repo (see [02-app-prep](02-app-prep.md), [04-rollout](04-rollout.md)); this doc covers **catalog PRs** and shared AWS patterns.

---

## cloud_catalog PR split (#361 / #362 / #365)

| PR | What | `disable` typical |
| --- | --- | --- |
| **[#361](https://github.com/yoyogroup/cloud_catalog/pull/361)** (INT scaffold) | Argo app + **Tekton** entry + **commented** ingress placeholder | Argo **`true`**, Tekton **`false`** |
| **[#362](https://github.com/yoyogroup/cloud_catalog/pull/362)** (INT enable) | Flip workload Argo only | Argo **`false`** after real image tag + SM |
| **[#365](https://github.com/yoyogroup/cloud_catalog/pull/365)** (PROD scaffold) | PROD Argo + Tekton (mirror #361) | Argo **`true`**, Tekton **`false`** |

**Why Tekton before Argo:** First build can run while image tag is still `bootstrap-pending`; enabling Argo too early causes ImagePullBackOff (#361). Tekton `disable: false` wires the shared EventListener so pushes to the app branch start PipelineRuns.

### Argo application (workload)

**INT:** `deploy/intergration/eu-west-1/applications.yaml`  
**PROD:** `deploy/production/eu-west-1/za-platform-prod/applications.yaml`

Copy a peer block (e.g. `yoyoDealsMarketplaceWeb` / `wiplatformPortalNextjsWeb`):

- Chart **`yoyo-app`** — use the **same version** as the peer entry on `main` (do not hardcode; read current catalog).
- `valueFileRepo` → app git URL; `valueFileRepotargetRevision` → branch Argo watches (`development`, `integration`, `master`, or `main` per repo).
- `valuesFile`: `$values/deploy/k8s/int/web/values.yaml` (PROD: `$values/deploy/k8s/prod/web/values.yaml`) — same `$values/` prefix as [#361](https://github.com/yoyogroup/cloud_catalog/pull/361) / [#365](https://github.com/yoyogroup/cloud_catalog/pull/365).
- Namespace INT: e.g. `<INT_NAMESPACE>` (wiplatform: `int-eu-west-1-intergrations`).
- Namespace PROD: e.g. `<PROD_NAMESPACE>` (wiplatform #365: `prod-eu-west-1-intergrations`).

Flip `disable: false` only when SM keys exist, ExternalSecret can sync, and `deployment.image.tag` is a real ECR tag ([#362](https://github.com/yoyogroup/cloud_catalog/pull/362)).

### Who

- Dev opens `cloud_catalog` PR; **platform lead** reviews/merges (team norm).

---

## Tekton registration (`pipelines.yaml`)

Tekton is **not** only in `applications.yaml` — register the **`yoyo-app-tekton`** Application in:

| Env | File |
| --- | --- |
| INT | `deploy/intergration/pipelines/pipelines.yaml` |
| PROD | `deploy/production/pipelines/pipelines.yaml` |

Copy the nearest peer `*WebTekton` entry (e.g. `yoyoDealsMarketplaceWebTekton` on `main`):

| Field | Mirror from peer |
| --- | --- |
| Chart | `yoyo-app-tekton` (same **version** as peer on `main`) |
| `helmValues.eventListener.mode` | **`shared`** (INT/PROD EventListener pool) |
| App repo + values path | Same as workload Argo entry |
| `disable` on Tekton app | **`false`** when ready for first build (even while workload Argo stays `disable: true`) |
| Application `name` | Keep Helm release name ≤ 53 chars (see comments in `pipelines.yaml` for long names) |

Tekton reads build settings from the app repo values embedded in the catalog entry (`deploy/k8s/*/web/values.yaml` → `tekton.*` block).

**Trigger:** push to `tekton.branch` or `/cloud-deploy <APP_NAME>-<REGION>-<env>` in Slack.

---

## Commented ingress (#361)

Optional first PR appends a **commented** host block under:

`deploy/intergration/eu-west-1/ingress/values.yaml` → `ingresses:`

Leave it commented until Platform has certs, ALB group, and DNS plan (wiplatform: infra ticket + no early external-dns steal). PROD forward/ingress may be a separate catalog PR ([#365](https://github.com/yoyogroup/cloud_catalog/pull/365) notes [#364](https://github.com/yoyogroup/cloud_catalog/pull/364) for prod ingress).

---

## ECR repository

Created by Tekton task **`create-aws-resources`** via Sceptre (vars from app `tekton.sceptrecommands`):

```text
sceptre --var ServiceName=<APP_NAME>-<REGION>-<ENV> \
  --var region=<AWS_REGION> \
  --var template_bucket_name=<PLATFORM_TEKTON_CF_BUCKET> \
  launch <ENV>/svc/services/ecr -y
```

- Confirm `template_bucket_name` and `launch` path from a peer app’s values file.
- Kaniko pushes to `<APP_NAME>-<REGION>-<ENV>` and cache repo `…/cache`.
- Wrong `ServiceName` → push denied (wiplatform [#148](https://github.com/yoyogroup/wiplatform-portal-nextjs/pull/148)).

---

## Tekton pipeline (app repo `tekton:` block)

| Field | Typical |
| --- | --- |
| `tekton.branch` | INT branch per repo; PROD: `master` or `main` |
| `tekton.valuesfile` | `deploy/k8s/{int,prod}/web/values.yaml` |
| `tekton.tasks` | `fetch-repository`, `create-aws-resources`, `build-image`, `imagetag-updater` |
| `tekton.buildResources` | request 2Gi, limit 4Gi |
| `tekton.awsaccountid` | **Quoted string** |

---

## Secrets Manager (Dev — not a cloud_catalog change)

Pattern: `<ENV>/pl-<ENV>-proxy/<APP_NAME>`. Create keys listed in `externalSecret.data` before flipping Argo `disable: false`. Details: [02-app-prep](02-app-prep.md), [04-rollout](04-rollout.md).

---

## imagetag-updater

Bot commits `deployment.image.tag` to `tekton.branch`. Branch protection needs `ciyoyogroup/imagetag-updater` exception (wiplatform CPS-1876); until then, manual tag PRs.

---

## Platform tickets (typical)

| Work | Track via |
| --- | --- |
| IRSA, S3, ingress, DNS | Infra Jira |
| imagetag-updater ruleset | CPS / Platform |
| Legacy 301 redirects | Ingress catalog PR |

---

## PR checklist (`cloud_catalog` only)

- [ ] Workload + Tekton entries added; chart versions match current peer on `main`
- [ ] Workload Argo `disable: true` on first scaffold unless image + tag already valid
- [ ] Tekton `disable: false` when builds should run
- [ ] `valueFileRepotargetRevision` matches app `tekton.branch`
- [ ] Ingress left commented until Platform ready (#361)