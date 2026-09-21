/**
 * O Data API do Supabase devolve no máximo 1000 linhas por consulta.
 * Tabelas grandes (itens de pedido, compras de clientes, movimentos) precisam
 * ser lidas em páginas, senão registros recentes desaparecem silenciosamente —
 * foi o que zerava o "Volume vendido hoje" no Dashboard.
 */
const TAMANHO_PAGINA = 1000;

type Resposta<T> = { data: T[] | null; error: { message: string } | null };

export async function buscarTodos<T>(
  pagina: (de: number, ate: number) => PromiseLike<Resposta<T>>,
  limiteSeguranca = 50_000,
): Promise<T[]> {
  const todos: T[] = [];
  for (let de = 0; de < limiteSeguranca; de += TAMANHO_PAGINA) {
    const { data, error } = await pagina(de, de + TAMANHO_PAGINA - 1);
    if (error) throw error;
    const linhas = data ?? [];
    todos.push(...linhas);
    if (linhas.length < TAMANHO_PAGINA) break;
  }
  return todos;
}
