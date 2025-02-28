import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Upload } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import { salvarRegistroDiario } from "@/lib/api";

interface DiarioFormProps {
  obraId: number;
  date: Date | undefined;
  onDateChange: (date: Date) => void;
  onSubmit?: (e: React.FormEvent) => void;
}

export const DiarioForm = ({ obraId, date, onDateChange }: DiarioFormProps) => {
  const { toast } = useToast();
  const [descricao, setDescricao] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileInput = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        console.log('Arquivos selecionados:', files);
      }
    };
    input.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!date) {
        throw new Error("Data é obrigatória");
      }

      // Ajustar para meio-dia UTC para evitar problemas de fuso horário
      const dataAjustada = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0));
      console.log('[DEBUG] Data original:', date);
      console.log('[DEBUG] Data ajustada:', dataAjustada);

      await salvarRegistroDiario({
        obra_id: obraId,
        data: format(dataAjustada, "yyyy-MM-dd"),
        descricao,
        observacoes,
        etapas_iniciadas: [],
        etapas_concluidas: [],
        fotos: []
      });

      toast({
        title: "Sucesso",
        description: "Registro salvo com sucesso!",
      });

      // Limpar formulário
      setDescricao("");
      setObservacoes("");
    } catch (error) {
      console.error("Erro ao salvar registro:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o registro.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Data</label>
        <Input 
          type="date" 
          value={date ? format(date, "yyyy-MM-dd") : ""} 
          onChange={(e) => {
            if (e.target.value) {
              // Criar data a partir da string, ajustando para meio-dia UTC
              const dateParts = e.target.value.split('-').map(Number);
              const novaData = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2], 12, 0, 0));
              onDateChange(novaData);
            }
          }}
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">Descrição da Atividade</label>
        <Textarea 
          placeholder="Descreva a atividade realizada..." 
          className="min-h-[100px]"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Observações</label>
        <Textarea 
          placeholder="Adicione observações importantes..." 
          className="min-h-[100px]"
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">Fotos</label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <Button 
            type="button"
            variant="outline" 
            className="w-full"
            onClick={handleFileInput}
          >
            <Upload className="mr-2 h-4 w-4" />
            Fazer Upload de Fotos
          </Button>
        </div>
      </div>
      
      <Button type="submit" className="w-full" disabled={loading}>
        <Camera className="mr-2 h-4 w-4" />
        {loading ? "Salvando..." : "Registrar no Diário"}
      </Button>
    </form>
  );
};
