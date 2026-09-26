'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DurationData {
  bucket: string;
  range_start: number;
  range_end: number | null;
  count: number;
  percentage: number;
}

interface DurationChartProps {
  data: DurationData[];
}

const COLORS = {
  '0-10': '#93C5FD',    // blue-300
  '10-30': '#60A5FA',   // blue-400
  '30-60': '#3B82F6',   // blue-500
  '60-120': '#2563EB',  // blue-600
  '120-180': '#1D4ED8', // blue-700
  '>180': '#1E40AF',    // blue-800
};

export function DurationChart({ data }: DurationChartProps) {
  const chartData = data.map((item) => ({
    ...item,
    label: `${item.bucket}s`,
    fill: COLORS[item.bucket as keyof typeof COLORS] || '#2563EB',
  }));

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: DurationData & { label: string; fill: string } }> }) => {
    if (active && payload && payload[0]) {
      const itemData = payload[0].payload;
      return (
        <div className="bg-card border border-border/70 rounded-xl shadow-md p-3 text-xs space-y-1">
          <p className="font-semibold text-foreground text-sm">Duration: {itemData.label}</p>
          <div className="flex items-center justify-between gap-4 text-muted-foreground">
            <span>Call Count:</span>
            <span className="font-medium text-foreground">{itemData.count.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-muted-foreground">
            <span>Percentage:</span>
            <span className="font-medium text-foreground">{itemData.percentage}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="rounded-2xl border border-border/70 bg-card shadow-xs overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="space-y-0.5">
          <CardTitle className="text-base font-semibold tracking-tight text-foreground">
            Call Duration
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Call length distribution across time buckets
          </p>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {data.length === 0 ? (
          <div className="h-[280px] flex items-center justify-center text-xs text-muted-foreground">
            No call duration records found for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 10, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
              <XAxis
                dataKey="label"
                height={55}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

