import { randomUUID } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { z } from "zod";
import { getAwsClientOptions } from "@/lib/aws-config";
import { requireAuthenticatedUser } from "@/lib/auth-server";
import type { ApplicationStatus, JobApplication, JobPost } from "./job.types";

const jobIdSchema = z.object({ jobId: z.string().trim().min(1).max(128) });
const jobInputSchema = z.object({ job: z.record(z.string(), z.unknown()) });
const jobUpdateSchema = z.object({
  jobId: z.string().trim().min(1).max(128),
  updates: z.record(z.string(), z.unknown()),
});
const applicationQuerySchema = z.object({
  userId: z.string().trim().max(128).optional(),
  employerId: z.string().trim().max(128).optional(),
});
const applicationInputSchema = z.object({
  jobId: z.string().trim().min(1).max(128),
  jobTitle: z.string().trim().max(200).optional(),
  companyName: z.string().trim().max(200).optional(),
  applicantName: z.string().trim().max(120).optional(),
  applicantEmail: z.string().email().max(160).optional(),
  applicantPhone: z.string().trim().max(30).optional(),
  applicantLocation: z.string().trim().max(160).optional(),
  cvKey: z.string().trim().max(400).optional(),
  answers: z.record(z.string(), z.string().max(1000)).optional(),
});
const applicationStatusSchema = z.object({
  applicationId: z.string().trim().min(1).max(180),
  status: z.enum([
    "Applied",
    "Under Review",
    "Shortlisted",
    "Interview",
    "Selected",
    "Rejected",
    "Withdrawn",
  ] as const),
  notes: z.string().trim().max(2000).optional(),
  interview: z
    .object({
      date: z.string().trim().max(40),
      time: z.string().trim().max(40),
      locationOrLink: z.string().trim().max(240),
      notes: z.string().trim().max(1000).optional(),
    })
    .optional(),
});
const savedJobSchema = z.object({ jobId: z.string().trim().min(1).max(128) });

function hasProductionConfig() {
  return Boolean(
    process.env.AWS_REGION &&
    process.env.FARMX_JOBS_TABLE &&
    process.env.FARMX_JOB_APPLICATIONS_TABLE &&
    (process.env.COGNITO_USER_POOL_ID ?? process.env.VITE_COGNITO_USER_POOL_ID) &&
    (process.env.COGNITO_WEB_CLIENT_ID ?? process.env.VITE_COGNITO_WEB_CLIENT_ID),
  );
}

export const getJobRuntimeMode = createServerFn({ method: "GET" }).handler(async () => ({
  mode: hasProductionConfig() ? ("production" as const) : ("preview" as const),
}));

function getConfig() {
  const region = process.env.AWS_REGION;
  const jobsTable = process.env.FARMX_JOBS_TABLE;
  const applicationsTable = process.env.FARMX_JOB_APPLICATIONS_TABLE;
  const profileTable = process.env.FARMX_PROFILE_TABLE;
  if (!region || !jobsTable || !applicationsTable || !profileTable) {
    throw new Error(
      "Jobs service is not configured. Set AWS_REGION, FARMX_JOBS_TABLE, FARMX_JOB_APPLICATIONS_TABLE, and FARMX_PROFILE_TABLE.",
    );
  }
  return { region, jobsTable, applicationsTable, profileTable };
}

function privateResponse() {
  setResponseHeaders(new Headers({ "Cache-Control": "no-store", Vary: "Cookie, Authorization" }));
}

function client(region: string) {
  return DynamoDBDocumentClient.from(new DynamoDBClient(getAwsClientOptions(region)), {
    marshallOptions: { removeUndefinedValues: true },
  });
}

async function getActor() {
  return requireAuthenticatedUser();
}

async function getProfile(
  db: DynamoDBDocumentClient,
  table: string,
  userId: string,
): Promise<Record<string, unknown>> {
  const result = await db.send(
    new GetCommand({ TableName: table, Key: { pk: `USER#${userId}`, sk: "PROFILE" } }),
  );
  return (result.Item ?? {}) as Record<string, unknown>;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toJob(item: Record<string, unknown>): JobPost {
  return item.job as JobPost;
}

function toApplication(item: Record<string, unknown>): JobApplication {
  return item.application as JobApplication;
}

async function getJobForOwner(
  db: DynamoDBDocumentClient,
  table: string,
  jobId: string,
  userId: string,
) {
  const result = await db.send(
    new GetCommand({ TableName: table, Key: { pk: `JOB#${jobId}`, sk: `JOB#${jobId}` } }),
  );
  const jobItem = result.Item as Record<string, unknown> | undefined;
  const job = jobItem?.job as JobPost | undefined;
  if (!job) throw new Error("Job not found.");
  if (job.employerId !== userId) throw new Error("You are not authorized to manage this job.");
  return { job, jobItem };
}

export const getPublishedJobs = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        search: z.string().trim().max(120).optional(),
        category: z.string().trim().max(120).optional(),
        state: z.string().trim().max(80).optional(),
        jobType: z.string().trim().max(80).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const config = getConfig();
    const db = client(config.region);
    const response = await db.send(
      new QueryCommand({
        TableName: config.jobsTable,
        IndexName: "GSI1",
        KeyConditionExpression: "gsi1pk = :status",
        ExpressionAttributeValues: { ":status": "JOB_STATUS#published" },
        ScanIndexForward: false,
      }),
    );
    const search = data.search?.toLowerCase();
    return (response.Items ?? [])
      .map((item) => toJob(item as Record<string, unknown>))
      .filter((job) => {
        if (data.category && job.category !== data.category) return false;
        if (data.state && job.state.toLowerCase() !== data.state.toLowerCase()) return false;
        if (data.jobType && job.jobType !== data.jobType) return false;
        if (!search) return true;
        return [job.title, job.company, job.description, ...job.skillsRequired]
          .join(" ")
          .toLowerCase()
          .includes(search);
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });

export const getJobById = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => jobIdSchema.parse(input))
  .handler(async ({ data }) => {
    const config = getConfig();
    const db = client(config.region);
    const response = await db.send(
      new GetCommand({
        TableName: config.jobsTable,
        Key: { pk: `JOB#${data.jobId}`, sk: `JOB#${data.jobId}` },
      }),
    );
    const item = response.Item as Record<string, unknown> | undefined;
    return item?.status === "published" && item.job ? toJob(item) : null;
  });

export const createJob = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => jobInputSchema.parse(input))
  .handler(async ({ data }) => {
    privateResponse();
    const config = getConfig();
    const actor = await getActor();
    const db = client(config.region);
    const profile = await getProfile(db, config.profileTable, actor.userId);
    const source = data.job as Partial<JobPost>;
    const now = new Date().toISOString();
    const id = randomUUID();
    const companyName = asString(
      profile.business && typeof profile.business === "object"
        ? (profile.business as Record<string, unknown>).name
        : undefined,
      asString(profile.fullName, "FarmX Employer"),
    );
    const job: JobPost = {
      ...(source as JobPost),
      id,
      employerId: actor.userId,
      company: companyName,
      title: asString(source.title, "").trim(),
      description: asString(source.description, "").trim(),
      category: source.category as JobPost["category"],
      subcategory: asString(source.subcategory),
      location: asString(source.location, asString(profile.location)),
      state: asString(source.state, asString(profile.state)),
      employer: {
        name: asString(profile.fullName, actor.email ?? "FarmX Employer"),
        companyName,
        verified: profile.verification === "approved",
        rating: asNumber(profile.rating),
        location: asString(profile.location, asString(profile.state)),
        logo: asString(profile.photoKey) || undefined,
      },
      status: source.status === "draft" ? "draft" : "published",
      featured: source.featured === true,
      createdAt: now,
      updatedAt: now,
      stats: { views: 0, saves: 0, shares: 0, applications: 0 },
    };
    if (!job.title || !job.description || !job.category || !job.deadline) {
      throw new Error("Title, description, category, and deadline are required.");
    }
    await db.send(
      new PutCommand({
        TableName: config.jobsTable,
        Item: {
          pk: `JOB#${id}`,
          sk: `JOB#${id}`,
          gsi1pk: `JOB_STATUS#${job.status}`,
          gsi1sk: `${job.createdAt}#${id}`,
          gsi2pk: `EMPLOYER#${actor.userId}`,
          gsi2sk: `${job.createdAt}#${id}`,
          entityType: "JOB",
          status: job.status,
          employerId: actor.userId,
          job,
        },
        ConditionExpression: "attribute_not_exists(pk)",
      }),
    );
    return job;
  });

export const updateJob = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => jobUpdateSchema.parse(input))
  .handler(async ({ data }) => {
    privateResponse();
    const config = getConfig();
    const actor = await getActor();
    const db = client(config.region);
    const { job } = await getJobForOwner(db, config.jobsTable, data.jobId, actor.userId);
    const updated: JobPost = {
      ...job,
      ...(data.updates as Partial<JobPost>),
      updatedAt: new Date().toISOString(),
    };
    await db.send(
      new UpdateCommand({
        TableName: config.jobsTable,
        Key: { pk: `JOB#${data.jobId}`, sk: `JOB#${data.jobId}` },
        UpdateExpression:
          "SET #job = :job, #status = :status, updatedAt = :updatedAt, gsi1pk = :gsi1pk, gsi1sk = :gsi1sk",
        ExpressionAttributeNames: { "#job": "job", "#status": "status" },
        ExpressionAttributeValues: {
          ":job": updated,
          ":status": updated.status,
          ":updatedAt": updated.updatedAt,
          ":gsi1pk": `JOB_STATUS#${updated.status}`,
          ":gsi1sk": `${updated.createdAt}#${updated.id}`,
        },
      }),
    );
    return updated;
  });

export const deleteJob = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => jobIdSchema.parse(input))
  .handler(async ({ data }) => {
    privateResponse();
    const config = getConfig();
    const actor = await getActor();
    const db = client(config.region);
    await getJobForOwner(db, config.jobsTable, data.jobId, actor.userId);
    await db.send(
      new DeleteCommand({
        TableName: config.jobsTable,
        Key: { pk: `JOB#${data.jobId}`, sk: `JOB#${data.jobId}` },
      }),
    );
  });

export const getApplications = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => applicationQuerySchema.parse(input))
  .handler(async ({ data }) => {
    privateResponse();
    const config = getConfig();
    const actor = await getActor();
    const db = client(config.region);
    if (data.employerId && data.employerId !== actor.userId)
      throw new Error("Unauthorized application access.");
    const userId = data.employerId ?? actor.userId;
    if (!data.employerId) {
      const response = await db.send(
        new QueryCommand({
          TableName: config.applicationsTable,
          IndexName: "GSI1",
          KeyConditionExpression: "gsi1pk = :pk",
          ExpressionAttributeValues: { ":pk": `APPLICANT#${userId}` },
          ScanIndexForward: false,
        }),
      );
      return (response.Items ?? []).map((item) => toApplication(item as Record<string, unknown>));
    }
    const jobs = await db.send(
      new QueryCommand({
        TableName: config.jobsTable,
        IndexName: "GSI2",
        KeyConditionExpression: "gsi2pk = :pk",
        ExpressionAttributeValues: { ":pk": `EMPLOYER#${userId}` },
      }),
    );
    const applications = await Promise.all(
      (jobs.Items ?? []).map(async (jobItem) => {
        const jobId = String((jobItem as Record<string, unknown>).jobId ?? "");
        const job = (jobItem as Record<string, unknown>).job as JobPost | undefined;
        if (!jobId && !job?.id) return [];
        const response = await db.send(
          new QueryCommand({
            TableName: config.applicationsTable,
            IndexName: "GSI2",
            KeyConditionExpression: "gsi2pk = :pk",
            ExpressionAttributeValues: { ":pk": `JOB#${jobId || job?.id}` },
            ScanIndexForward: false,
          }),
        );
        return (response.Items ?? []).map((item) => toApplication(item as Record<string, unknown>));
      }),
    );
    return applications.flat();
  });

export const applyForJob = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => applicationInputSchema.parse(input))
  .handler(async ({ data }) => {
    privateResponse();
    const config = getConfig();
    const actor = await getActor();
    const db = client(config.region);
    const jobResult = await db.send(
      new GetCommand({
        TableName: config.jobsTable,
        Key: { pk: `JOB#${data.jobId}`, sk: `JOB#${data.jobId}` },
      }),
    );
    const jobItem = jobResult.Item as Record<string, unknown> | undefined;
    const job = jobItem?.job as JobPost | undefined;
    if (!job || job.status !== "published") throw new Error("This job is no longer available.");
    if (job.employerId === actor.userId) throw new Error("You cannot apply to your own job.");
    const existing = await db.send(
      new QueryCommand({
        TableName: config.applicationsTable,
        IndexName: "GSI1",
        KeyConditionExpression: "gsi1pk = :pk",
        FilterExpression: "jobId = :jobId",
        ExpressionAttributeValues: { ":pk": `APPLICANT#${actor.userId}`, ":jobId": data.jobId },
        Limit: 1,
      }),
    );
    if ((existing.Items ?? []).length)
      throw new Error("You have already applied for this position.");
    const profile = await getProfile(db, config.profileTable, actor.userId);
    const now = new Date().toISOString();
    const id = randomUUID();
    const application: JobApplication = {
      id,
      jobId: job.id,
      jobTitle: job.title,
      companyName: job.company,
      userId: actor.userId,
      applicantName: asString(
        profile.fullName,
        data.applicantName ?? actor.email ?? "FarmX Member",
      ),
      applicantEmail: actor.email ?? data.applicantEmail ?? "",
      applicantPhone: asString(profile.phone, data.applicantPhone),
      applicantLocation: asString(profile.location, data.applicantLocation),
      cvKey: data.cvKey,
      answers: data.answers,
      status: "Applied",
      appliedAt: now,
      updatedAt: now,
    };
    await db.send(
      new PutCommand({
        TableName: config.applicationsTable,
        Item: {
          pk: `APPLICATION#${id}`,
          sk: `APPLICATION#${id}`,
          gsi1pk: `APPLICANT#${actor.userId}`,
          gsi1sk: `${now}#${id}`,
          gsi2pk: `JOB#${job.id}`,
          gsi2sk: `${now}#${id}`,
          entityType: "JOB_APPLICATION",
          jobId: job.id,
          employerId: job.employerId,
          status: "Applied",
          application,
        },
        ConditionExpression: "attribute_not_exists(pk)",
      }),
    );
    await db.send(
      new UpdateCommand({
        TableName: config.jobsTable,
        Key: { pk: `JOB#${job.id}`, sk: `JOB#${job.id}` },
        UpdateExpression:
          "SET #job.stats.applications = if_not_exists(#job.stats.applications, :zero) + :one",
        ExpressionAttributeNames: { "#job": "job" },
        ExpressionAttributeValues: { ":zero": 0, ":one": 1 },
      }),
    );
    return application;
  });

export const updateApplicationStatus = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => applicationStatusSchema.parse(input))
  .handler(async ({ data }) => {
    privateResponse();
    const config = getConfig();
    const actor = await getActor();
    const db = client(config.region);
    const response = await db.send(
      new GetCommand({
        TableName: config.applicationsTable,
        Key: { pk: `APPLICATION#${data.applicationId}`, sk: `APPLICATION#${data.applicationId}` },
      }),
    );
    const item = response.Item as Record<string, unknown> | undefined;
    const application = item?.application as JobApplication | undefined;
    if (!application) throw new Error("Application not found.");
    const jobResult = await db.send(
      new GetCommand({
        TableName: config.jobsTable,
        Key: { pk: `JOB#${application.jobId}`, sk: `JOB#${application.jobId}` },
      }),
    );
    const job = (jobResult.Item as Record<string, unknown> | undefined)?.job as JobPost | undefined;
    const isEmployer = job?.employerId === actor.userId;
    const isApplicant = application.userId === actor.userId;
    if (!isEmployer && !(isApplicant && data.status === "Withdrawn"))
      throw new Error("You are not authorized to update this application.");
    const updated = {
      ...application,
      status: data.status as ApplicationStatus,
      notes: data.notes ?? application.notes,
      interview: data.interview ?? application.interview,
      updatedAt: new Date().toISOString(),
    };
    await db.send(
      new UpdateCommand({
        TableName: config.applicationsTable,
        Key: { pk: `APPLICATION#${data.applicationId}`, sk: `APPLICATION#${data.applicationId}` },
        UpdateExpression:
          "SET #application = :application, #status = :status, updatedAt = :updatedAt",
        ExpressionAttributeNames: { "#application": "application", "#status": "status" },
        ExpressionAttributeValues: {
          ":application": updated,
          ":status": updated.status,
          ":updatedAt": updated.updatedAt,
        },
      }),
    );
    return updated;
  });

export const getSavedJobIds = createServerFn({ method: "GET" }).handler(async () => {
  privateResponse();
  const config = getConfig();
  const actor = await getActor();
  const db = client(config.region);
  const response = await db.send(
    new QueryCommand({
      TableName: config.profileTable,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
      ExpressionAttributeValues: { ":pk": `USER#${actor.userId}`, ":prefix": "SAVED_JOB#" },
    }),
  );
  return (response.Items ?? []).map((item) =>
    String(item.jobId ?? String(item.sk).replace("SAVED_JOB#", "")),
  );
});

export const toggleSaveJob = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => savedJobSchema.parse(input))
  .handler(async ({ data }) => {
    privateResponse();
    const config = getConfig();
    const actor = await getActor();
    const db = client(config.region);
    const key = { pk: `USER#${actor.userId}`, sk: `SAVED_JOB#${data.jobId}` };
    const existing = await db.send(new GetCommand({ TableName: config.profileTable, Key: key }));
    if (existing.Item) {
      await db.send(new DeleteCommand({ TableName: config.profileTable, Key: key }));
      return false;
    }
    await db.send(
      new PutCommand({
        TableName: config.profileTable,
        Item: {
          ...key,
          entityType: "SAVED_JOB",
          jobId: data.jobId,
          createdAt: new Date().toISOString(),
        },
        ConditionExpression: "attribute_not_exists(pk)",
      }),
    );
    return true;
  });

export const incrementJobView = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => jobIdSchema.parse(input))
  .handler(async ({ data }) => {
    const config = getConfig();
    const db = client(config.region);
    await db.send(
      new UpdateCommand({
        TableName: config.jobsTable,
        Key: { pk: `JOB#${data.jobId}`, sk: `JOB#${data.jobId}` },
        UpdateExpression: "SET #job.stats.views = if_not_exists(#job.stats.views, :zero) + :one",
        ExpressionAttributeNames: { "#job": "job" },
        ExpressionAttributeValues: { ":zero": 0, ":one": 1 },
      }),
    );
    return { recorded: true };
  });

export const getJobsForEmployer = createServerFn({ method: "GET" }).handler(async () => {
  const config = getConfig();
  const actor = await getActor();
  const db = client(config.region);
  const response = await db.send(
    new QueryCommand({
      TableName: config.jobsTable,
      IndexName: "GSI2",
      KeyConditionExpression: "gsi2pk = :pk",
      ExpressionAttributeValues: { ":pk": `EMPLOYER#${actor.userId}` },
      ScanIndexForward: false,
    }),
  );
  return (response.Items ?? []).map((item) => toJob(item as Record<string, unknown>));
});

export const getJobApplicationById = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ applicationId: z.string().trim().min(1).max(180) }).parse(input),
  )
  .handler(async ({ data }) => {
    const config = getConfig();
    const actor = await getActor();
    const db = client(config.region);
    const response = await db.send(
      new GetCommand({
        TableName: config.applicationsTable,
        Key: { pk: `APPLICATION#${data.applicationId}`, sk: `APPLICATION#${data.applicationId}` },
      }),
    );
    const item = response.Item as Record<string, unknown> | undefined;
    const application = item?.application as JobApplication | undefined;
    if (!application) return null;
    if (application.userId !== actor.userId) {
      const job = await getJobForOwner(db, config.jobsTable, application.jobId, actor.userId);
      if (!job) throw new Error("Unauthorized.");
    }
    return application;
  });

export type { JobPost, JobApplication } from "./job.types";

export const jobServiceStatus = {
  statuses: ["draft", "published", "paused", "closed", "expired"] as const,
};
