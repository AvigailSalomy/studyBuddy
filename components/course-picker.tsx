"use client";

import { useEffect, useState } from "react";
import { searchCourses, findOrCreateCourse } from "@/actions/courses";
import type { Course } from "@/types/course";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Single-select course search/create, scoped server-side to the current
// user's own institution/faculty (see actions/courses.ts). Used by group
// creation -- courses themselves aren't managed anywhere else anymore.
export function CoursePicker({
  value,
  onChange,
}: {
  value: Course | null;
  onChange: (course: Course | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Course[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      return;
    }

    const timeout = setTimeout(() => {
      setSearching(true);
      searchCourses({ query: trimmed }).then((result) => {
        setSearching(false);
        if (!result.success) {
          setError(result.error);
          return;
        }
        setError(null);
        setSuggestions(result.courses);
      });
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  const trimmedQuery = query.trim();
  const visibleSuggestions = trimmedQuery.length === 0 ? [] : suggestions;
  const exactMatchExists =
    trimmedQuery.length > 0 &&
    suggestions.some(
      (c) => c.course_name.toLowerCase() === trimmedQuery.toLowerCase(),
    );

  async function handleCreate() {
    if (!trimmedQuery) return;
    setCreating(true);
    setError(null);
    const result = await findOrCreateCourse({ courseName: trimmedQuery });
    setCreating(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onChange(result.course);
    setQuery("");
    setSuggestions([]);
  }

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
        <span>{value.course_name}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(null)}
        >
          Change
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Input
        placeholder="Search or add a course..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {trimmedQuery.length > 0 && searching && (
        <p className="text-sm text-muted-foreground">Searching...</p>
      )}

      {visibleSuggestions.length > 0 && (
        <div className="flex flex-col rounded-md border">
          {visibleSuggestions.map((course) => (
            <button
              key={course.id}
              type="button"
              onClick={() => {
                onChange(course);
                setQuery("");
                setSuggestions([]);
              }}
              className="px-3 py-2 text-left text-sm hover:bg-accent"
            >
              {course.course_name}
            </button>
          ))}
        </div>
      )}

      {trimmedQuery.length > 0 && !exactMatchExists && !searching && (
        <Button
          type="button"
          variant="outline"
          onClick={handleCreate}
          disabled={creating}
        >
          {creating ? "Creating..." : `Create "${trimmedQuery}"`}
        </Button>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
