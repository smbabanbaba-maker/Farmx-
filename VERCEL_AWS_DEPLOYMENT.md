# FarmX Vercel & AWS Production Deployment Guide

This guide documents the required steps and environment variables to connect your FarmX Vercel production deployment with the provisioned AWS infrastructure (`eu-west-1`).

## Required Server-Side Environment Variables in Vercel

Set these variables in your Vercel project settings under **Project Settings → Environment Variables**:

| Variable Name                | Value / Reference                                                                       | Purpose                                                           |
| :--------------------------- | :-------------------------------------------------------------------------------------- | :---------------------------------------------------------------- |
| `AWS_REGION`                 | `eu-west-1`                                                                             | Target AWS region for DynamoDB, S3, Cognito, and Secrets Manager. |
| `FARMX_LISTINGS_TABLE`       | `farmx-production-ListingsTable-1PR6LC4ZWQ2TW`                                          | DynamoDB table for marketplace listings and ads.                  |
| `FARMX_PROFILE_TABLE`        | `farmx-production-ProfileTable-1NH1UFG2BGXMW`                                           | DynamoDB table for user profiles, wallet, and transactions.       |
| `FARMX_COMMUNITY_TABLE`      | `farmx-production-CommunityTable-MNJ865JCRLS0`                                          | DynamoDB table for community posts and discussions.               |
| `FARMX_LEARN_TABLE`          | `farmx-production-LearnTable-1HHVVN6WKKNKV`                                             | DynamoDB table for courses, enrollments, and certificates.        |
| `FARMX_MEDIA_BUCKET`         | `farmx-production-mediabucket-hpgjl7zniepw`                                             | Private S3 media bucket for product photos and user uploads.      |
| `COGNITO_USER_POOL_ID`       | `eu-west-1_HXI6OOXpg`                                                                   | Amazon Cognito User Pool ID for user authentication.              |
| `COGNITO_WEB_CLIENT_ID`      | `5160g8vs8f7c55fnvovjtgqnab`                                                            | Amazon Cognito App Client ID.                                     |
| `FARMX_PAYSTACK_SECRET_ARN`  | `arn:aws:secretsmanager:eu-west-1:205839629044:secret:farmx/production/paystack-WKGetX` | AWS Secrets Manager ARN storing the Paystack Live Secret Key.     |
| `VITE_PAYSTACK_PUBLIC_KEY`   | `pk_live_13ae5a0f9ef2afa784958285201822f151229074`                                      | Public Paystack key for browser checkout initialization.          |
| `VITE_COGNITO_USER_POOL_ID`  | `eu-west-1_HXI6OOXpg`                                                                   | Public Cognito User Pool ID for client-side auth state.           |
| `VITE_COGNITO_WEB_CLIENT_ID` | `5160g8vs8f7c55fnvovjtgqnab`                                                            | Public Cognito Web Client ID.                                     |
| `VITE_PUBLIC_INDEXING`       | `true`                                                                                  | Enables search engine indexing on public routes.                  |

## AWS Credentials in Vercel

To allow Vercel server functions to communicate with your AWS DynamoDB tables, S3 bucket, and Secrets Manager, also provide your AWS deployment credentials as Vercel environment variables (server-only):

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

These credentials are kept entirely server-side and are never exposed to the browser or frontend bundle.
