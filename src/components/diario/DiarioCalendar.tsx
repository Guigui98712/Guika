
import React from "react";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DiarioCalendarProps {
  date: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
  diasComAtividades: Array<{ data: Date; temFoto: boolean }>;
}

export const DiarioCalendar = ({ 
  date, 
  onDateSelect, 
  diasComAtividades 
}: DiarioCalendarProps) => {
  const verificaDiaComAtividade = (data: Date | undefined) => {
    if (!data) return false;
    return diasComAtividades.some(
      (dia) => format(dia.data, "yyyy-MM-dd") === format(data, "yyyy-MM-dd")
    );
  };

  const verificaDiaComFoto = (data: Date | undefined) => {
    if (!data) return false;
    const diaAtividade = diasComAtividades.find(
      (dia) => format(dia.data, "yyyy-MM-dd") === format(data, "yyyy-MM-dd")
    );
    return diaAtividade?.temFoto || false;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CalendarIcon className="h-5 w-5" />
        <h2 className="text-lg font-semibold">Calendário de Atividades</h2>
      </div>
      
      <Calendar
        mode="single"
        selected={date}
        onSelect={onDateSelect}
        locale={ptBR}
        className="rounded-md border"
        modifiers={{
          atividade: (date) => verificaDiaComAtividade(date),
          foto: (date) => verificaDiaComFoto(date),
        }}
        modifiersClassNames={{
          atividade: "bg-primary/20",
          foto: "font-bold",
        }}
      />
    </div>
  );
};
