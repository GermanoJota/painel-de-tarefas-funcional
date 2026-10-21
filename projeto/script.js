

/* ==========================================================================
   PASSO 1: IMPORTAÇÕES (Conexão com o Banco de Dados)
   Importamos as funções que conversam diretamente com o banco (script_db.js)
   ========================================================================== */
import { 
    consultarDiretoComFetch, 
    insertTarefa, 
    sqlDeletarTarefa, 
    sqlAtualizarTarefa
} from './script_db.js';

/* ==========================================================================
   PASSO 2: VARIÁVEIS GLOBAIS E ELEMENTOS DA TELA
   Pegamos os elementos do HTML que vamos manipular pelo JavaScript.
   ========================================================================== */
const formTarefas = document.getElementById('form-tarefas');
const TabelaTarefas = document.getElementById('tabela-corpo');
const btnCancelar = document.getElementById('btn-cancelar');
const formTitulo = document.getElementById('form-titulo');
const btnSalvarText = document.getElementById('btn-salvar-text');
const filtroUrgencia = document.getElementById('filtro-urgencia');

// Guarda as tarefas carregadas (usado na edição, evita problemas com aspas no HTML)
let tarefasCarregadas = [];

// Escapa texto para evitar injeção de HTML (XSS)
function esc(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}




/* ==========================================================================
   PASSO 3: FUNÇÕES DE INTERFACE (Visuais)
   Funções que apenas mudam coisas na tela, sem mexer no banco de dados.
   ========================================================================== */

// Função para limpar o formulário e voltar ao estado de "Novo Cadastro"
function limparFormulario() {
    formTarefas.reset();
    document.getElementById('tarefa-id').value = ''; // Limpa o ID oculto
    
    // Restaura os textos originais
    formTitulo.textContent = "Nova Tarefa";
    btnSalvarText.textContent = "Salvar Tarefa";
    btnCancelar.classList.add('hidden'); // Esconde o botão cancelar
}

// Função para mostrar notificações bonitas (Toasts) na tela
function mostrarToast(mensagem, tipo = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    
    const cores = { success: 'bg-green-600', error: 'bg-rose-600', info: 'bg-blue-600'};
    const icones = { success: 'fa-check-circle', error: 'fa-exclamation-triangle', info: 'fa-info-circle' };

    toast.className = `toast-enter ${cores[tipo]} toast-message`;
    toast.innerHTML = `<i class="fas ${icones[tipo]} text-lg"></i> <span>${mensagem}</span>`;
    
    container.appendChild(toast);
    
    // Remove o toast após 3 segundos
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

    


    

/* ==========================================================================
   PASSO 4: CRUD - READ (Ler e Listar Dados)
   ========================================================================== */
async function criarTabelaTarefas() {
    // 1. Busca os dados no banco
    const dados = await consultarDiretoComFetch(filtroUrgencia.value);
    tarefasCarregadas = dados;
    // 2. Limpa a tabela antes de preenchê-la com os novos dados
    TabelaTarefas.innerHTML = ''; 

    // 3. Verifica se tem dados. Se não tiver, sai da função.
    if (!dados || dados.length === 0) {
        TabelaTarefas.innerHTML = `<tr><td colspan="5" class="empty-state">Nenhum dado encontrado.</td></tr>`;
        return;
    }

    // 4. Para cada usuário, cria uma linha (<tr>) na tabela
    dados.forEach(tarefas => {
        const linha = document.createElement('tr');
       const data_criar = new Date(tarefas.criado_em).toLocaleString ('pt-BR')

    let urgencia = "";
     if (tarefas.urgencia === "Não Urgente"){
        urgencia =`<p class="badge-urgente naoUrgente">${esc(tarefas.urgencia)}</p>`
    }

    else if (tarefas.urgencia == "Normal"){
        urgencia =`<p class="badge-urgente normal">${esc(tarefas.urgencia)}</p>`
    } else {
         urgencia =`<p class="badge-urgente urgente">${esc(tarefas.urgencia)}</p>`
    }
        
       
        linha.innerHTML = `
            <td class="cell-id">#${tarefas.id}</td>
            <td>
                <p class="cell-titulo">${esc(tarefas.titulo)}</p>
                <p class="cell-descricao">${esc(tarefas.descricao)}</p>
            </td>
            
            <td>
                <p class="badge-date">${data_criar}</p>
            </td>
             <td>
                    ${urgencia}
            </td>
            <td>
                <div class="action-container">
                    <button onclick="prepararEdicao(${tarefas.id})" class="btn-action btn-edit" title="Editar">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button onclick="deletarTarefa(${tarefas.id})" class="btn-action btn-delete" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        TabelaTarefas.appendChild(linha);
    });
}


/* ==========================================================================
   PASSO 5: CRUD - CREATE & UPDATE (Criar ou Atualizar Dados)
   ========================================================================== */

// Prepara o formulário com os dados da linha clicada
window.prepararEdicao = function(id) {
    const t = tarefasCarregadas.find(x => x.id == id);
    if (!t) return;
    const { titulo, descricao, urgencia } = t;
    document.getElementById('tarefa-id').value = id; // Preenche o ID oculto (Isso diz ao sistema que é uma edição!)
    document.getElementById('tarefa-titulo').value = titulo;
    document.getElementById('tarefa-descricao').value = descricao;
    document.getElementById('tarefa-urgencia').value = urgencia;
    
    // Muda os textos visualmente para indicar que estamos a editar
    formTitulo.textContent = "Editar Tarefa";
    btnSalvarText.textContent = "Atualizar Tarefa";
    btnCancelar.classList.remove('hidden'); // Mostra o botão cancelar
}

// Uma única função que decide se vai Criar ou Atualizar com base no ID oculto
async function lidarComEnvioDoFormulario(event) {
    event.preventDefault(); // Evita que a página recarregue ao enviar o formulário

    // Pega os valores dos inputs
    const id = document.getElementById('tarefa-id').value;
    const titulo = document.getElementById('tarefa-titulo').value;
    const descricao = document.getElementById('tarefa-descricao').value;
    const urgencia = document.getElementById('tarefa-urgencia').value;

    let sucesso = false;

    // Se tem ID, é uma ATUALIZAÇÃO (UPDATE)
    if (id) {
        console.log("A atualizar tarefa:", { id, titulo, descricao, urgencia});
        sucesso = await sqlAtualizarTarefa(id, titulo, descricao, urgencia);
        if (sucesso) mostrarToast("Tarefa atualizada com sucesso!", "success");
    } 
    // Se não tem ID, é uma CRIAÇÃO (CREATE)
    else {
        console.log("A criar nova tarefa:", { titulo, descricao, urgencia});
        sucesso = await insertTarefa(titulo, descricao, urgencia);
        if (sucesso) mostrarToast("Tarefa cadastrada com sucesso!", "success");
    }

    // Tratamento de Erro Geral
    if (!sucesso) {
        mostrarToast("Ocorreu um erro na operação.", "error");
        return; // Sai da função sem limpar o formulário, para a pessoa tentar de novo
    }

    // Se deu tudo certo, limpa o formulário e recarrega a tabela
    limparFormulario();
    criarTabelaTarefas();
}


/* ==========================================================================
   PASSO 6: CRUD - DELETE (Excluir Dados)
   ========================================================================== */
window.deletarTarefa = async function(id) { // Corrigido o nome para bater com o HTML
    if (confirm("Tem certeza que deseja excluir esta tarefa?")) {
        const sucesso = await sqlDeletarTarefa(id); // Corrigido para a função certa do banco
        
        if (sucesso) {
            mostrarToast("Tarefa excluída com sucesso!", "success");
            criarTabelaTarefas(); // Recarrega a tabela para a linha sumir
        } else {
            mostrarToast("Erro ao excluir tarefa.", "error");
        }
    }
}

/* ==========================================================================
   PASSO 7: FUNÇÕES DE CONFIGURAÇÃO DO TOPO (Neon DB)
   ========================================================================== */
window.salvarConfiguracoes = function() {
    console.log("A ligar ao Neon...");
    mostrarToast("Conexão configurada (Simulação)", "info");
}

window.usarMock = function() {
    console.log("Modo Simulação ativado!");
    mostrarToast("Modo de simulação ativado", "info");
}

/* ==========================================================================
   PASSO 8: INICIALIZAÇÃO E EVENTOS
   ========================================================================== */

// Atrela a função unificada ao envio (submit) do formulário
formTarefas.addEventListener('submit', lidarComEnvioDoFormulario);

// Filtro de urgência: recarrega a tabela ao trocar a opção
filtroUrgencia.addEventListener('change', criarTabelaTarefas);

// Atrela a limpeza do formulário ao botão de cancelar
btnCancelar.addEventListener('click', limparFormulario);

// Quando o ficheiro JS é carregado, chama a tabela pela primeira vez
criarTabelaTarefas();

// (Removida a chave } que estava sobrando aqui)

