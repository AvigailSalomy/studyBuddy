import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Integration tests against the REAL Supabase project configured in
// .env.local (no separate test project, no Service Role Key -- see
// tests/env.ts). These authenticate as the two dedicated test accounts
// and exercise real RLS policies/DB constraints directly, bypassing the
// app's Server Actions entirely (those require a live Next.js request
// context -- see PRESENTATION_TECHNICAL_STUDY_GUIDE.md section 15).
// All data created here is TEST_-prefixed and removed in afterAll.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const TEST_INSTITUTION = "TEST_ University";
const TEST_FACULTY = "TEST_ Computer Science";
const TEST_COURSE_NAME = "TEST_ Integration Course";

async function signIn(email: string, password: string) {
  const client = createClient(url, anonKey);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    throw new Error(`Sign-in failed for ${email}: ${error?.message ?? "no user"}`);
  }
  return { client, userId: data.user.id };
}

async function findOrCreateTestCourse(client: SupabaseClient): Promise<string> {
  const existing = await client
    .from("courses")
    .select("id")
    .eq("institution", TEST_INSTITUTION)
    .eq("faculty", TEST_FACULTY)
    .ilike("course_name", TEST_COURSE_NAME)
    .maybeSingle();
  if (existing.data) return existing.data.id;

  const inserted = await client
    .from("courses")
    .insert({ institution: TEST_INSTITUTION, faculty: TEST_FACULTY, course_name: TEST_COURSE_NAME })
    .select("id")
    .single();
  if (!inserted.error) return inserted.data.id;

  // Race with another run creating the same course at the same time --
  // same fallback findOrCreateCourse itself uses (actions/courses.ts).
  const retry = await client
    .from("courses")
    .select("id")
    .eq("institution", TEST_INSTITUTION)
    .eq("faculty", TEST_FACULTY)
    .ilike("course_name", TEST_COURSE_NAME)
    .single();
  if (retry.data) return retry.data.id;
  throw new Error(`Could not find or create test course: ${inserted.error.message}`);
}

let clientA: SupabaseClient;
let clientB: SupabaseClient;
let userAId: string;
let userBId: string;
let groupId: string;

beforeAll(async () => {
  const emailA = process.env.TEST_USER_A_EMAIL;
  const passwordA = process.env.TEST_USER_A_PASSWORD;
  const emailB = process.env.TEST_USER_B_EMAIL;
  const passwordB = process.env.TEST_USER_B_PASSWORD;
  if (!emailA || !passwordA || !emailB || !passwordB) {
    throw new Error(
      "TEST_USER_A_EMAIL/PASSWORD and TEST_USER_B_EMAIL/PASSWORD must be set in .env.test.local",
    );
  }

  const a = await signIn(emailA, passwordA);
  clientA = a.client;
  userAId = a.userId;
  const b = await signIn(emailB, passwordB);
  clientB = b.client;
  userBId = b.userId;

  const courseId = await findOrCreateTestCourse(clientA);

  const groupInsert = await clientA
    .from("groups")
    .insert({
      name: `TEST_ RLS Group ${Date.now()}`,
      group_type: "study",
      course_id: courseId,
      max_members: 5,
      owner_id: userAId,
    })
    .select("id")
    .single();
  if (groupInsert.error) {
    throw new Error(`Failed to create test group: ${groupInsert.error.message}`);
  }
  groupId = groupInsert.data.id;

  const memberInsert = await clientA
    .from("group_members")
    .insert({ group_id: groupId, profile_id: userAId, role: "owner" });
  if (memberInsert.error) {
    throw new Error(`Failed to add owner membership: ${memberInsert.error.message}`);
  }

  // Seed one row per member-only table, created by A (the real member),
  // so the "non-member sees nothing" assertions below are meaningful
  // (an empty table would also return zero rows regardless of RLS).
  await clientA.from("tasks").insert({ group_id: groupId, created_by: userAId, title: "TEST_ fixture task" });
  await clientA
    .from("chat_messages")
    .insert({ group_id: groupId, sender_id: userAId, content: "TEST_ fixture message" });
  await clientA.from("materials").insert({
    group_id: groupId,
    uploaded_by: userAId,
    title: "TEST_ fixture material",
    file_name: "fixture.txt",
    storage_path: `${groupId}/fixture.txt`,
    category: "other",
    file_size: 100,
  });
});

afterAll(async () => {
  if (groupId) {
    // Deleting the group cascades group_members/join_requests/materials/
    // chat_messages/meetings/tasks automatically (ON DELETE CASCADE) --
    // see supabase/migrations/20260805151318_initial_schema.sql. The
    // shared TEST_ course is deliberately left in place for reuse by
    // future runs, matching the app's own findOrCreateCourse behavior.
    await clientA.from("groups").delete().eq("id", groupId);
  }
  await clientA?.auth.signOut();
  await clientB?.auth.signOut();
});

describe("RLS: member-only tables are invisible to a non-member", () => {
  it("tasks: non-member sees zero rows even though a row exists", async () => {
    const { data, error } = await clientB.from("tasks").select("id").eq("group_id", groupId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("chat_messages: non-member sees zero rows even though a row exists", async () => {
    const { data, error } = await clientB.from("chat_messages").select("id").eq("group_id", groupId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("materials: non-member sees zero rows even though a row exists", async () => {
    const { data, error } = await clientB.from("materials").select("id").eq("group_id", groupId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});

describe("RLS/DB: duplicate pending join request is rejected", () => {
  it("a second pending request from the same user to the same group fails with 23505", async () => {
    const first = await clientB
      .from("join_requests")
      .insert({ group_id: groupId, profile_id: userBId, status: "pending" });
    expect(first.error).toBeNull();

    const second = await clientB
      .from("join_requests")
      .insert({ group_id: groupId, profile_id: userBId, status: "pending" });
    expect(second.error).not.toBeNull();
    expect(second.error?.code).toBe("23505");
  });
});

describe("RLS: approval grants immediate access, matching approveJoinRequest's own writes", () => {
  it("after group_members insert + join_requests approval, the new member sees group content", async () => {
    const memberInsert = await clientA
      .from("group_members")
      .insert({ group_id: groupId, profile_id: userBId, role: "member" });
    expect(memberInsert.error).toBeNull();

    const statusUpdate = await clientA
      .from("join_requests")
      .update({ status: "approved" })
      .eq("group_id", groupId)
      .eq("profile_id", userBId)
      .eq("status", "pending");
    expect(statusUpdate.error).toBeNull();

    const { data, error } = await clientB.from("tasks").select("id").eq("group_id", groupId);
    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThan(0);
  });
});
