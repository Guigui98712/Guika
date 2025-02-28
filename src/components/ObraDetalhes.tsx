import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Plus, Check, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type { Etapa, SubEtapa } from "@/types/obra";

interface ObraDetalhesProps {
  etapa: Etapa;
  onUpdate: (etapa: Etapa) => void;
}

const ObraDetalhes: React.FC<ObraDetalhesProps> = ({ etapa, onUpdate }) => {
  const [novaSubEtapa, setNovaSubEtapa] = useState("");
  const [novoChecklist, setNovoChecklist] = useState("");
  const [subEtapaAtual, setSubEtapaAtual] = useState<SubEtapa | null>(null);

  const calcularProgressoEtapa = (etapa: Etapa) => {
    if (etapa.subetapas.length === 0) return 0;
    
    const pesoSubEtapa = 100 / etapa.subetapas.length;
    const progressoTotal = etapa.subetapas.reduce((acc, subEtapa) => {
      if (subEtapa.status === 'concluido') {
        return acc + pesoSubEtapa;
      }
      
      if (subEtapa.checklist.length === 0) {
        return acc;
      }
      
      const pesoItemChecklist = pesoSubEtapa / subEtapa.checklist.length;
      const itensConcluidos = subEtapa.checklist.filter(item => item.concluido).length;
      const progressoChecklist = itensConcluidos * pesoItemChecklist;
      
      return acc + progressoChecklist;
    }, 0);
    
    return Math.round(progressoTotal);
  };

  const adicionarSubEtapa = () => {
    if (!novaSubEtapa.trim()) return;

    const novaSubEtapaObj: SubEtapa = {
      id: Date.now(),
      nome: novaSubEtapa,
      status: 'pendente',
      observacoes: '',
      checklist: [],
      custo: 0
    };

    const novaEtapa = {
      ...etapa,
      subetapas: [...etapa.subetapas, novaSubEtapaObj]
    };

    onUpdate(novaEtapa);
    setNovaSubEtapa("");
  };

  const adicionarChecklist = (subEtapaId: number) => {
    if (!novoChecklist.trim()) return;

    const novaEtapa = {
      ...etapa,
      subetapas: etapa.subetapas.map(sub => {
        if (sub.id === subEtapaId) {
          return {
            ...sub,
            checklist: [
              ...sub.checklist,
              { id: Date.now(), item: novoChecklist, concluido: false }
            ]
          };
        }
        return sub;
      })
    };

    novaEtapa.progresso = calcularProgressoEtapa(novaEtapa);
    onUpdate(novaEtapa);
    setNovoChecklist("");
  };

  const atualizarStatusSubEtapa = (subEtapaId: number, concluido: boolean) => {
    const novaEtapa: Etapa = {
      ...etapa,
      subetapas: etapa.subetapas.map(sub => {
        if (sub.id === subEtapaId) {
          return {
            ...sub,
            status: concluido ? 'concluido' as const : 'pendente' as const
          };
        }
        return sub;
      })
    };

    novaEtapa.progresso = calcularProgressoEtapa(novaEtapa);
    onUpdate(novaEtapa);
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold">{etapa.nome}</h3>
          <span className="text-sm text-gray-500">
            Progresso: {etapa.progresso}%
          </span>
        </div>

        <Progress value={etapa.progresso} className="h-2" />

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Nova sub-etapa"
              value={novaSubEtapa}
              onChange={(e) => setNovaSubEtapa(e.target.value)}
            />
            <Button onClick={adicionarSubEtapa}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {etapa.subetapas.map((subEtapa) => (
            <Card key={subEtapa.id} className="p-4">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={subEtapa.status === 'concluido'}
                      onCheckedChange={(checked) => {
                        atualizarStatusSubEtapa(subEtapa.id, checked as boolean);
                      }}
                    />
                    <h4 className="font-medium">{subEtapa.nome}</h4>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setSubEtapaAtual(subEtapa)}
                  >
                    Detalhes
                  </Button>
                </div>

                {subEtapaAtual?.id === subEtapa.id && (
                  <div className="space-y-4 mt-4">
                    <Textarea
                      placeholder="Observações"
                      value={subEtapa.observacoes}
                      onChange={(e) => {
                        const novaEtapa: Etapa = {
                          ...etapa,
                          subetapas: etapa.subetapas.map(sub =>
                            sub.id === subEtapa.id
                              ? { ...sub, observacoes: e.target.value }
                              : sub
                          )
                        };
                        onUpdate(novaEtapa);
                      }}
                    />

                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Novo item do checklist"
                          value={novoChecklist}
                          onChange={(e) => setNovoChecklist(e.target.value)}
                        />
                        <Button onClick={() => adicionarChecklist(subEtapa.id)}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>

                      {subEtapa.checklist.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 p-2 bg-gray-50 rounded"
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const novaEtapa: Etapa = {
                                ...etapa,
                                subetapas: etapa.subetapas.map(sub =>
                                  sub.id === subEtapa.id
                                    ? {
                                        ...sub,
                                        checklist: sub.checklist.map(check =>
                                          check.id === item.id
                                            ? { ...check, concluido: !check.concluido }
                                            : check
                                        )
                                      }
                                    : sub
                                )
                              };
                              novaEtapa.progresso = calcularProgressoEtapa(novaEtapa);
                              onUpdate(novaEtapa);
                            }}
                          >
                            {item.concluido ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <X className="w-4 h-4 text-gray-400" />
                            )}
                          </Button>
                          <span className={item.concluido ? "line-through" : ""}>
                            {item.item}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default ObraDetalhes;
