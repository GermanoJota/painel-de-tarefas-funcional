/* ==========================================================================
   Comunicação com o banco, agora via API segura (/api/tarefas).
   Nenhuma senha ou string de conexão fica no navegador.
   ========================================================================== */
const API = '/api/tarefas';

async function chamarApi(url, opcoes = {}) {
    try {
        const resposta = await fetch(url, {
            headers: { 'Content-Type': 'application/json' },
            ...opcoes
        });
        if (!resposta.ok) {
            throw new Error(`Erro HTTP ${resposta.status}: ${await resposta.text()}`);
        }
        return await resposta.json();
    } catch (erro) {
        console.error('Falha ao comunicar com a API:', erro);
        return null; // null = deu erro
    }
}

// --- R (READ) --- urgencia opcional: "Urgente", "Normal", "Não Urgente" ou "Todos"
export async function consultarDiretoComFetch(urgencia = 'Todos') {
    const url = `${API}?urgencia=${encodeURIComponent(urgencia)}`;
    const linhas = await chamarApi(url);
    return linhas || [];
}

// --- C (CREATE) ---
export async function insertTarefa(titulo, descricao, urgencia) {
    const r = await chamarApi(API, {
        method: 'POST',
        body: JSON.stringify({ titulo, descricao, urgencia })
    });
    return r !== null;
}

// --- U (UPDATE) ---
export async function sqlAtualizarTarefa(id, titulo, descricao, urgencia) {
    const r = await chamarApi(API, {
        method: 'PUT',
        body: JSON.stringify({ id, titulo, descricao, urgencia })
    });
    return r !== null;
}

// --- D (DELETE) ---
export async function sqlDeletarTarefa(id) {
    const r = await chamarApi(`${API}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    return r !== null;
}
