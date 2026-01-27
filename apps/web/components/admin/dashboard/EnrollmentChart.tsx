"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface EnrollmentChartProps {
  data: { month: string; enrollments: number }[];
}

export default function EnrollmentChart({ data }: EnrollmentChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart
        data={data}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="enrollmentGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#7B1113" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#7B1113" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12, fill: "#6b7280" }}
          tickLine={false}
          axisLine={{ stroke: "#e5e7eb" }}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "#6b7280" }}
          tickLine={false}
          axisLine={{ stroke: "#e5e7eb" }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
          }}
          labelStyle={{ color: "#374151", fontWeight: 600 }}
        />
        <Area
          type="monotone"
          dataKey="enrollments"
          stroke="#7B1113"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#enrollmentGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
