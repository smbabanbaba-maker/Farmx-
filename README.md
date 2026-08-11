# FarmX Marketplace

FarmX is a responsive marketplace for farmers, businesses, buyers, and service providers. The application keeps the original FarmX marketplace experience while providing polished account controls, messages, buyer protection, subscriptions, listings, a community area, wallet workflows, and AWS-ready persistence.

## Product scope

| Area          | Included capability                                                                                                                                                               |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Marketplace   | Universal categories for agriculture, food, electronics, fashion, vehicles, real estate, household goods, industrial supplies, health and beauty, services, jobs, pets, and more. |
| Listings      | Validated title, category, brand, up to five images, optional video link, location, condition, price, bulk price, negotiation, delivery, and contact details.                     |
| Subscription  | Five free listings, remaining-quota messaging, and the complete Basic-to-Enterprise Lux plan catalogue. There is no separate listing fee.                                         |
| Promotion     | Optional TOP promotion at ₦2,799 for a 7-day or 30-day placement.                                                                                                                 |
| Trust         | Verified seller controls, escrow and pay-on-delivery flows, disputes, refund states, reviews, and customer safety notices.                                                        |
| Account       | Profile sidebar, saved ads, settings, notifications, favourites, followers, language, dark mode, and accessibility-friendly font scaling.                                         |
| Communication | Conversation filters, seller details, quick message prompts, closed-ad indicators, and moderation actions.                                                                        |

## Local development

Install Node.js 22 or newer, then run the following commands.

```bash
pnpm install
pnpm run dev
```

The local development server starts on `http://localhost:3000`.

| Check              | Command              |
| ------------------ | -------------------- |
| Type safety        | `pnpm run typecheck` |
| Code style         | `pnpm run lint`      |
| Production build   | `pnpm run build`     |
| Production preview | `pnpm run preview`   |

## AWS foundation

The repository includes `infra/farmx-aws.yaml`, a CloudFormation template that provisions the core services needed by FarmX.

| Service             | Purpose                                                               | FarmX configuration                                       |
| ------------------- | --------------------------------------------------------------------- | --------------------------------------------------------- |
| Amazon S3           | Private listing photos with short-lived upload and download links.    | `FARMX_MEDIA_BUCKET`                                      |
| Amazon DynamoDB     | Listing records with indexes for active listings and seller listings. | `FARMX_LISTINGS_TABLE`                                    |
| Amazon Cognito      | Customer identity, account recovery, and stronger password controls.  | `VITE_COGNITO_USER_POOL_ID`, `VITE_COGNITO_WEB_CLIENT_ID` |
| AWS Secrets Manager | Server-side payment secret storage.                                   | Runtime access only; never expose a secret in `VITE_*`.   |
| IAM                 | Least-privilege permissions for the FarmX server runtime.             | Attach the output policy to the runtime role.             |

> The app uses S3 presigned URLs so browser users do not receive AWS credentials. The URLs are intentionally short-lived and the bucket stays private. [1]

### Deploy the AWS foundation

First choose the public HTTPS origin that will serve the app, for example `https://app.example.com`. Then validate and deploy the template from an authenticated AWS command line session.

```bash
aws cloudformation validate-template \
  --template-body file://infra/farmx-aws.yaml

aws cloudformation deploy \
  --template-file infra/farmx-aws.yaml \
  --stack-name farmx-production \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    ApplicationOrigin=https://app.example.com \
    Environment=production
```

After deployment, copy the stack outputs into your deployment environment. The browser only receives variables prefixed with `VITE_`; `AWS_REGION`, the S3 bucket, DynamoDB table, and payment secret must remain on the FarmX server.

```bash
AWS_REGION=eu-west-1
FARMX_MEDIA_BUCKET=<CloudFormation MediaBucketName output>
FARMX_LISTINGS_TABLE=<CloudFormation ListingsTableName output>
VITE_API_BASE_URL=https://api.example.com
VITE_COGNITO_USER_POOL_ID=<CloudFormation CognitoUserPoolId output>
VITE_COGNITO_WEB_CLIENT_ID=<CloudFormation CognitoWebClientId output>
VITE_PAYSTACK_PUBLIC_KEY=pk_live_replace_me
```

DynamoDB is configured in on-demand mode with point-in-time recovery. Its table design keeps primary listing data, the active-marketplace query, and seller-specific listings available without requiring a server to manage. [2]

## Production integration checklist

| Step | Required action                                                                                                                                                                                          |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Deploy `infra/farmx-aws.yaml` once for each environment.                                                                                                                                                 |
| 2    | Run the FarmX server with the IAM policy output from the stack attached to its runtime role.                                                                                                             |
| 3    | Set the server-only values listed above in the deployment environment.                                                                                                                                   |
| 4    | Configure the S3 bucket CORS origin to match the exact public application URL.                                                                                                                           |
| 5    | Replace `farmx-demo-user` in `src/routes/post-product.tsx` with the Cognito subject claim once sign-in is connected.                                                                                     |
| 6    | Create the payment API endpoints and keep the Paystack secret only in AWS Secrets Manager. Verify every payment server-side before activating a subscription, promotion, wallet credit, or escrow state. |
| 7    | Point the domain DNS records to the selected hosting service. Leave the existing SOA record unchanged.                                                                                                   |

## Security model

FarmX does not place an AWS access key, database credential, or payment secret in browser code. Uploads are signed by the server for the exact image object and a limited time. The CloudFormation template blocks public S3 access, enables server-side encryption, limits the application role to `products/*`, enables DynamoDB encryption and point-in-time recovery, and sets a dedicated secret location for payment processing.

## Repository structure

```text
infra/
  farmx-aws.yaml          AWS foundation template
src/
  components/             Reusable application UI
  lib/                    State, AWS server functions, payment contracts, and utilities
  routes/                 Marketplace pages and account flows
public/                   FarmX logo and browser assets
```

## References

[1] [Amazon S3: Download and upload objects with presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html)

[2] [Amazon DynamoDB: Introduction and on-demand capacity](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Introduction.html)
