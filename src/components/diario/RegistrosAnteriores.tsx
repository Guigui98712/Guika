
import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Registro {
  data: string;
  titulo: string;
  descricao: string;
  temFotos: boolean;
}

interface RegistrosAnterioresProps {
  registros: Registro[];
}

export const RegistrosAnteriores = ({ registros }: RegistrosAnterioresProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Registros Anteriores</h2>
      {registros.map((registro, index) => (
        <Card key={index} className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500">{registro.data}</p>
              <p className="font-medium">{registro.titulo}</p>
              <p className="text-sm text-gray-600 mt-2">{registro.descricao}</p>
            </div>
            {registro.temFotos && (
              <Button variant="outline" size="sm">
                Ver Fotos
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};
