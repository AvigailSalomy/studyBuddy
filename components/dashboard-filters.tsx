"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Filters are encoded in the URL (not just client state) so the results
// list -- fetched server-side in app/dashboard/page.tsx -- stays in sync
// and the search is bookmarkable/shareable. All four params are always
// written together (even empty ones) so the server can distinguish
// "user cleared this filter" (key present, empty) from "no interaction
// yet" (key absent entirely, meaning "use the profile default").
export function DashboardFilters({
  initialCourse,
  initialFaculty,
  initialDegree,
  initialYear,
}: {
  initialCourse: string;
  initialFaculty: string;
  initialDegree: string;
  initialYear: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [course, setCourse] = useState(initialCourse);
  const [faculty, setFaculty] = useState(initialFaculty);
  const [degree, setDegree] = useState(initialDegree);
  const [year, setYear] = useState(initialYear);

  const skipNextPush = useRef(true);

  useEffect(() => {
    if (skipNextPush.current) {
      skipNextPush.current = false;
      return;
    }

    const timeout = setTimeout(() => {
      const params = new URLSearchParams();
      params.set("course", course);
      params.set("faculty", faculty);
      params.set("degree", degree);
      params.set("year", year);
      router.push(`${pathname}?${params.toString()}`);
    }, 300);

    return () => clearTimeout(timeout);
  }, [course, faculty, degree, year, pathname, router]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="course-search">Course</Label>
        <Input
          id="course-search"
          placeholder="Search by course name"
          value={course}
          onChange={(e) => setCourse(e.target.value)}
          autoComplete="off"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="faculty-filter">Faculty</Label>
        <Input
          id="faculty-filter"
          placeholder="Any faculty"
          value={faculty}
          onChange={(e) => setFaculty(e.target.value)}
          autoComplete="off"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="degree-filter">Target degree</Label>
        <Input
          id="degree-filter"
          placeholder="Any degree"
          value={degree}
          onChange={(e) => setDegree(e.target.value)}
          autoComplete="off"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="year-filter">Target year</Label>
        <Input
          id="year-filter"
          type="number"
          min={1}
          max={8}
          placeholder="Any year"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          autoComplete="off"
        />
      </div>
    </div>
  );
}
