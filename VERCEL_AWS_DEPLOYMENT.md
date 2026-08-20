# Goall26 Vercel & AWS Production Deployment Guide

This guide documents the required steps and environment variables to connect your Goall26 Vercel production deployment with the provisioned AWS infrastructure (`eu-west-1`).

## Required Server-Side Environment Variables in Vercel

Set these variables in your Vercel project settings under **Project Settings → Environment Variables**:

| Variable Name                | Value / Reference                                                                       | Purpose                                                           |
| :--------------------------- | :-------------------------------------------------------------------------------------- | :---------------------------------------------------------------- |
| `AWS_REGION`                 | `eu-west-1`                                                                             | Target AWS region for DynamoDB, S3, Cognito, and Secrets Manager. |
| `GOALL26_LISTINGS_TABLE`       | `<CloudFormation ListingsTableName output>`                                          | DynamoDB table for marketplace listings and ads.                  |
| `GOALL26_PROFILE_TABLE`        | `<CloudFormation ProfileTableName output>`                                           | DynamoDB table for user profiles, wallet, and transactions.       |
| `GOALL26_COMMUNITY_TABLE`      | `<CloudFormation CommunityTableName output>`                                          | DynamoDB table for community posts and discussions.               |
| `GOALL26_LEARN_TABLE`          | `<CloudFormation LearnTableName output>`                                             | DynamoDB table for courses, enrollments, and certificates.        |
| `GOALL26_MEDIA_BUCKET`         | `<CloudFormation MediaBucketName output>`                                             | Private S3 media bucket for product photos and user uploads.      |
| `COGNITO_USER_POOL_ID`       | `eu-west-1_HXI6OOXpg`                                                                   | Amazon Cognito User Pool ID for user authentication.              |
| `COGNITO_WEB_CLIENT_ID`      | `5160g8vs8f7c55fnvovjtgqnab`                                                            | Amazon Cognito App Client ID.                                     |
| `GOALL26_PAYSTACK_SECRET_ARN`  | `<CloudFormation PaystackSecretArn output>` | AWS Secrets Manager ARN storing the Paystack Live Secret Key.     |
| `VITE_PAYSTACK_PUBLIC_KEY`   | `pk_live_replace_me`                                      | Public Paystack key for browser checkout initialization.          |
| `VITE_COGNITO_USER_POOL_ID`  | `eu-west-1_HXI6OOXpg`                                                                   | Public Cognito User Pool ID for client-side auth state.           |
| `VITE_COGNITO_WEB_CLIENT_ID` | `5160g8vs8f7c55fnvovjtgqnab`                                                            | Public Cognito Web Client ID.                                     |
| `VITE_PUBLIC_INDEXING`       | `true`                                                                                  | Enables search engine indexing on public routes.                  |

## AWS Credentials in Vercel

To allow Vercel server functions to communicate with your AWS DynamoDB tables, S3 bucket, and Secrets Manager, also provide your AWS deployment credentials as Vercel environment variables (server-only):

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

These credentials are kept entirely server-side and are never exposed to the browser or frontend bundle.

> Migration note: existing deployments may still contain legacy `FARMX_*` variable names and legacy AWS physical resource names. The Goall26 server reads the new `GOALL26_*` names first and retains legacy fallback support so resources are not disconnected during a coordinated migration. Do not rename or delete live Cognito pools, DynamoDB tables, S3 buckets, or Secrets Manager secrets without a backup and migration plan.
