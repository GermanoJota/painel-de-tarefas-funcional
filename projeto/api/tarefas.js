import { neon } from '@neondatabase/serverless';

// A string de conexão vem da variável de ambiente DATABASE_URL (configurada na Vercel).
// Ela NUNCA vai para o navegador.
export default async function handler(req, res) {
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ erro: 'DATABASE_URL não configurada' });
  }
  const sql = neon(process.env.DATABASE_URL);

  try {
    // LER (com filtro opcional de urgência)
    if (req.method === 'GET') {
      const { urgencia } = req.query;
      const rows = urgencia && urgencia !== 'Todos'
        ? await sql`SELECT * FROM tarefas WHERE urgencia = ${urgencia} ORDER BY criado_em DESC`
        : await sql`SELECT * FROM tarefas ORDER BY criado_em DESC`;
      return res.status(200).json(rows);
    }

    // CRIAR
    if (req.method === 'POST') {
      const { titulo, descricao, urgencia } = req.body;
      if (!titulo) return res.status(400).json({ erro: 'Título obrigatório' });
      const rows = await sql`
        INSERT INTO tarefas (titulo, descricao, urgencia)
        VALUES (${titulo}, ${descricao ?? ''}, ${urgencia ?? 'Normal'})
        RETURNING *`;
      return res.status(201).json(rows[0]);
    }

    // ATUALIZAR
    if (req.method === 'PUT') {
      const { id, titulo, descricao, urgencia } = req.body;
      if (!id || !titulo) return res.status(400).json({ erro: 'id e título obrigatórios' });
      const rows = await sql`
        UPDATE tarefas
        SET titulo = ${titulo}, descricao = ${descricao ?? ''}, urgencia = ${urgencia ?? 'Normal'}
        WHERE id = ${id}
        RETURNING *`;
      return res.status(200).json(rows[0] ?? null);
    }

    // EXCLUIR (id vem na URL: /api/tarefas?id=5)
    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ erro: 'id obrigatório' });
      await sql`DELETE FROM tarefas WHERE id = ${id}`;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ erro: 'Método não permitido' });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro no banco de dados' });
  }
}
