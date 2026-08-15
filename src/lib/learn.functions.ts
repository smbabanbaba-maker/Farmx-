import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, setResponseHeaders } from "@tanstack/react-start/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { z } from "zod";
import { getAwsClientOptions } from "@/lib/aws-config";
import { requireAuthenticatedUser as requireAuth } from "@/lib/auth-server";
import type { Course, CourseEnrollment, CourseCertificate } from "./learn.types";

const courseIdSchema = z.object({ courseId: z.string().min(1).max(120) });
const enrollmentSchema = z.object({
  courseId: z.string().min(1).max(120),
  registrationDetails: z.object({
    fullName: z.string().trim().min(2).max(80),
    phone: z.string().trim().min(7).max(30),
    email: z.string().email().max(120),
    state: z.string().trim().min(2).max(80),
    lga: z.string().trim().max(80).optional(),
    city: z.string().trim().max(120).optional(),
    occupation: z.string().trim().max(120).optional(),
    educationLevel: z.string().trim().max(120).optional(),
    experience: z.string().trim().max(500).optional(),
    customAnswers: z.record(z.string(), z.string().max(500)).optional(),
  }),
});
const progressSchema = z.object({
  enrollmentId: z.string().min(1).max(150),
  lessonId: z.string().min(1).max(150),
});
const adminCourseSchema = z.object({
  course: z.record(z.string(), z.unknown()),
});
const adminUpdateSchema = z.object({
  courseId: z.string().min(1).max(120),
  updates: z.record(z.string(), z.unknown()),
});

function hasLearnProductionConfig() {
  return Boolean(
    process.env.AWS_REGION &&
    process.env.FARMX_LEARN_TABLE &&
    (process.env.COGNITO_USER_POOL_ID ?? process.env.VITE_COGNITO_USER_POOL_ID) &&
    (process.env.COGNITO_WEB_CLIENT_ID ?? process.env.VITE_COGNITO_WEB_CLIENT_ID),
  );
}

export const getLearnRuntimeMode = createServerFn({ method: "GET" }).handler(async () => ({
  mode: hasLearnProductionConfig() ? ("production" as const) : ("preview" as const),
}));

function getConfig() {
  const region = process.env.AWS_REGION;
  const learnTable = process.env.FARMX_LEARN_TABLE;
  if (!region || !learnTable) {
    throw new Error(
      "Learn service is not configured. Set AWS_REGION and FARMX_LEARN_TABLE on the FarmX server.",
    );
  }
  return { region, learnTable };
}

function privateResponse() {
  setResponseHeaders(new Headers({ "Cache-Control": "no-store", Vary: "Cookie, Authorization" }));
}

function createDocumentClient(region: string) {
  return DynamoDBDocumentClient.from(new DynamoDBClient(getAwsClientOptions(region)), {
    marshallOptions: { removeUndefinedValues: true },
  });
}

async function requireAuthenticatedUser() {
  return requireAuth();
}

async function requireLearnAdmin() {
  const actor = await requireAuth();
  const configuredIds = new Set(
    (process.env.FARMX_LEARN_ADMIN_USER_IDS ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
  const isAdmin =
    actor.groups.some((group) => ["admin", "content_manager", "instructor"].includes(group)) ||
    configuredIds.has(actor.userId);
  if (!isAdmin) throw new Error("Only authorized FarmX content managers can manage courses.");
  return actor;
}

function mapCourse(item: Record<string, unknown>): Course {
  return item.course as Course;
}

function mapEnrollment(item: Record<string, unknown>): CourseEnrollment {
  return item.enrollment as CourseEnrollment;
}

export const getPublishedLearnCourses = createServerFn({
  method: "GET",
}).handler(async () => {
  const config = getConfig();
  const client = createDocumentClient(config.region);
  const response = await client.send(
    new ScanCommand({
      TableName: config.learnTable,
      FilterExpression: "entityType = :entityType AND #status = :status",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":entityType": "COURSE",
        ":status": "published",
      },
    }),
  );
  return (response.Items ?? []).map(mapCourse);
});

export const getLearnCourseById = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => courseIdSchema.parse(input))
  .handler(async ({ data }) => {
    const config = getConfig();
    const client = createDocumentClient(config.region);
    const response = await client.send(
      new GetCommand({
        TableName: config.learnTable,
        Key: { pk: `COURSE#${data.courseId}`, sk: `COURSE#${data.courseId}` },
      }),
    );
    const course = response.Item ? mapCourse(response.Item) : null;
    if (course?.status !== "published") return null;
    return course;
  });

export const getMyLearnEnrollments = createServerFn({ method: "GET" }).handler(async () => {
  privateResponse();
  const config = getConfig();
  const actor = await requireAuthenticatedUser();
  const client = createDocumentClient(config.region);
  const response = await client.send(
    new QueryCommand({
      TableName: config.learnTable,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
      ExpressionAttributeValues: {
        ":pk": `USER#${actor.userId}`,
        ":sk": "ENROLLMENT#",
      },
      ScanIndexForward: false,
    }),
  );
  return (response.Items ?? []).map(mapEnrollment);
});

export const getMyLearnEnrollment = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => courseIdSchema.parse(input))
  .handler(async ({ data }) => {
    privateResponse();
    const config = getConfig();
    const actor = await requireAuthenticatedUser();
    const client = createDocumentClient(config.region);
    const response = await client.send(
      new GetCommand({
        TableName: config.learnTable,
        Key: { pk: `USER#${actor.userId}`, sk: `ENROLLMENT#${data.courseId}` },
      }),
    );
    return response.Item ? mapEnrollment(response.Item) : null;
  });

export const enrollInFreeLearnCourse = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => enrollmentSchema.parse(input))
  .handler(async ({ data }) => {
    privateResponse();
    const config = getConfig();
    const actor = await requireAuthenticatedUser();
    const client = createDocumentClient(config.region);
    const courseResponse = await client.send(
      new GetCommand({
        TableName: config.learnTable,
        Key: { pk: `COURSE#${data.courseId}`, sk: `COURSE#${data.courseId}` },
      }),
    );
    const course = courseResponse.Item ? mapCourse(courseResponse.Item) : null;
    if (!course || course.status !== "published") throw new Error("Course is not available.");
    if (course.accessType !== "FREE")
      throw new Error("This course requires verified payment before enrollment.");
    const now = new Date().toISOString();
    const enrollment: CourseEnrollment = {
      id: `${actor.userId}:${data.courseId}`,
      userId: actor.userId,
      courseId: data.courseId,
      enrolledAt: now,
      status: "active",
      progressPercent: 0,
      completedLessonIds: [],
      registrationDetails: data.registrationDetails,
    };
    await client.send(
      new PutCommand({
        TableName: config.learnTable,
        Item: {
          pk: `USER#${actor.userId}`,
          sk: `ENROLLMENT#${data.courseId}`,
          entityType: "ENROLLMENT",
          courseId: data.courseId,
          userId: actor.userId,
          enrollment,
          createdAt: now,
          updatedAt: now,
        },
        ConditionExpression: "attribute_not_exists(pk)",
      }),
    );
    return enrollment;
  });

export const updateLearnProgress = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => progressSchema.parse(input))
  .handler(async ({ data }) => {
    privateResponse();
    const config = getConfig();
    const actor = await requireAuthenticatedUser();
    const client = createDocumentClient(config.region);
    const response = await client.send(
      new QueryCommand({
        TableName: config.learnTable,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
        ExpressionAttributeValues: {
          ":pk": `USER#${actor.userId}`,
          ":sk": "ENROLLMENT#",
        },
      }),
    );
    const item = (response.Items ?? []).find(
      (candidate) =>
        candidate.enrollmentId === data.enrollmentId ||
        candidate.enrollment?.id === data.enrollmentId,
    );
    if (!item?.enrollment) throw new Error("Enrollment not found.");
    const enrollment = mapEnrollment(item);
    if (!enrollment.completedLessonIds.includes(data.lessonId))
      enrollment.completedLessonIds.push(data.lessonId);
    enrollment.lastLessonId = data.lessonId;
    const courseResponse = await client.send(
      new GetCommand({
        TableName: config.learnTable,
        Key: {
          pk: `COURSE#${enrollment.courseId}`,
          sk: `COURSE#${enrollment.courseId}`,
        },
      }),
    );
    const course = courseResponse.Item ? mapCourse(courseResponse.Item) : null;
    const totalLessons =
      course?.modules.reduce((total, module) => total + module.lessons.length, 0) ?? 0;
    enrollment.progressPercent = totalLessons
      ? Math.min(100, Math.round((enrollment.completedLessonIds.length / totalLessons) * 100))
      : 0;
    enrollment.status = enrollment.progressPercent === 100 ? "completed" : "active";
    await client.send(
      new UpdateCommand({
        TableName: config.learnTable,
        Key: { pk: item.pk, sk: item.sk },
        UpdateExpression: "SET enrollment = :enrollment, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":enrollment": enrollment,
          ":updatedAt": new Date().toISOString(),
        },
        ConditionExpression: "attribute_exists(pk)",
      }),
    );
    return enrollment;
  });

export const getMyLearnCertificates = createServerFn({ method: "GET" }).handler(async () => {
  privateResponse();
  const config = getConfig();
  const actor = await requireAuthenticatedUser();
  const client = createDocumentClient(config.region);
  const response = await client.send(
    new QueryCommand({
      TableName: config.learnTable,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
      ExpressionAttributeValues: {
        ":pk": `USER#${actor.userId}`,
        ":sk": "CERTIFICATE#",
      },
      ScanIndexForward: false,
    }),
  );
  return (response.Items ?? []).map((item) => item.certificate as CourseCertificate);
});

export const createLearnCourse = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => adminCourseSchema.parse(input))
  .handler(async ({ data }) => {
    privateResponse();
    const config = getConfig();
    const actor = await requireLearnAdmin();
    const course = data.course as unknown as Course;
    const now = new Date().toISOString();
    await createDocumentClient(config.region).send(
      new PutCommand({
        TableName: config.learnTable,
        Item: {
          pk: `COURSE#${course.id}`,
          sk: `COURSE#${course.id}`,
          entityType: "COURSE",
          status: "draft",
          course: {
            ...course,
            status: "draft",
            createdAt: now,
            updatedAt: now,
          },
          createdBy: actor.userId,
          createdAt: now,
          updatedAt: now,
        },
        ConditionExpression: "attribute_not_exists(pk)",
      }),
    );
    return { courseId: course.id, status: "draft" as const };
  });

export const updateLearnCourse = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => adminUpdateSchema.parse(input))
  .handler(async ({ data }) => {
    privateResponse();
    const config = getConfig();
    const actor = await requireLearnAdmin();
    const now = new Date().toISOString();
    await createDocumentClient(config.region).send(
      new UpdateCommand({
        TableName: config.learnTable,
        Key: { pk: `COURSE#${data.courseId}`, sk: `COURSE#${data.courseId}` },
        UpdateExpression:
          "SET course = :course, #status = :status, updatedAt = :updatedAt, updatedBy = :updatedBy",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":course": data.updates,
          ":status": typeof data.updates.status === "string" ? data.updates.status : "draft",
          ":updatedAt": now,
          ":updatedBy": actor.userId,
        },
        ConditionExpression: "attribute_exists(pk)",
      }),
    );
    return { courseId: data.courseId, updatedAt: now };
  });

export const deleteLearnCourse = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => courseIdSchema.parse(input))
  .handler(async ({ data }) => {
    privateResponse();
    const config = getConfig();
    await requireLearnAdmin();
    await createDocumentClient(config.region).send(
      new DeleteCommand({
        TableName: config.learnTable,
        Key: { pk: `COURSE#${data.courseId}`, sk: `COURSE#${data.courseId}` },
        ConditionExpression: "attribute_exists(pk)",
      }),
    );
    return { courseId: data.courseId };
  });
