# 04 — Rollout (INT → PROD)

---

## Phase A — INT

1. Merge app prep PR(s) to INT Tekton branch (`development` / `integration`)
2. Platform: SM secret, IRSA (even if placeholder), Argo `disable: false` when ready ([#362](https://github.com/yoyogroup/cloud_catalog/pull/362) pattern)
3. Run Tekton: `/cloud-deploy <APP_NAME>-<REGION>-int`
4. Verify:
   - [ ] PipelineRun succeeded (ECR push + imagetag-updater or manual tag PR)
   - [ ] Argo CD: **Synced** + **Healthy**
   - [ ] Pod Ready; `kubectl port-forward` → `GET /api/health` **200**
   - [ ] ExternalSecret **SecretSynced**
5. Smoke (wiplatform-style):
   - Login flow (Cognito or interim auth — know your branch’s auth mode)
   - One list page + one write flow
   - Upload path if S3/IRSA (#145)
   - Security headers on `/login`
6. If ingress live: hit **INT public host**; else stay on port-forward until Platform ingress ticket closes

---

## Phase B — PROD

Often on `master` with stricter sequencing (#153):

1. Cherry-pick or merge migration to `master` without unreleased feature code if needed
2. Fill PROD values from **Amplify prod** truth (no UNKNOWN gaps — or explicit legacy exceptions documented)
3. Create PROD SM secret (all `externalSecret.data` keys)
4. First PROD Tekton build; pin real `deployment.image.tag`
5. Merge cloud_catalog PROD Argo entry; `disable: false` after checklist (wiplatform deploy README “Pre-cutover verification”)
6. Argo Synced/Healthy + smoke (login, critical APIs, egress to dependencies)
7. **DNS cutover** (Platform): public hostname from Amplify/CloudFront → ALB/backend target group

---

## DNS / who is serving traffic?

Before cutover:

- Amplify custom domain still points at **Amplify/CloudFront**
- `dig` / browser devtools: note CNAME/target

After cutover:

- Same hostname should resolve to **Platform ALB** (or agreed edge)
- Compare response headers (HSTS, CSP) and a known static asset hash or `x-amz-cf-*` absence
- Keep Amplify app **running** during soak for fast rollback (#155: `master` may still build Amplify until PROD retired)

---

## ECR image scan

After first PROD image on `master`:

- Review ECR scan findings (wiplatform PR #154 drove dependency bumps for CVEs)
- Re-run Tekton after security PR merges

---

## Rollback plan

| Layer | Rollback |
| --- | --- |
| **Traffic** | Revert DNS to Amplify/CloudFront (Platform) |
| **K8s** | Argo: previous image tag sync, or `disable: true` on app |
| **Config** | Revert values PR; SM values unchanged unless bad deploy |
| **Git** | `master`/`development` still has Amplify files until [05-cleanup](05-cleanup.md) |

Document “last known good” Amplify build id and EKS image tag before cutover.

---

## Exit criteria

- [ ] INT soak complete (team-defined duration)
- [ ] PROD cutover + smoke sign-off
- [ ] Monitoring/alerts wired (if applicable)
- [ ] Runbook link in app `deploy/README.md`