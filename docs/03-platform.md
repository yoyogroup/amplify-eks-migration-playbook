# 03 — Platform wiring (cloud_catalog + AWS)

App repo values are **inert** until Platform registers Argo + Tekton and secrets/IRSA exist.

---

## cloud_catalog Argo application

**Repo:** [yoyogroup/cloud_catalog](https://github.com/yoyogroup/cloud_catalog)

Pattern (wiplatform PR [#362](https://github.com/yoyogroup/cloud_catalog/pull/362), building on #361):

1. Add app entry under `deploy/intergration/eu-west-1/applications.yaml` (and prod equivalent when ready)
2. Start with `disable: true`; flip to `disable: false` when:
   - First Tekton image exists in ECR
   - SM secret exists with all `externalSecret.data` properties
   - Values file on the branch Argo watches
3. App name example: `<APP_NAME>-eu-west-1-int` (distinct from legacy kustomize names in same namespace)
4. Namespace example: `int-eu-west-1-intergrations` (confirm per env in cloud_catalog peers)
5. **Ingress** may stay disabled/commented until infra ticket (wiplatform: YOYOINFRA-2816) — cluster-only testing via port-forward until then

### Who

- Dev opens PR; **platform lead** (e.g. Paul Patterson on wiplatform #362) approves
- Dev merges when approved (per team norm)

---

## ECR repository

Created by Tekton task **`create-aws-resources`** via Sceptre:

```text
sceptre --var ServiceName=<APP_NAME>-<REGION>-<ENV> \
  --var template_bucket_name=<PLATFORM_TEKTON_CF_BUCKET> \
  launch int/svc/services/ecr -y
```

- Bucket name is **environment-specific** (INT example pattern: `yoyo-platform-int-cloudformation-stack-tekton` — confirm in peer values)
- Kaniko pushes to `<APP_NAME>-<REGION>-<ENV>` and cache repo `<APP_NAME>-<REGION>-<ENV>/cache`
- Wrong `ServiceName` → empty/wrong ECR repo and push denied (#148)

Orphan stacks from a first failed naming attempt can be left for Platform cleanup (document in app `deploy/README.md`).

---

## Tekton pipeline

Configured via `yoyo-app-tekton` chart values embedded in app `deploy/k8s/*/web/values.yaml`:

| Field | Typical |
| --- | --- |
| `tekton.branch` | INT: `development` or `integration`; PROD: `master` |
| `tekton.valuesfile` | `deploy/k8s/int/web/values.yaml` |
| `tekton.gitrepository` | `git@github.com:yoyogroup/<REPO>.git` |
| `tekton.tasks` | `fetch-repository`, `create-aws-resources`, `build-image`, `imagetag-updater` |
| `tekton.docker.dockerfile` | `Dockerfile` |
| `tekton.buildResources` | request 2Gi, limit 4Gi (cluster max) |
| `tekton.awsaccountid` | **Quoted string** (unquoted YAML → float breaks ECR host) |

**Trigger:** Slack `/cloud-deploy <APP_NAME>-<REGION>-<ENV>` (see #cloudplatform-deployment).

**Charts:** Pin `yoyo-app` / `yoyo-app-tekton` versions in cloud_catalog (wiplatform cited **1.0.19** / **0.5.0** in PR #145).

---

## Secrets Manager naming

Observed pattern (placeholders):

```text
<ENV>/pl-<ENV>-proxy/<APP_NAME>
```

Examples from wiplatform **shape only**:

- INT: `int/pl-int-proxy/<APP_NAME>`
- PROD: `prod/pl-prod-proxy/<APP_NAME>`

**Legacy paths:** Older apps may have `…/<short-name>` without repo suffix — use a **new** secret for the Next/EKS app if a legacy portal still consumes the old path (wiplatform deploy README).

### Dev workflow

1. List required properties from `externalSecret.data` in values YAML
2. Create/update secret in AWS Console or approved tooling
3. **Never** paste values into git or PR body
4. ExternalSecret must stay **Synced** before Argo shows Healthy

IRSA role for the pod may need `secretsmanager:GetSecretValue` on the new secret ARN only.

---

## imagetag-updater

On successful build, bot commits `deployment.image.tag` to `tekton.branch` and pushes.

- **Branch protection:** needs ruleset exception for `ciyoyogroup/imagetag-updater` (wiplatform CPS-1876)
- Until then: manual PR to pin tag after each build
- PROD: replace `bootstrap-pending` before enabling Argo (#153)

---

## Platform tickets (typical)

| Work | Track via |
| --- | --- |
| IRSA role + S3 bucket policy | Infra Jira (wiplatform: YOYOINFRA-2816) |
| Ingress + public DNS + TLS | Same + cloud_catalog ingress block |
| Legacy hostname 301 redirects | Ingress-only (wiplatform: YOYOINFRA-2614) |
| EKS egress to on-prem APIs | Network ticket if pods call internal hosts (#153 datamart) |
| imagetag-updater bot bypass | CPS/platform ruleset |

---

## PR checklist (platform)

- [ ] Argo entry matches app `name`, repo URL, values path, target revision = Tekton branch
- [ ] SM secret created with **all** ESO properties
- [ ] ECR repo exists after first `create-aws-resources`
- [ ] Tekton build green; tag committed or manually pinned
- [ ] `disable: false` only after above