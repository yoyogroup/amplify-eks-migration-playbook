# Amplify → EKS migration playbook

Reusable checklist for moving a Yoyo **Next.js** (or similar containerized) app from **AWS Amplify** to **EKS**, with **Tekton** (Kaniko build → ECR) and **Argo CD** (deploy via `cloud_catalog` + `yoyo-app` Helm values in the app repo).

**Reference migration:** [yoyogroup/wiplatform-portal-nextjs](https://github.com/yoyogroup/wiplatform-portal-nextjs) (PRs [#145](https://github.com/yoyogroup/wiplatform-portal-nextjs/pull/145), [#148](https://github.com/yoyogroup/wiplatform-portal-nextjs/pull/148), [#153](https://github.com/yoyogroup/wiplatform-portal-nextjs/pull/153), [#154](https://github.com/yoyogroup/wiplatform-portal-nextjs/pull/154), [#155](https://github.com/yoyogroup/wiplatform-portal-nextjs/pull/155)).

**Peer patterns:** [yoyo-deals-marketplace-nextjs](https://github.com/yoyogroup/yoyo-deals-marketplace-nextjs), [yoyo-avbob-nextjs](https://github.com/yoyogroup/yoyo-avbob-nextjs) `deploy/` + `Dockerfile`.

---

## What you are building

```text
git push <tekton-branch>
        │
        ▼
Tekton: Sceptre (ECR) → Kaniko (Dockerfile) → ECR
        │
        ▼
imagetag-updater → deploy/k8s/*/web/values.yaml (image tag commit)
        │
        ▼
Argo CD (cloud_catalog app entry) → yoyo-app chart → Pods :3000
        │
        ▼
Platform ingress/DNS → public host (replaces Amplify/CloudFront)
```

Runtime env: **Helm `deployment.env.config`** (plain) + **ExternalSecret** (Secrets Manager keys listed in git only).  
Build-time client config: **`NEXT_PUBLIC_*`** via Tekton `tekton.buildargs` (and matching Dockerfile `ARG`s).

---

## Recommended PR order (app repo)

| Step | Doc | Typical PR focus | Who |
| --- | --- | --- | --- |
| 1 | [01-inventory](docs/01-inventory.md) | Inventory spreadsheet in PR description; no code yet | Dev |
| 2 | [02-app-prep](docs/02-app-prep.md) | Dockerfile, health route, headers, `deploy/k8s/*/web/values.yaml` | Dev |
| 3 | [03-platform](docs/03-platform.md) | **Separate PR(s)** in `cloud_catalog`: Argo app + Tekton; SM secrets; IRSA ticket | Dev opens; **platform lead approves** |
| 4 | ECR name fix (if needed) | Align `deployment.image.repository` + `tekton.sceptrecommands` `ServiceName` with `${name}-${region}-${env}` | Dev ([wiplatform #148](https://github.com/yoyogroup/wiplatform-portal-nextjs/pull/148)) |
| 5 | [04-rollout](docs/04-rollout.md) | INT deploy, soak, PROD, DNS cutover | Dev + Platform |
| 6 | [05-cleanup](docs/05-cleanup.md) | Remove `amplify.yml`, `customHttp.yml`, Amplify docs | Dev (after soak) |

**Rule:** One concern per PR where possible. **Never commit secret values** — only property names in `externalSecret.data`.

---

## Who does what

| Task | Owner |
| --- | --- |
| Inventory Amplify env (all branches + overrides) | Dev |
| App repo: Docker, health, headers, Helm values | Dev |
| Create Secrets Manager secret (`<env>/pl-<env>-proxy/<APP_NAME>`) with keys from values | Dev (CPS); values **names only** in git |
| IRSA, ingress, DNS, bucket policies | Platform (e.g. infra Jira) |
| `cloud_catalog` Argo `disable: false`, Tekton registration | Dev PR; **platform lead** review/merge |
| Tekton build trigger (`/cloud-deploy` in Slack) | Dev / on-call |
| imagetag-updater branch ruleset exception | Platform / CPS |

---

## Review checklist (per PR)

Use the matching doc for detail; at review time confirm:

- [ ] **Inventory:** Every env var classified (config / secret / build arg / drop). No guessed values (`UNKNOWN` flagged).
- [ ] **App prep:** ECR name matches Tekton `servicename`; probes hit `/api/health`; `NEXT_PUBLIC_*` only in `tekton.buildargs`; no secrets in git.
- [ ] **Platform:** Argo app name unique in namespace; SM path matches `externalSecret.awsSecretName`; ESO lists every SM key before enable.
- [ ] **Rollout:** Argo Synced/Healthy; smoke login + critical pages; DNS verification documented.
- [ ] **Cleanup:** Amplify only removed after EKS soak; `master` Amplify rollback considered until PROD cutover.

---

## Docs map

| File | Purpose |
| --- | --- |
| [docs/01-inventory.md](docs/01-inventory.md) | Amplify → EKS config inventory |
| [docs/02-app-prep.md](docs/02-app-prep.md) | Dockerfile, health, headers, `deploy/` |
| [docs/03-platform.md](docs/03-platform.md) | cloud_catalog, ECR, Tekton, Secrets Manager |
| [docs/04-rollout.md](docs/04-rollout.md) | INT → PROD, DNS, rollback |
| [docs/05-cleanup.md](docs/05-cleanup.md) | Decommission Amplify |
| [docs/gotchas.md](docs/gotchas.md) | Lessons from wiplatform PRs |
| [templates/](templates/) | Copy-paste starters (placeholders) |
| [tickets.md](tickets.md) | Standard Jira ticket set |
| [AGENTS.md](AGENTS.md) | Instructions for coding agents |

---

## Agents

If you are a Cloud Agent applying this to an app repo, read **AGENTS.md** and follow docs **01 → 05** in order.