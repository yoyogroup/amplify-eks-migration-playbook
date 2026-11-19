# AGENTS.md — Using this playbook on an app repo

You are migrating **one** Yoyo app from Amplify to EKS. This repository is the **playbook**; your work happens in the **application** repository unless explicitly told to edit the playbook.

---

## Order of work

1. Read [README.md](README.md) for PR order and roles.
2. Execute [docs/01-inventory.md](docs/01-inventory.md) — produce the inventory table first.
3. [docs/02-app-prep.md](docs/02-app-prep.md) — Dockerfile, health, headers, `deploy/`, **Secrets Manager** (keys only in git).
4. [docs/03-platform.md](docs/03-platform.md) — **cloud_catalog** Argo + Tekton PRs only (SM stays in steps 3–4 and [04-rollout](docs/04-rollout.md); see README step 2+).
5. [docs/04-rollout.md](docs/04-rollout.md) — INT then PROD.
6. [docs/05-cleanup.md](docs/05-cleanup.md) — after soak only.

Use [templates/](templates/) as starting points; adapt to the app’s package manager and build scripts.

---

## Hard rules

| Rule | Why |
| --- | --- |
| **Never guess config values** | Use `UNKNOWN` and ask; wiplatform PROD gaps caused explicit follow-ups (#145, #153). |
| **Never commit secrets** | Only SM property **names** in `externalSecret.data`. |
| **Never paste real SM values, client secrets, account IDs, bucket names, or internal hostnames into the playbook repo** | Use placeholders in docs/PRs when examples are needed. |
| **One PR per step** when possible | Easier review; matches wiplatform PR chain. |
| **ECR name = `name-region-env`** | #148 failure mode. |
| **`NEXT_PUBLIC_*` only in `tekton.buildargs`** | Not runtime `deployment.env`. |
| **Do not enable Argo `disable: false`** until SM keys + first image exist | #362 / ExternalSecret strictness (#153). |

---

## PR body shape (app repo)

Every migration PR should include:

1. **Summary** — What this step delivers in one short paragraph.
2. **What changed / what's introduced** — File table or bullet list.
3. **Patterns to follow when extending** — How to add env vars, build args, secrets.
4. **Decisions with why** — Table of non-obvious choices.
5. **Risks and merge danger** — What breaks if merged early.
6. **Evidence** — Commands run, peer PR links, helm template if applicable.
7. **Test plan** — Checkboxes for reviewer.
8. **Ticket link** — Jira URL or `none yet`.

---

## Reference repos (read-only)

- [wiplatform-portal-nextjs](https://github.com/yoyogroup/wiplatform-portal-nextjs) — **#142** (Docker/health/headers), **#145** (values), **#148** (ECR), **#153–155** (prod/cleanup)
- [yoyo-deals-marketplace-nextjs](https://github.com/yoyogroup/yoyo-deals-marketplace-nextjs) — `deploy/`, migration Job + HPA note
- [yoyo-avbob-nextjs](https://github.com/yoyogroup/yoyo-avbob-nextjs) — Docker/Next patterns
- [cloud_catalog](https://github.com/yoyogroup/cloud_catalog) — **#361** INT scaffold (Argo off, Tekton on), **#362** INT Argo enable, **#365** PROD scaffold

If a repo is not accessible, state that in your PR and proceed from peer docs + this playbook.

---

## Verification before claiming done

- Lint/typecheck/tests per app repo norms
- Docker build + `/api/health` + security header smoke if CI exists
- No secret values in `git diff`
- Inventory and values YAML stay in sync on secret **key names**

---

## When stuck

- Check [docs/gotchas.md](docs/gotchas.md) for wiplatform-specific failures.
- Compare your `deploy/k8s/int/web/values.yaml` with Marketplace INT line-for-line structure (not values).
- Escalate UNKNOWN inventory rows to the human owner — do not invent URLs or IDs.