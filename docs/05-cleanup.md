# 05 — Cleanup Amplify

**When:** After EKS soak on the environment (INT first; PROD only when rollback path no longer needs Amplify build on that branch).

Reference: wiplatform PR [#155](https://github.com/yoyogroup/wiplatform-portal-nextjs/pull/155).

---

## Remove from app repo

| Artifact | Action |
| --- | --- |
| `amplify.yml` | Delete |
| `customHttp.yml` | Delete (headers live in app code) |
| Docs/comments referencing Amplify env echo / hosting | Rephrase to EKS/Tekton |
| `AGENTS.md` / README build instructions | Point to Docker/Tekton |

**Keep (until PROD fully on EKS):**

- `DOCKER_BUILD` gate in `next.config` if `master` still builds on Amplify without standalone (#155)
- Amplify files on `master` if PROD rollback requires them — remove in a follow-up PROD cleanup PR

---

## Do not remove in cleanup PR

- `deploy/k8s/**/values.yaml`
- `Dockerfile`
- Secrets Manager secrets (still used by EKS)

---

## AWS Console

After soak + sign-off:

1. Disable or delete Amplify app (per org change process)
2. Remove unused Amplify branches/domains
3. Review orphaned ECR repos from wrong `ServiceName` first deploy (#148) — Platform cleanup

---

## Verify

- [ ] `git grep -i amplify` only intentional historical comments (or none)
- [ ] INT Tekton build still green on target branch
- [ ] No dependency on Amplify env injection in build

---

## Checklist

- [ ] INT Amplify decommissioned (if INT fully on EKS)
- [ ] PROD Amplify decommissioned (separate change, later)
- [ ] Epic/ticket closed (e.g. CPS-35 parent for wiplatform)