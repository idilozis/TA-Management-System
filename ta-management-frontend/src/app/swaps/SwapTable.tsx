"use client";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Row {
  swap_id: number;
  status: string;
  with_ta: string;
  course_code: string;
  course_name: string;
  date: string;
  start_time: string;
  end_time: string;
  classrooms: string[];
  student_count: number;
}

export default function SwapsTable({ data, empty }: { data: Row[]; empty: string }) {
  if (data.length === 0)
    return <div className="text-center py-8 text-muted-foreground">{empty}</div>;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Course</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Classroom</TableHead>
            <TableHead>Students</TableHead>
            <TableHead>With</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map(r => (
            <TableRow key={r.swap_id}>
              <TableCell className="font-medium">
                <div>{r.course_code}</div>
                {r.course_name && <div className="text-sm text-muted-foreground">{r.course_name}</div>}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                  {r.date.split("-").reverse().join(".")}
                </Badge>
              </TableCell>
              <TableCell>{r.start_time} - {r.end_time}</TableCell>
              <TableCell>{r.classrooms.join(", ")}</TableCell>
              <TableCell>{r.student_count}</TableCell>
              <TableCell>{r.with_ta}</TableCell>
              <TableCell className="capitalize">{r.status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}