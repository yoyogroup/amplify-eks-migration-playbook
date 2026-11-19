# Glossary

One-line definitions for the migration playbook. Deeper steps: [journey](journey.md).

| Term | Meaning |
| --- | --- |
| **Amplify** | AWS service that builds and hosts the app from a git branch; env vars and custom HTTP headers often live here today. |
| **EKS** | Amazon Elastic Kubernetes Service; the cluster where app **pods** run after migration. |
| **Tekton** | Kubernetes-native CI that runs build **pipelines** when you push (or when triggered). |
| **Kaniko** | Tool Tekton uses to build a Docker image inside the cluster without a Docker daemon. |
| **Sceptre** | Wrapper used in Tekton to run CloudFormation and create the **ECR** repo if missing. |
| **ECR** | Elastic Container Registry; private store for Docker images Tekton pushes. |
| **Argo CD** | GitOps tool that applies Helm manifests so the cluster matches what is in git. |
| **cloud_catalog** | Yoyo repo that registers which apps Argo and Tekton should manage per environment. |
| **Helm / yoyo-app chart** | Shared chart that turns `deploy/k8s/.../values.yaml` into Deployment, Service, secrets wiring, etc. |
| **imagetag-updater** | Bot that commits a new `deployment.image.tag` after a successful Tekton build. |
| **IRSA** | IAM Roles for Service Accounts; lets pods call AWS APIs such as S3 without static keys. |
| **Secrets Manager** | AWS store for secret values; pods read them via **ExternalSecret**. |
| **ExternalSecret** | Kubernetes object that copies named keys from Secrets Manager into a pod secret. |
| **ALB** | Application Load Balancer; Platform often routes public HTTPS to EKS services through it. |
| **INT** | Integration environment; first place to deploy and soak before PROD. |
| **PROD** | Production environment; usually stricter branch, secrets, and DNS cutover. |