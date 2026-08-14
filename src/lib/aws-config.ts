import { awsCredentialsProvider } from "@vercel/oidc-aws-credentials-provider";

export function getAwsClientOptions(region: string) {
  const roleArn = process.env.AWS_ROLE_ARN;
  return roleArn ? { region, credentials: awsCredentialsProvider({ roleArn }) } : { region };
}
