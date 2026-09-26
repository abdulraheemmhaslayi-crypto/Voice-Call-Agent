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

interface DispositionData {
  disposition: string;
  count: number;
  percentage: number;
}

interface DispositionChartProps {
  data: DispositionData[];
}

const COLORS = [
  '#2563EB', // blue-600
  '#059669', // emerald-600
  '#D97706', // amber-600
  '#7C3AED', // violet-600
  '#E11D48', // rose-600
  '#64748B', // slate-500
];

export function DispositionChart({ data }: DispositionChartProps) {
  const chartData = data.map((item, index) => ({
    ...item,
    fill: COLORS[index % COLORS.length],
  }));

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: DispositionData & { fill: string } }> }) => {
    if (active && payload && payload[0]) {
      const itemData = payload[0].payload;
      return (
        <div className="bg-card border border-border/70 rounded-xl shadow-md p-3 text-xs space-y-1">
          <p className="font-semibold text-foreground text-sm">{itemData.disposition}</p>
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
            Call Dispositions
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Distribution of call outcome and resolution tags
          </p>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {data.length === 0 ? (
          <div className="h-[280px] flex items-center justify-center text-xs text-muted-foreground">
            No disposition records found for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={chartData}
              layout="horizontal"
              margin={{ top: 10, right: 20, left: 10, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
              <XAxis
                dataKey="disposition"
                angle={-30}
                textAnchor="end"
                height={55}
                interval={0}
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

