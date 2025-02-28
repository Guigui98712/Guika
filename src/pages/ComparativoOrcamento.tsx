
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, SplitSquareHorizontal } from "lucide-react";
import type { Orcamento } from "@/types/orcamento";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableFooter,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const ComparativoOrcamento = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [orcamento, setOrcamento] = useState<Orcamento | null>(null);

  useEffect(() => {
    const orcamentosSalvos = JSON.parse(
      localStorage.getItem("orcamentos") || "[]"
    );
    const orcamentoEncontrado = orcamentosSalvos.find(
      (orc: Orcamento) => orc.id === Number(id)
    );

    if (orcamentoEncontrado) {
      setOrcamento(orcamentoEncontrado);
    }
  }, [id]);

  if (!orcamento) {
    return <div>Carregando...</div>;
  }

  const calcularTotalPlanilha = (planilhaData: any[]) => {
    return planilhaData.reduce((total: number, row: any) => {
      const valorNumerico = Object.values(row).find(
        (value) => typeof value === "number"
      );
      return total + (valorNumerico || 0);
    }, 0);
  };

  const empresasComTotaisAtualizados = orcamento.empresas.map(empresa => ({
    ...empresa,
    valor: empresa.planilhaData ? calcularTotalPlanilha(empresa.planilhaData) : empresa.valor
  }));

  const dadosGrafico = empresasComTotaisAtualizados.map((empresa) => ({
    name: empresa.nome,
    valor: empresa.valor,
  }));

  const menorValor = Math.min(...empresasComTotaisAtualizados.map((emp) => emp.valor));

  const empresasComPlanilha = empresasComTotaisAtualizados.filter(
    (emp) => emp.planilhaData?.length
  );

  // Função para normalizar uma string para comparação
  const normalizeString = (str: string) => {
    return str.toLowerCase().trim();
  };

  // Função para comparar se duas linhas são iguais baseado apenas nos itens (desconsiderando valores)
  const linhasSaoIguais = (linha1: any, linha2: any) => {
    // Pega a primeira chave que geralmente é a descrição do item
    const descricaoKey = Object.keys(linha1)[0];
    return normalizeString(linha1[descricaoKey]) === normalizeString(linha2[descricaoKey]);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/orcamentos?obraId=${orcamento.obraId}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold text-gray-800">{orcamento.nome}</h1>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Gráfico Comparativo</h2>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dadosGrafico}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip
                formatter={(value: number) => `R$ ${value.toLocaleString()}`}
              />
              <Legend />
              <Bar dataKey="valor" fill="#3b82f6" name="Valor do Orçamento" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {empresasComTotaisAtualizados.map((empresa, index) => (
          <Card
            key={index}
            className={`p-6 ${
              empresa.valor === menorValor ? "border-2 border-green-500" : ""
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-lg">{empresa.nome}</h3>
                <p className="text-2xl font-bold text-blue-600 mt-2">
                  R$ {empresa.valor.toLocaleString()}
                </p>
              </div>
              {empresa.valor === menorValor && (
                <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
                  Menor valor
                </span>
              )}
            </div>

            {empresa.observacoes && (
              <div className="mt-4">
                <h4 className="font-medium text-sm text-gray-600 mb-1">
                  Observações
                </h4>
                <p className="text-gray-600">{empresa.observacoes}</p>
              </div>
            )}

            {empresa.planilhaUrl && (
              <div className="mt-4">
                <Button variant="outline" className="w-full" disabled>
                  <SplitSquareHorizontal className="h-4 w-4 mr-2" />
                  {empresa.planilhaUrl}
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      {empresasComPlanilha.length >= 2 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            Comparativo de Planilhas
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {empresasComPlanilha.slice(0, 2).map((empresa, index) => {
              const outraEmpresa = empresasComPlanilha[index === 0 ? 1 : 0];
              return (
                <div key={index} className="overflow-x-auto">
                  <h3 className="font-semibold mb-2">{empresa.nome}</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Object.keys(empresa.planilhaData[0] || {}).map(
                          (header, i) => (
                            <TableHead key={i}>{header}</TableHead>
                          )
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {empresa.planilhaData.map((row: any, rowIndex: number) => {
                        const descricaoKey = Object.keys(row)[0];
                        const itemEncontrado = outraEmpresa.planilhaData.find(
                          (outraLinha: any) => linhasSaoIguais(row, outraLinha)
                        );
                        
                        return (
                          <TableRow 
                            key={rowIndex}
                            className={!itemEncontrado ? "bg-yellow-100" : ""}
                          >
                            {Object.entries(row).map(([key, value]: [string, any], i: number) => (
                              <TableCell key={i}>
                                {typeof value === "number"
                                  ? value.toLocaleString()
                                  : value}
                              </TableCell>
                            ))}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="bg-blue-50">
                        <TableCell colSpan={Object.keys(empresa.planilhaData[0] || {}).length - 1}>
                          Total
                        </TableCell>
                        <TableCell className="font-bold">
                          R$ {empresa.valor.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};

export default ComparativoOrcamento;

