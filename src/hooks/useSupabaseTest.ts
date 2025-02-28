
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useSupabaseTest() {
  return useQuery({
    queryKey: ['test-connection'],
    queryFn: async () => {
      const { data, error } = await supabase.from('obras').select('count');
      if (error) throw error;
      return 'Conexão com Supabase estabelecida com sucesso!';
    },
  });
}
