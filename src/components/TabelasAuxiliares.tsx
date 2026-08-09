import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Trash2, Plus } from 'lucide-react';

interface Categoria {
  id: string;
  nome: string;
}

export const TabelasAuxiliares = () => {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [novaCategoria, setNovaCategoria] = useState('');
  const [loading, setLoading] = useState(false);

  const carregarCategorias = async () => {
    const { data, error } = await supabase
      .from('categorias' as any)
      .select('*')
      .order('nome');

    if (error) {
      console.error('Erro ao buscar categorias:', error);
      return;
    }

    if (data) setCategorias(data as any);
  };

  useEffect(() => {
    carregarCategorias();
  }, []);

  const handleAdicionar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!novaCategoria.trim()) return;

    setLoading(true);
    const { error } = await supabase
      .from('categorias' as any)
      .insert([{ nome: novaCategoria.trim() }]);

    setLoading(false);

    if (error) {
      alert(`Erro ao adicionar: ${error.message}`);
    } else {
      setNovaCategoria('');
      carregarCategorias();
    }
  };

  const handleExcluir = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta categoria?')) return;

    const { error } = await supabase
      .from('categorias' as any)
      .delete()
      .eq('id', id);

    if (error) {
      alert('Não foi possível excluir. Verifique se existem produtos vinculados a esta categoria.');
    } else {
      carregarCategorias();
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdicionar} className="flex gap-2">
        <Input
          placeholder="Nome da nova categoria..."
          value={novaCategoria}
          onChange={(e) => setNovaCategoria(e.target.value)}
          disabled={loading}
        />
        <Button type="submit" disabled={loading}>
          <Plus className="size-4 mr-1" />
          {loading ? 'Adicionando...' : 'Adicionar'}
        </Button>
      </form>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome da Categoria</TableHead>
              <TableHead className="w-[100px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categorias.map((cat) => (
              <TableRow key={cat.id}>
                <TableCell className="font-medium">{cat.nome}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleExcluir(cat.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {categorias.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground py-4">
                  Nenhuma categoria cadastrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};