
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

// Hook para buscar dados
export function useSupabaseQuery<T>(
  key: string[],
  table: keyof Database['public']['Tables'],
  options: {
    where?: { column: string; value: any }[];
    orderBy?: { column: string; ascending?: boolean };
  } = {}
) {
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      let query = supabase.from(table).select('*');

      if (options.where) {
        options.where.forEach(({ column, value }) => {
          query = query.eq(column, value);
        });
      }

      if (options.orderBy) {
        query = query.order(options.orderBy.column, {
          ascending: options.orderBy.ascending ?? true,
        });
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as T[];
    },
  });
}

// Hook para mutações (inserir, atualizar, deletar)
export function useSupabaseMutation<T>(
  table: keyof Database['public']['Tables'],
  options: {
    type: 'INSERT' | 'UPDATE' | 'DELETE';
    onSuccess?: () => void;
  }
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: any) => {
      let query;

      switch (options.type) {
        case 'INSERT':
          query = supabase.from(table).insert(variables);
          break;
        case 'UPDATE':
          query = supabase.from(table).update(variables.data).eq('id', variables.id);
          break;
        case 'DELETE':
          query = supabase.from(table).delete().eq('id', variables);
          break;
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as T;
    },
    onSuccess: () => {
      options.onSuccess?.();
      queryClient.invalidateQueries({ queryKey: [table] });
    },
  });
}
