
import React from "react";
import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

interface ExpenseData {
  name: string;
  value: number;
}

interface ExpensesPieChartProps {
  obraData: {
    obra: string;
    dados: ExpenseData[];
  };
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

const ExpensesPieChart = ({ obraData }: ExpensesPieChartProps) => {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">
        Distribuição de Gastos - {obraData.obra}
      </h2>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={obraData.dados}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: R$ ${value}`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {obraData.dados.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default ExpensesPieChart;
