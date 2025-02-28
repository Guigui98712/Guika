
import React from "react";
import { Clock, AlertTriangle, FileText, TrendingUp, Building2 } from "lucide-react";
import DashboardCard from "./dashboard/DashboardCard";
import ProgressChart from "./dashboard/ProgressChart";
import ExpensesPieChart from "./dashboard/ExpensesPieChart";

const Dashboard = () => {
  return (
    <div className="space-y-8 animate-slideIn">
      <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <DashboardCard
          icon={Building2}
          title="Total de Obras"
          value="0"
        />
        <DashboardCard
          icon={Clock}
          title="Em Andamento"
          value="0"
        />
        <DashboardCard
          icon={TrendingUp}
          title="Conclusão Prevista"
          value="0%"
        />
        <DashboardCard
          icon={AlertTriangle}
          title="Pendências"
          value="0"
          color="text-yellow-500"
        />
        <DashboardCard
          icon={FileText}
          title="Documentos"
          value="0"
        />
      </div>

      {/* Gráfico de progresso */}
      <ProgressChart data={[]} />

      {/* Gráficos de gastos por obra */}
      <div className="space-y-6">
        <ExpensesPieChart 
          obraData={{
            obra: "Sem dados",
            dados: []
          }} 
        />
      </div>
    </div>
  );
};

export default Dashboard;
