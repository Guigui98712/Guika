
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import type { Orcamento } from "@/types/orcamento";

interface EmpresaForm {
  nome: string;
  valor: string;
  observacoes: string;
  planilha: File | null;
}

const NovoOrcamento = () => {
  const { obraId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const orcamentoId = location.state?.orcamentoId;

  const [nomeOrcamento, setNomeOrcamento] = useState("");
  const [empresas, setEmpresas] = useState<EmpresaForm[]>([
    { nome: "", valor: "", observacoes: "", planilha: null }
  ]);

  useEffect(() => {
    if (orcamentoId) {
      const orcamentosSalvos = JSON.parse(localStorage.getItem("orcamentos") || "[]");
      const orcamentoParaEditar = orcamentosSalvos.find((orc: Orcamento) => orc.id === orcamentoId);
      
      if (orcamentoParaEditar) {
        setNomeOrcamento(orcamentoParaEditar.nome);
        setEmpresas(
          orcamentoParaEditar.empresas.map((emp: any) => ({
            nome: emp.nome,
            valor: emp.valor.toString(),
            observacoes: emp.observacoes || "",
            planilha: null // Não é possível restaurar o arquivo, apenas o nome
          }))
        );
      }
    }
  }, [orcamentoId]);

  const handleAddEmpresa = () => {
    setEmpresas([
      ...empresas,
      { nome: "", valor: "", observacoes: "", planilha: null }
    ]);
  };

  const handleRemoveEmpresa = (index: number) => {
    setEmpresas(empresas.filter((_, i) => i !== index));
  };

  const handleEmpresaChange = (
    index: number,
    field: keyof EmpresaForm,
    value: string | File
  ) => {
    const newEmpresas = [...empresas];
    if (field === "planilha" && value instanceof File) {
      newEmpresas[index][field] = value;
    } else if (typeof value === "string") {
      newEmpresas[index][field as keyof Omit<EmpresaForm, "planilha">] = value;
    }
    setEmpresas(newEmpresas);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nomeOrcamento.trim()) {
      toast({
        title: "Erro",
        description: "Digite o nome do orçamento",
        variant: "destructive"
      });
      return;
    }

    const empresasValidas = empresas.every(
      (empresa) => empresa.nome.trim() && empresa.valor.trim()
    );

    if (!empresasValidas) {
      toast({
        title: "Erro",
        description: "Preencha nome e valor para todas as empresas",
        variant: "destructive"
      });
      return;
    }

    try {
      const empresasProcessadas = await Promise.all(
        empresas.map(async (empresa) => {
          let planilhaData = undefined;
          if (empresa.planilha) {
            const arrayBuffer = await empresa.planilha.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            planilhaData = XLSX.utils.sheet_to_json(worksheet);
          }

          return {
            nome: empresa.nome,
            valor: parseFloat(empresa.valor),
            observacoes: empresa.observacoes,
            planilhaUrl: empresa.planilha ? empresa.planilha.name : "",
            planilhaData
          };
        })
      );

      const novoOrcamento = {
        id: orcamentoId || Date.now(),
        nome: nomeOrcamento,
        obraId: Number(obraId),
        empresas: empresasProcessadas,
        dataCriacao: new Date().toISOString()
      };

      const orcamentosAtuais = JSON.parse(
        localStorage.getItem("orcamentos") || "[]"
      );

      let novosOrcamentos;
      if (orcamentoId) {
        novosOrcamentos = orcamentosAtuais.map((orc: Orcamento) =>
          orc.id === orcamentoId ? novoOrcamento : orc
        );
      } else {
        novosOrcamentos = [...orcamentosAtuais, novoOrcamento];
      }

      localStorage.setItem("orcamentos", JSON.stringify(novosOrcamentos));

      toast({
        title: "Sucesso",
        description: orcamentoId ? "Orçamento atualizado com sucesso!" : "Orçamento criado com sucesso!"
      });

      navigate(`/orcamentos/${novoOrcamento.id}`);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar o orçamento",
        variant: "destructive"
      });
      console.error("Erro ao salvar orçamento:", error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">Novo Orçamento</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div>
          <Label htmlFor="nomeOrcamento">Nome do Orçamento</Label>
          <Input
            id="nomeOrcamento"
            value={nomeOrcamento}
            onChange={(e) => setNomeOrcamento(e.target.value)}
            placeholder="Ex: Orçamento de Fundação"
            className="mt-1"
          />
        </div>

        <div className="space-y-6">
          {empresas.map((empresa, index) => (
            <div
              key={index}
              className="p-6 border rounded-lg space-y-4 bg-white shadow-sm"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Empresa {index + 1}</h3>
                {empresas.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveEmpresa(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nome da Empresa</Label>
                  <Input
                    value={empresa.nome}
                    onChange={(e) =>
                      handleEmpresaChange(index, "nome", e.target.value)
                    }
                    placeholder="Nome da empresa"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Valor</Label>
                  <Input
                    type="number"
                    value={empresa.valor}
                    onChange={(e) =>
                      handleEmpresaChange(index, "valor", e.target.value)
                    }
                    placeholder="0,00"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea
                  value={empresa.observacoes}
                  onChange={(e) =>
                    handleEmpresaChange(index, "observacoes", e.target.value)
                  }
                  placeholder="Observações sobre o orçamento"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Planilha</Label>
                <div className="mt-1">
                  <Input
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleEmpresaChange(index, "planilha", file);
                      }
                    }}
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    id={`planilha-${index}`}
                  />
                  <Label
                    htmlFor={`planilha-${index}`}
                    className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {empresa.planilha ? empresa.planilha.name : "Upload da planilha"}
                  </Label>
                </div>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={handleAddEmpresa}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Empresa
          </Button>
        </div>

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/orcamentos")}
          >
            Cancelar
          </Button>
          <Button type="submit">Comparar Orçamentos</Button>
        </div>
      </form>
    </div>
  );
};

export default NovoOrcamento;
