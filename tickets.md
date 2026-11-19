# Standard Jira tickets (Amplify → EKS)

Copy titles into your project; link epic as needed (wiplatform used CPS-1875 / CPS-1881 / CPS-1878 / CPS-35).

---

## Inventory and app prep

**[APP] Amplify → EKS inventory**  
Document all Amplify env vars (branch + All branches), classify config/secret/build arg/drop, and list UNKNOWNs for sign-off.  
**AC:** Inventory table attached to PR; no secret values in git; Platform egress/IRSA needs identified.

**[APP] Docker + health + security headers for EKS**  
Add Dockerfile (standalone Next), `/api/health`, move `customHttp.yml` headers into app, CI docker smoke.  
**AC:** CI green; container health 200; static headers on `/login` in CI smoke.

**[APP] Helm deploy values (INT + PROD)**  
Add `deploy/k8s/int/web/values.yaml` and prod twin; `deploy/README.md` with SM key names only.  
**AC:** YAML parses; ECR names match `${name}-${region}-${env}`; externalSecret keys listed.

---

## Platform and secrets

**[APP] Secrets Manager INT secret**  
Create `int/pl-int-proxy/<APP_NAME>` with all properties from `externalSecret.data`.  
**AC:** ExternalSecret Synced on INT; Argo not blocked by missing keys.

**[APP] Secrets Manager PROD secret**  
Create `prod/pl-prod-proxy/<APP_NAME>` with prod keys from inventory.  
**AC:** All PROD ESO properties exist before PROD Argo enable.

**[APP] cloud_catalog Argo + Tekton registration**  
Add application entries (INT first); Tekton watches app repo branch and values path.  
**AC:** PR reviewed by platform lead; INT `disable: false` only after first image + SM.

**[INFRA] IRSA, S3, ingress, DNS for <APP_NAME>**  
Wire service account role, bucket policy, public host on ALB, optional legacy redirects.  
**AC:** Pods upload/list S3 (if needed); public URL serves EKS; checklist in deploy README done.

**[PLATFORM] imagetag-updater ruleset exception**  
Allow bot to push image tag commits to INT/PROD Tekton branches.  
**AC:** Successful Tekton run updates `deployment.image.tag` without manual PR.

---

## Rollout and cleanup

**[APP] INT EKS cutover and smoke**  
Deploy INT via Tekton; verify Argo, login, critical flows.  
**AC:** Argo Synced/Healthy; smoke sign-off recorded.

**[APP] PROD EKS cutover and DNS**  
PROD Tekton on `master`; enable PROD Argo; Platform DNS to ALB.  
**AC:** PROD smoke pass; rollback doc updated; ECR scan reviewed.

**[APP] Remove Amplify hosting artefacts**  
Delete `amplify.yml`, `customHttp.yml`, update docs after soak.  
**AC:** No Amplify build dependency on migrated branch; grep clean.