/**
 * Leitor paginado do Supabase.
 *
 * O Data API do Supabase devolve no máximo 1000 linhas por consulta. Com mais de
 * 1000 registros as linhas mais recentes somem silenciosamente — foi isso que
 * zerou "Volume Vendido Hoje" no Dashboard e volumes nos Relatórios.
 *
 * `buscarTodos` percorre a tabela em páginas de 1000 linhas até esgotar, devolvendo
 * o array completo já "desembrulhado" (sem `{ data, error }`).
 */

const TAMANHO_PAGINA = 1000;

type ResultadoPagina<T> = { data: T[] | null; error: unknown };

export async function buscarTodos<T>(
  construirConsulta: (de: number, ate: number) => PromiseLike<ResultadoPagina<T>>,
): Promise<T[]> {
  const todos: T[] = [];
  let de = 0;
  for (;;) {
    const ate = de + TAMANHO_PAGINA - 1;
    const { data, error } = await construirConsulta(de, ate);
    if (error) throw error;
    const pagina = data ?? [];
    todos.push(...pagina);
    if (pagina.length < TAMANHO_PAGINA) break;
    de += TAMANHO_PAGINA;
  }
  return todos;
}
