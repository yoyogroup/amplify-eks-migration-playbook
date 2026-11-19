# Gotchas (wiplatform-portal-nextjs only)

Real issues from migration PRs — not generic advice.

---

## ECR name must match Tekton `servicename` ([#148](https://github.com/yoyogroup/wiplatform-portal-nextjs/pull/148))

Kaniko pushes to `{{ name }}-{{ region }}-{{ environment }}`. Sceptre `ServiceName` and `deployment.image.repository` must use the **same** string. First INT run created `wiplatform-portal-eu-west-1-int` while chart `name` was `wiplatform-portal-nextjs` → push permission failure.

**Fix:** Align all three to `<APP_NAME>-eu-west-1-int`. Keep Kubernetes `name` as full repo-style name to avoid collision with legacy `wiplatform-portal` in `int-eu-west-1-intergrations` (CPS-1881).

---

## Chart `name` vs legacy Argo release ([#145](https://github.com/yoyogroup/wiplatform-portal-nextjs/pull/145), cloud_catalog [#362](https://github.com/yoyogroup/cloud_catalog/pull/362))

PHP/kustomize portal already uses `wiplatform-portal`. Next.js app **must** use distinct `name: wiplatform-portal-nextjs` and SM path `…/wiplatform-portal-nextjs`.

---

## Turbopack / Tekton OOM (PR #142 Dockerfile)

Under Kaniko **4Gi** step limit, default `next build` (Turbopack) OOMs. Use `next build --webpack`, `NEXT_WEBPACK_PARALLELISM=1`, builder `NODE_OPTIONS=--max-old-space-size=1536`, and `next.config` docker-only memory opts (`cpus: 1`, `webpackMemoryOptimizations`, `ignoreBuildErrors` + CI typecheck).

---

## Cognito-only vs legacy OAuth ([#145](https://github.com/yoyogroup/wiplatform-portal-nextjs/pull/145))

Hosted Auth `WiPlatformPortalAppClient` registers **only** `/auth/cognito-callback`. Do not migrate `YOYO_OAUTH_CLIENT_ID` + `/auth/callback` from Amplify when cutting over to Cognito-only.

PROD pre-#137 release ([#153](https://github.com/yoyogroup/wiplatform-portal-nextjs/pull/153)) temporarily wired **legacy** OAuth + datamart secrets — exception, not the default playbook path.

---

## ExternalSecret is strict ([#153](https://github.com/yoyogroup/wiplatform-portal-nextjs/pull/153))

Every key in `externalSecret.data` must exist in SM before Argo is Healthy. Optional app env (`CONFIG_SERVER_USER_ROLE`) should be **omitted** from ESO if unset on Amplify.

---

## `tekton.awsaccountid` must be quoted ([#145](https://github.com/yoyogroup/wiplatform-portal-nextjs/pull/145), Deals values)

Unquoted numeric account id in YAML parses as float → invalid ECR cache hostname.

---

## imagetag-updater vs branch protection (CPS-1876, [#145](https://github.com/yoyogroup/wiplatform-portal-nextjs/pull/145))

Bot pushes to `development` / `master` need ruleset bypass; otherwise manual tag PRs after each build.

---

## imagetag-updater still triggers Amplify on `master` ([#153](https://github.com/yoyogroup/wiplatform-portal-nextjs/pull/153))

Until Amplify retired on PROD, tag commits on `master` can start Amplify builds — plan PROD cleanup timing.

---

## INT HPA off ([#145](https://github.com/yoyogroup/wiplatform-portal-nextjs/pull/145))

Matches Marketplace INT: single pod, `autoscaling.enabled: false`. Marketplace also documents HPA + migration hook ordering if you enable Jobs.

---

## Google Maps / `NEXT_PUBLIC_*` in git ([#145](https://github.com/yoyogroup/wiplatform-portal-nextjs/pull/145))

Browser keys are visible in bundle and may appear in `tekton.buildargs` in values. Risk accepted with GCP referrer/API restrictions — not a substitute for server secrets.

---

## IRSA placeholder ([#362](https://github.com/yoyogroup/cloud_catalog/pull/362))

Argo can be Healthy while S3 uploads fail until YOYOINFRA-2816 sets real `eks.amazonaws.com/role-arn` and bucket policy.

---

## Ingress delayed ([#362](https://github.com/yoyogroup/cloud_catalog/pull/362))

INT Argo enabled before public ingress — test with port-forward; no public traffic until Platform ingress merged.

---

## Security headers source moved (PR #142, [#155](https://github.com/yoyogroup/wiplatform-portal-nextjs/pull/155))

Deleting `customHttp.yml` is safe only after `next.config` + CI header smoke pass.

---

## Node 24 on PROD ([#154](https://github.com/yoyogroup/wiplatform-portal-nextjs/pull/154))

Dockerfile already on Node 24 while CI/master lagged Node 20 — align `.nvmrc`, CI, and `engines` before blaming app bugs on version skew.

---

## ECR CVE-driven dependency PR ([#154](https://github.com/yoyogroup/wiplatform-portal-nextjs/pull/154))

Large lockfile churn on `master`; smoke auth and sharp after merge — not required for every migration but expect scan pressure on first PROD images.