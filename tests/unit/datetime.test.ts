import { describe, it, expect } from "vitest";
import {
  isMeetingTimeInFuture,
  MEETING_TIME_SUBMISSION_GRACE_MS,
  localDateTimeToUtcIso,
  upcomingMeetingsCutoffIso,
  utcIsoToLocalDateTimeInputValue,
} from "@/lib/datetime";

describe("isMeetingTimeInFuture", () => {
  it("accepts a time picked 1 minute ahead even after ~90s of submission latency", () => {
    // Reproduces the reported bug directly: user picks "+1 minute" at
    // t=0, but the server only evaluates the check 90 seconds later
    // (typing the rest of the form + network round trip).
    const pickedAt = Date.now();
    const meetingTime = new Date(pickedAt + 60_000).toISOString(); // +1 min
    const serverCheckTime = pickedAt + 90_000; // 90s of latency
    expect(isMeetingTimeInFuture(meetingTime, serverCheckTime)).toBe(true);
  });

  it("accepts a time picked 2 minutes ahead even after ~90s of submission latency", () => {
    const pickedAt = Date.now();
    const meetingTime = new Date(pickedAt + 120_000).toISOString(); // +2 min
    const serverCheckTime = pickedAt + 90_000;
    expect(isMeetingTimeInFuture(meetingTime, serverCheckTime)).toBe(true);
  });

  it("accepts a time picked 3 minutes ahead with no latency at all", () => {
    const now = Date.now();
    const meetingTime = new Date(now + 3 * 60_000).toISOString();
    expect(isMeetingTimeInFuture(meetingTime, now)).toBe(true);
  });

  it("still rejects a time that is genuinely in the past, latency or not", () => {
    const now = Date.now();
    const anHourAgo = new Date(now - 60 * 60_000).toISOString();
    expect(isMeetingTimeInFuture(anHourAgo, now)).toBe(false);
  });

  it("rejects a time further in the past than the grace period covers", () => {
    const now = Date.now();
    const wayPast = new Date(now - (MEETING_TIME_SUBMISSION_GRACE_MS + 60_000)).toISOString();
    expect(isMeetingTimeInFuture(wayPast, now)).toBe(false);
  });
});

describe("upcomingMeetingsCutoffIso", () => {
  it("a meeting created moments ago, whose time has just barely elapsed, still counts as upcoming", () => {
    const now = Date.now();
    // Reproduces the second bug: a meeting picked "+1 minute" but
    // submitted ~75s later has a meeting_time that's already ~15s in
    // the past by the time the list re-queries -- it must still be
    // "> cutoff" so it doesn't vanish from the upcoming list.
    const meetingTime = new Date(now - 15_000).toISOString();
    const cutoff = upcomingMeetingsCutoffIso(now);
    expect(meetingTime > cutoff).toBe(true);
  });

  it("a meeting from an hour ago is correctly excluded", () => {
    const now = Date.now();
    const meetingTime = new Date(now - 60 * 60_000).toISOString();
    const cutoff = upcomingMeetingsCutoffIso(now);
    expect(meetingTime > cutoff).toBe(false);
  });
});

describe("localDateTimeToUtcIso / utcIsoToLocalDateTimeInputValue round-trip", () => {
  it("round-trips a datetime-local value back to itself", () => {
    const local = "2026-09-01T11:05";
    const utc = localDateTimeToUtcIso(local);
    expect(utc).not.toBeNull();
    expect(utcIsoToLocalDateTimeInputValue(utc!)).toBe(local);
  });

  it("returns null for an invalid value", () => {
    expect(localDateTimeToUtcIso("not-a-date")).toBeNull();
  });
});
