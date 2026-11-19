# Amplify → EKS migration playbook

## New here? Start with the guide

~10 minutes, plain English, for devs, leads, and QA:

1. [guide/overview](guide/overview.md) — what changes  
2. [guide/journey](guide/journey.md) — five steps and owners  
3. [guide/how-a-deploy-works](guide/how-a-deploy-works.md) — build and deploy flow  
4. [guide/glossary](guide/glossary.md) — terms  

Then use this page for PR order and links into [`docs/`](docs/).

---

Reusable checklist for moving a Yoyo **Next.js** (or similar containerized) app from **AWS Amplify** to **EKS**, with **Tekton** (Kaniko build → ECR) and **Argo CD** (deploy via `cloud_catalog` + `yoyo-app` Helm values in the app repo).

**Reference migration — wiplatform-portal-nextjs:** [#142](https://github.com/yoyogroup/wiplatform-portal-nextjs/pull/142) (Docker/health/headers), [#145](https://github.com/yoyogroup/wiplatform-portal-nextjs/pull/145) (deploy values), [#153](https://github.com/yoyogroup/wiplatform-portal-nextjs/pull/153)–[#155](https://github.com/yoyogroup/wiplatform-portal-nextjs/pull/155). ECR naming lesson: [gotchas](docs/gotchas.md) / [#148](https://github.com/yoyogroup/wiplatform-portal-nextjs/pull/148).

**cloud_catalog (Tekton + Argo registration, not SM):** [#361](https://github.com/yoyogroup/cloud_catalog/pull/361) INT scaffold (Tekton on, Argo off), [#362](https://github.com/yoyogroup/cloud_catalog/pull/362) INT Argo enable, [#365](https://github.com/yoyogroup/cloud_catalog/pull/365) PROD scaffold.

**Peer patterns:** [yoyo-deals-marketplace-nextjs](https://github.com/yoyogroup/yoyo-deals-marketplace-nextjs), [yoyo-avbob-nextjs](https://github.com/yoyogroup/yoyo-avbob-nextjs).

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

Runtime env: **Helm `deployment.env.config`** + **ExternalSecret** (SM key names in git only).  
Build-time: **`NEXT_PUBLIC_*`** via `tekton.buildargs` + Dockerfile `ARG`s.

---

## Recommended PR order

| Step | Doc | Typical PR focus | Who |
| --- | --- | --- | --- |
| 1 | [01-inventory](docs/01-inventory.md) | Inventory table; no code yet | Dev |
| 2 | [02-app-prep](docs/02-app-prep.md) | Docker, health, headers, `deploy/` values (**ECR image repo + Sceptre `ServiceName` = `${name}-${region}-${env}` from the first PR** — [gotchas](docs/gotchas.md)); **SM secrets** (key names only) | Dev |
| 3 | [03-platform](docs/03-platform.md) | **`cloud_catalog` only:** Argo + Tekton (#361-style); Tekton push target must match step 2 names; platform lead approves | Dev opens PR |
| 4 | [04-rollout](docs/04-rollout.md) | INT/PROD deploy, Argo enable follow-ups (#362), smoke, DNS | Dev + Platform |
| 5 | [05-cleanup](docs/05-cleanup.md) | Remove Amplify artefacts after soak | Dev |

One concern per PR where possible. Never commit secret **values**.

---

## Who does what

| Task | Owner |
| --- | --- |
| Inventory, app repo Docker/deploy, **Secrets Manager** secret(s) | Dev |
| `cloud_catalog` Argo + Tekton registration | Dev PR → **platform lead** |
| IRSA, ingress, DNS, bucket policies | Platform |
| imagetag-updater branch ruleset | Platform / CPS |

---

## Review checklist (pointers)

| PR type | See |
| --- | --- |
| Inventory | [01-inventory](docs/01-inventory.md) exit criteria |
| App prep | [02-app-prep](docs/02-app-prep.md) PR checklist |
| cloud_catalog | [03-platform](docs/03-platform.md) PR checklist |
| Rollout / cleanup | [04-rollout](docs/04-rollout.md), [05-cleanup](docs/05-cleanup.md) |

---

## Docs map

| File | Purpose |
| --- | --- |
| [docs/01-inventory.md](docs/01-inventory.md) | Config inventory |
| [docs/02-app-prep.md](docs/02-app-prep.md) | Dockerfile, `deploy/`, SM (dev) |
| [docs/03-platform.md](docs/03-platform.md) | cloud_catalog Argo + Tekton |
| [docs/04-rollout.md](docs/04-rollout.md) | INT → PROD |
| [docs/05-cleanup.md](docs/05-cleanup.md) | Decommission Amplify |
| [docs/gotchas.md](docs/gotchas.md) | wiplatform lessons |
| [guide/](guide/) | Human-friendly overview (~10 min) |
| [templates/](templates/) | Starters (placeholders) |
| [tickets.md](tickets.md) | Jira stubs |
| [AGENTS.md](AGENTS.md) | Agent instructions |