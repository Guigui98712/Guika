import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <p className="text-gray-600 mb-8">Página não encontrada</p>
      <Button
        variant="outline"
        onClick={() => navigate('/obras')}
        className="flex items-center"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar para Obras
      </Button>
    </div>
  );
};

export default NotFound;
