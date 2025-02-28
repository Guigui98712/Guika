import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RegistroDiario {
  data: string;
  etapas_iniciadas: string[];
  etapas_concluidas: string[];
}

interface GraficoEtapasProps {
  registros: RegistroDiario[];
}

interface EtapaInfo {
  etapa_nome: string;
  data_inicio: string;
  data_fim?: string;
  duracao: number;
  status: 'em_andamento' | 'concluida';
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const etapa = payload[0].payload;
    return (
      <div className="bg-white p-4 rounded-lg shadow border">
        <p className="font-bold">{etapa.etapa_nome}</p>
        <p>Início: {format(parseISO(etapa.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}</p>
        {etapa.data_fim && (
          <p>Fim: {format(parseISO(etapa.data_fim), 'dd/MM/yyyy', { locale: ptBR })}</p>
        )}
        <p>Duração: {etapa.duracao} dias</p>
        <p>Status: {etapa.status === 'concluida' ? 'Concluída' : 'Em andamento'}</p>
      </div>
    );
  }
  return null;
};

export default function GraficoEtapas({ registros }: GraficoEtapasProps) {
  const hoje = new Date();
  
  // Processa os registros para obter informações das etapas
  const etapasInfo = new Map<string, EtapaInfo>();
  
  // Primeiro, encontra as datas de início de cada etapa
  registros.forEach(registro => {
    const data = registro.data;
    registro.etapas_iniciadas.forEach(etapa => {
      if (!etapasInfo.has(etapa)) {
        etapasInfo.set(etapa, {
          etapa_nome: etapa,
          data_inicio: data,
          status: 'em_andamento',
          duracao: 0
        });
      }
    });
  });
  
  // Depois, encontra as datas de conclusão
  registros.forEach(registro => {
    const data = registro.data;
    registro.etapas_concluidas.forEach(etapa => {
      const info = etapasInfo.get(etapa);
      if (info) {
        info.data_fim = data;
        info.status = 'concluida';
      }
    });
  });
  
  // Calcula a duração de cada etapa
  const dadosGrafico = Array.from(etapasInfo.values()).map(etapa => {
    const dataInicio = parseISO(etapa.data_inicio);
    const dataFim = etapa.data_fim ? parseISO(etapa.data_fim) : hoje;
    const duracao = differenceInDays(dataFim, dataInicio) + 1;
    
    return {
      ...etapa,
      duracao,
      fill: etapa.status === 'concluida' ? '#22c55e' : '#eab308'
    };
  });

  // Ordena por duração decrescente
  dadosGrafico.sort((a, b) => b.duracao - a.duracao);

  // Calcula o tamanho e espaçamento das barras baseado no número de etapas
  const numEtapas = dadosGrafico.length;
  const barSize = Math.max(20, Math.min(32, 400 / numEtapas)); // Diminui o tamanho da barra conforme aumenta o número de etapas
  const barGap = Math.max(4, Math.min(8, 200 / numEtapas)); // Diminui o espaçamento conforme aumenta o número de etapas

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={dadosGrafico}
          layout="vertical"
          margin={{ top: 20, right: 30, left: 150, bottom: 5 }}
          barSize={barSize}
          barGap={barGap}
        >
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.5} />
          <XAxis 
            type="number" 
            label={{ 
              value: 'Dias', 
              position: 'insideBottom', 
              offset: -5 
            }}
          />
          <YAxis 
            type="category" 
            dataKey="etapa_nome" 
            width={140}
            tick={{ fontSize: Math.max(10, Math.min(12, 240 / numEtapas)) }} // Ajusta o tamanho da fonte
            interval={0}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="duracao" 
            background={{ fill: '#f3f4f6' }}
            radius={[4, 4, 4, 4]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
} 