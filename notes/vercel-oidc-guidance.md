# Vercel OIDC guidance used for FarmX

Sources:

- https://vercel.com/docs/oidc/aws (last updated 2026-07-15)
- https://vercel.com/docs/oidc/reference (last updated 2026-08-04)

For team issuer mode, Vercel documents the provider URL as `https://oidc.vercel.com/[TEAM_SLUG]`, with audience `https://vercel.com/[TEAM_SLUG]`. The AWS trust policy should use `sts:AssumeRoleWithWebIdentity`, require the audience claim, and can restrict the `sub` claim to `owner:[TEAM_SLUG]:project:[PROJECT_NAME]:environment:production`. Vercel documents `AWS_ROLE_ARN` as the environment variable used by the server-side AWS credentials provider. The official JavaScript helper is `@vercel/oidc-aws-credentials-provider`, whose `awsCredentialsProvider({ roleArn })` exchanges the Vercel OIDC token for short-lived AWS credentials. Vercel also advises explicitly setting `AWS_REGION` to pin AWS calls to the resource region because Vercel's automatic function region can differ.
