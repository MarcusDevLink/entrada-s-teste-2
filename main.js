$(document).ready(function() {
    let movimentacoes = [];
    let estoque = [];
    let editandoItemId = null;
    let editandoMovimentacaoIndex = null;
    const STORAGE_MOV_KEY = 'transporte_movimentacoes';
    const STORAGE_ESTOQUE_KEY = 'transporte_estoque';

    // Função para apagar todas as movimentações
    function apagarTodasMovimentacoes() {
        if (movimentacoes.length === 0) {
            alert('Não há movimentações para apagar!');
            return;
        }

        if (confirm('⚠️ ATENÇÃO!\n\nTem certeza que deseja apagar TODAS as movimentações?\n\nEsta ação não pode ser desfeita e todos os dados de movimentação serão perdidos permanentemente.')) {
            movimentacoes = [];
            salvarDados();
            aplicarFiltros();
            atualizarTabelasEstoque();
            alert('Todas as movimentações foram apagadas com sucesso!');
        }
    }

    // Função para apagar todo o estoque
    function apagarTodoEstoque() {
        if (estoque.length === 0) {
            alert('Não há estoque para apagar!');
            return;
        }

        if (confirm('⚠️ ATENÇÃO!\n\nTem certeza que deseja apagar TODO o estoque?\n\nEsta ação não pode ser desfeita e todos os dados de estoque serão perdidos permanentemente.')) {
            estoque = [];
            salvarDados();
            atualizarTabelasEstoque();
            alert('Todo o estoque foi apagado com sucesso!');
        }
    }

    // Função para remover um cliente específico do estoque
    function removerClienteDoEstoque() {
        const clientes = getClientesUnicos();
        const clienteSelecionado = prompt('Digite o nome do cliente que deseja remover:');
        if (clienteSelecionado && clientes.includes(clienteSelecionado)) {
            estoque = estoque.filter(item => item.cliente !== clienteSelecionado);
            salvarDados();
            atualizarTabelasEstoque();
            alert(`Cliente "${clienteSelecionado}" removido com sucesso!`);
        } else {
            alert('Cliente não encontrado ou inválido.');
        }
    }

    // Event listeners para os novos botões
    $('#clearMovimentacoesBtn').on('click', apagarTodasMovimentacoes);
    $('#clearEstoqueBtn').on('click', apagarTodoEstoque);
    $('#clearClientesBtn').on('click', removerClienteDoEstoque);

    // Função para formatar moeda em tempo real
    function formatarMoeda(valor) {
        if (!valor) return 'R$ 0,00';
        
        let valorNumerico = valor.replace(/\D/g, '');
        
        if (valorNumerico === '') {
            return 'R$ 0,00';
        }
        
        while (valorNumerico.length < 3) {
            valorNumerico = '0' + valorNumerico;
        }
        
        let parteInteira = valorNumerico.slice(0, -2);
        let parteDecimal = valorNumerico.slice(-2);
        
        parteInteira = parteInteira.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        
        if (parteInteira === '') {
            parteInteira = '0';
        } else {
            parteInteira = parteInteira.replace(/^0+/, '') || '0';
        }
        
        return `R$ ${parteInteira},${parteDecimal}`;
    }

    // Função para converter moeda formatada para número
    function moedaParaNumero(valorFormatado) {
        if (!valorFormatado) return 0;
        
        let valorLimpo = valorFormatado.replace('R$', '').replace(/\s/g, '');
        valorLimpo = valorLimpo.replace(/\./g, '').replace(',', '.');
        
        let numero = parseFloat(valorLimpo);
        return isNaN(numero) ? 0 : numero;
    }

    // Aplicar formatação em tempo real ao campo de valor NF
    $('#valorNf').on('input', function() {
        let valorAtual = $(this).val();
        let valorSemPrefixo = valorAtual.replace('R$ ', '');
        
        if (valorSemPrefixo === '') {
            $(this).val('');
            return;
        }
        
        let valorFormatado = formatarMoeda(valorSemPrefixo);
        $(this).val(valorFormatado);
    });

    // Função para formatar data para exibição
    function formatarData(data) {
        if (!data) return '';
        const partes = data.split('-');
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }

    // Função para verificar status de vencimento
    function getStatusVencimento(dataVencimento) {
        const hoje = new Date();
        const vencimento = new Date(dataVencimento);
        const diffTime = vencimento - hoje;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
            return { status: 'VENCIDO', classe: 'vencimento-vencido' };
        } else if (diffDays <= 30) {
            return { status: `Vence em ${diffDays} dias`, classe: 'vencimento-proximo' };
        } else {
            return { status: 'VÁLIDO', classe: '' };
        }
    }

    // Função para formatar valor monetário para exibição (sem prefixo)
    function formatarValor(valor) {
        if (!valor || valor === '0.00') return '0,00';
        return parseFloat(valor).toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    // Função para calcular estatísticas
    function calcularEstatisticas() {
        let entradas = 0;
        let saidas = 0;
        let palletsEntrada = 0;
        let palletsSaida = 0;
        let kgEntrada = 0;
        let kgSaida = 0;
        let qtdeTotalEntrada = 0;
        let qtdeTotalSaida = 0;
        let valorTotalEntrada = 0;
        let valorTotalSaida = 0;
        const produtos = new Set();
        const clientes = new Set();

        movimentacoes.forEach(mov => {
            if (mov.tipoMovimentacao === 'entrada') {
                entradas++;
                mov.produtos.forEach(produto => {
                    const qtde = parseInt(produto.qtde) || 0;
                    const pallets = parseInt(produto.qtdePallets) || 0;
                    const peso = parseFloat(produto.pesoNf) || 0;
                    
                    palletsEntrada += pallets;
                    kgEntrada += peso;
                    qtdeTotalEntrada += qtde;
                    produtos.add(produto.produto);
                });
                if (mov.valorNf) {
                    valorTotalEntrada += moedaParaNumero(mov.valorNf);
                }
            } else {
                saidas++;
                mov.produtos.forEach(produto => {
                    const qtde = parseInt(produto.qtde) || 0;
                    const pallets = parseInt(produto.qtdePallets) || 0;
                    const peso = parseFloat(produto.pesoNf) || 0;
                    
                    palletsSaida += pallets;
                    kgSaida += peso;
                    qtdeTotalSaida += qtde;
                    produtos.add(produto.produto);
                });
                if (mov.valorNf) {
                    valorTotalSaida += moedaParaNumero(mov.valorNf);
                }
            }
            clientes.add(mov.cliente);
        });

        // Atualizar elementos do dashboard
        $('#totalEntradas').text(entradas);
        $('#totalSaidas').text(saidas);
        $('#totalPalletsEntrada').text(palletsEntrada);
        $('#totalPalletsSaida').text(palletsSaida);
        $('#totalKgEntrada').text(kgEntrada.toFixed(2));
        $('#totalKgSaida').text(kgSaida.toFixed(2));
        $('#totalProdutos').text(produtos.size);
        $('#totalClientes').text(clientes.size);
        $('#qtdeTotalEntrada').text(qtdeTotalEntrada);
        $('#qtdeTotalSaida').text(qtdeTotalSaida);
        $('#valorTotalEntrada').text('R$ ' + formatarValor(valorTotalEntrada));
        $('#valorTotalSaida').text('R$ ' + formatarValor(valorTotalSaida));
        $('#mediaEntrada').text(entradas > 0 ? (qtdeTotalEntrada / entradas).toFixed(1) : '0');
        $('#mediaSaida').text(saidas > 0 ? (qtdeTotalSaida / saidas).toFixed(1) : '0');
    }

    // Carregar dados do localStorage
    function carregarDados() {
        const movimentacoesSalvas = localStorage.getItem(STORAGE_MOV_KEY);
        const estoqueSalvo = localStorage.getItem(STORAGE_ESTOQUE_KEY);
        
        if (movimentacoesSalvas) {
            movimentacoes = JSON.parse(movimentacoesSalvas);
        }
        if (estoqueSalvo) {
            estoque = JSON.parse(estoqueSalvo);
        }
    }

    // Salvar dados no localStorage
    function salvarDados() {
        localStorage.setItem(STORAGE_MOV_KEY, JSON.stringify(movimentacoes));
        localStorage.setItem(STORAGE_ESTOQUE_KEY, JSON.stringify(estoque));
        calcularEstatisticas();
    }

    // Mostrar alerta de produto não encontrado
    function mostrarAlertaProdutoNaoEncontrado(cliente, produto, lote) {
        $('#clienteAlerta').text(cliente);
        $('#produtoAlerta').text(produto);
        $('#loteAlerta').text(lote);
        $('#produtoNaoEncontradoAlert').addClass('show');
        setTimeout(() => {
            $('#produtoNaoEncontradoAlert').removeClass('show');
        }, 10000);
    }

    // Atualizar estoque baseado na movimentação
    function atualizarEstoque(movimentacao, isEdicao = false, movimentacaoAntiga = null) {
        const { 
            cliente,
            produtos,
            tipoMovimentacao,
            dataMovimentacao
        } = movimentacao;
        
        let todasSucesso = true;

        if (isEdicao && movimentacaoAntiga) {
            reverterMovimentacao(movimentacaoAntiga);
        }

        produtos.forEach(produto => {
            const { 
                produto: nomeProduto, 
                lote, 
                qtde
            } = produto;
            const quantidade = parseInt(qtde) || 0;
            
            if (quantidade <= 0) return;

            const indexEstoque = estoque.findIndex(item => 
                item.produto === nomeProduto && 
                item.lote === lote && 
                item.cliente === cliente
            );

            if (tipoMovimentacao === 'entrada') {
                if (indexEstoque === -1) {
                    estoque.push({
                        id: Date.now() + Math.random(),
                        cliente: cliente,
                        produto: nomeProduto,
                        lote: lote,
                        dataFabricacao: produto.dataFabricacao,
                        dataVencimento: produto.dataVencimento,
                        quantidade: quantidade,
                        ultimaMovimentacao: dataMovimentacao
                    });
                } else {
                    estoque[indexEstoque].quantidade += quantidade;
                    estoque[indexEstoque].ultimaMovimentacao = dataMovimentacao;
                }
            } else if (tipoMovimentacao === 'saida') {
                if (indexEstoque === -1) {
                    const existeNoEstoqueCliente = estoque.some(item => 
                        item.produto === nomeProduto && 
                        item.cliente === cliente
                    );
                    
                    if (existeNoEstoqueCliente) {
                        estoque.push({
                            id: Date.now() + Math.random(),
                            cliente: cliente,
                            produto: nomeProduto,
                            lote: lote,
                            dataFabricacao: produto.dataFabricacao,
                            dataVencimento: produto.dataVencimento,
                            quantidade: 0,
                            ultimaMovimentacao: dataMovimentacao
                        });
                        const novoIndex = estoque.length - 1;
                        estoque[novoIndex].quantidade -= quantidade;
                        
                        if (estoque[novoIndex].quantidade < 0) {
                            console.warn(`Quantidade negativa para ${nomeProduto} (Lote: ${lote}) do cliente ${cliente}`);
                        }
                    } else {
                        mostrarAlertaProdutoNaoEncontrado(cliente, nomeProduto, lote);
                        todasSucesso = false;
                    }
                } else {
                    if (estoque[indexEstoque].quantidade < quantidade) {
                        estoque[indexEstoque].quantidade -= quantidade;
                        estoque[indexEstoque].ultimaMovimentacao = dataMovimentacao;
                        
                        console.warn(`Quantidade insuficiente para ${nomeProduto} (Lote: ${lote}) do cliente ${cliente}. Estoque ficará negativo.`);
                    } else {
                        estoque[indexEstoque].quantidade -= quantidade;
                        estoque[indexEstoque].ultimaMovimentacao = dataMovimentacao;
                        
                        if (estoque[indexEstoque].quantidade === 0) {
                            estoque.splice(indexEstoque, 1);
                        }
                    }
                }
            }
        });
        
        return todasSucesso;
    }

    // Função para reverter uma movimentação (usada na edição)
    function reverterMovimentacao(movimentacao) {
        const { 
            cliente,
            produtos,
            tipoMovimentacao
        } = movimentacao;

        produtos.forEach(produto => {
            const { 
                produto: nomeProduto, 
                lote, 
                qtde
            } = produto;
            const quantidade = parseInt(qtde) || 0;
            
            if (quantidade <= 0) return;

            const indexEstoque = estoque.findIndex(item => 
                item.produto === nomeProduto && 
                item.lote === lote && 
                item.cliente === cliente
            );

            if (tipoMovimentacao === 'entrada') {
                if (indexEstoque !== -1) {
                    estoque[indexEstoque].quantidade -= quantidade;
                    if (estoque[indexEstoque].quantidade <= 0) {
                        estoque.splice(indexEstoque, 1);
                    }
                }
            } else if (tipoMovimentacao === 'saida') {
                if (indexEstoque !== -1) {
                    estoque[indexEstoque].quantidade += quantidade;
                } else {
                    estoque.push({
                        id: Date.now() + Math.random(),
                        cliente: cliente,
                        produto: nomeProduto,
                        lote: lote,
                        dataFabricacao: produto.dataFabricacao,
                        dataVencimento: produto.dataVencimento,
                        quantidade: quantidade,
                        ultimaMovimentacao: new Date().toISOString().split('T')[0]
                    });
                }
            }
        });
    }

    // Função para obter clientes únicos do estoque
    function getClientesUnicos() {
        const clientes = [...new Set(estoque.map(item => item.cliente))];
        return clientes.sort();
    }

    // Função para obter produtos de um cliente específico
    function getProdutosDoCliente(cliente) {
        const produtos = estoque
            .filter(item => item.cliente === cliente)
            .map(item => item.produto);
        return [...new Set(produtos)].sort();
    }

    // Função para obter lotes de um produto específico de um cliente
    function getLotesDoProduto(cliente, produto) {
        const lotes = estoque
            .filter(item => item.cliente === cliente && item.produto === produto)
            .map(item => item.lote);
        return [...new Set(lotes)].sort();
    }

    // Função para criar autocomplete
    function autocomplete(inp, arr) {
        let currentFocus;
        inp.addEventListener("input", function(e) {
            let a, b, i, val = this.value;
            closeAllLists();
            if (!val) { return false;}
            currentFocus = -1;
            a = document.createElement("DIV");
            a.setAttribute("id", this.id + "autocomplete-list");
            a.setAttribute("class", "autocomplete-items");
            this.parentNode.appendChild(a);
            for (i = 0; i < arr.length; i++) {
                if (arr[i].substr(0, val.length).toUpperCase() == val.toUpperCase()) {
                    b = document.createElement("DIV");
                    b.innerHTML = "<strong>" + arr[i].substr(0, val.length) + "</strong>";
                    b.innerHTML += arr[i].substr(val.length);
                    b.innerHTML += "<input type='hidden' value='" + arr[i] + "'>";
                    b.addEventListener("click", function(e) {
                        inp.value = this.getElementsByTagName("input")[0].value;
                        closeAllLists();
                        
                        if (inp.id === "cliente") {
                            atualizarCamposProduto();
                        }
                    });
                    a.appendChild(b);
                }
            }
        });
        
        inp.addEventListener("keydown", function(e) {
            let x = document.getElementById(this.id + "autocomplete-list");
            if (x) x = x.getElementsByTagName("div");
            if (e.keyCode == 40) {
                currentFocus++;
                addActive(x);
            } else if (e.keyCode == 38) {
                currentFocus--;
                addActive(x);
            } else if (e.keyCode == 13) {
                e.preventDefault();
                if (currentFocus > -1) {
                    if (x) x[currentFocus].click();
                }
            }
        });
        
        function addActive(x) {
            if (!x) return false;
            removeActive(x);
            if (currentFocus >= x.length) currentFocus = 0;
            if (currentFocus < 0) currentFocus = (x.length - 1);
            x[currentFocus].classList.add("autocomplete-active");
        }
        
        function removeActive(x) {
            for (let i = 0; i < x.length; i++) {
                x[i].classList.remove("autocomplete-active");
            }
        }
        
        function closeAllLists(elmnt) {
            const x = document.getElementsByClassName("autocomplete-items");
            for (let i = 0; i < x.length; i++) {
                if (elmnt != x[i] && elmnt != inp) {
                    x[i].parentNode.removeChild(x[i]);
                }
            }
        }
        
        document.addEventListener("click", function (e) {
            closeAllLists(e.target);
        });
    }

    // Atualizar campos de produto quando cliente é selecionado
    function atualizarCamposProduto() {
        const cliente = $('#cliente').val();
        if (!cliente) return;
        
        $('.produto-item').each(function() {
            const $produtoInput = $(this).find('.produto-nome');
            const $loteInput = $(this).find('.produto-lote');
            
            $loteInput.val('');
            
            const produtos = getProdutosDoCliente(cliente);
            if (produtos.length > 0) {
                const oldId = $produtoInput.attr('id');
                if (oldId) {
                    const oldList = document.getElementById(oldId + "autocomplete-list");
                    if (oldList) oldList.parentNode.removeChild(oldList);
                }
                
                const newId = 'produto-' + Date.now() + '-' + Math.random();
                $produtoInput.attr('id', newId);
                autocomplete(document.getElementById(newId), produtos);
                
                const newInput = document.getElementById(newId);
                newInput.addEventListener('input', function() {
                    setTimeout(() => {
                        const produto = this.value;
                        if (produto) {
                            const lotes = getLotesDoProduto(cliente, produto);
                            if (lotes.length > 0) {
                                const loteInput = $(this).closest('.produto-item').find('.produto-lote')[0];
                                const loteId = 'lote-' + Date.now() + '-' + Math.random();
                                $(loteInput).attr('id', loteId);
                                
                                const oldLoteList = document.getElementById(loteInput.id + "autocomplete-list");
                                if (oldLoteList) oldLoteList.parentNode.removeChild(oldLoteList);
                                
                                autocomplete(document.getElementById(loteId), lotes);
                            }
                        }
                    }, 100);
                });
            }
        });
    }

    // Criar template de produto
    function criarTemplateProduto(index, produtoData = null) {
        const hoje = new Date().toISOString().split('T')[0];
        const umAnoDepois = new Date();
        umAnoDepois.setFullYear(umAnoDepois.getFullYear() + 1);
        const vencimentoPadrao = umAnoDepois.toISOString().split('T')[0];
        
        const produtoId = 'produto-' + Date.now() + '-' + index;
        const loteId = 'lote-' + Date.now() + '-' + index;
        
        const produtoValue = produtoData ? produtoData.produto : '';
        const qtdeValue = produtoData ? produtoData.qtde : '';
        const palletsValue = produtoData ? produtoData.qtdePallets : '';
        const pesoValue = produtoData ? produtoData.pesoNf : '';
        const loteValue = produtoData ? produtoData.lote : '';
        const fabricacaoValue = produtoData ? produtoData.dataFabricacao : hoje;
        const vencimentoValue = produtoData ? produtoData.dataVencimento : vencimentoPadrao;
        
        return `
            <div class="produto-item" data-index="${index}">
                <div class="produto-header">
                    <div class="produto-title">Produto ${index + 1}</div>
                    ${index > 0 ? '<button type="button" class="remove-produto-btn">Remover</button>' : ''}
                </div>
                <div class="row g-2">
                    <div class="col-12 col-md-4">
                        <label class="form-label">PRODUTO *</label>
                        <div class="autocomplete">
                            <input type="text" class="form-control produto-nome" id="${produtoId}" placeholder="Nome do Produto" value="${produtoValue}" required>
                            <div id="${produtoId}-autocomplete-list" class="autocomplete-items"></div>
                        </div>
                    </div>
                    <div class="col-12 col-md-2">
                        <label class="form-label">QTDE *</label>
                        <input type="number" class="form-control produto-qtde" placeholder="0" min="0" value="${qtdeValue}" required>
                    </div>
                    <div class="col-12 col-md-2">
                        <label class="form-label">QTDE PALLETS</label>
                        <input type="number" class="form-control produto-pallets" placeholder="0" min="0" value="${palletsValue}">
                    </div>
                    <div class="col-12 col-md-2">
                        <label class="form-label">PESO NF (KG)</label>
                        <input type="number" class="form-control produto-peso" placeholder="0.00" min="0" step="0.01" value="${pesoValue}">
                    </div>
                    <div class="col-12 col-md-2">
                        <label class="form-label">LOTE *</label>
                        <div class="autocomplete">
                            <input type="text" class="form-control produto-lote" id="${loteId}" placeholder="Lote" value="${loteValue}" required>
                            <div id="${loteId}-autocomplete-list" class="autocomplete-items"></div>
                        </div>
                    </div>
                    <div class="col-12 col-md-2">
                        <label class="form-label">FABRICAÇÃO *</label>
                        <input type="date" class="form-control produto-fabricacao" value="${fabricacaoValue}" required>
                    </div>
                    <div class="col-12 col-md-2">
                        <label class="form-label">VENCIMENTO *</label>
                        <input type="date" class="form-control produto-vencimento" value="${vencimentoValue}" required>
                    </div>
                </div>
            </div>
        `;
    }

    //adicionar mais produtos no formulario de cadastro
function criarTemplateProdutoEstoque(index) {

    return `
        <div class="produto-item border p-3 mb-3">

            <div class="row">

                <div class="col-md-4">
                    <label>Produto</label>
                    <input type="text" class="form-control produto" placeholder="Produto">
                </div>

                <div class="col-md-2">
                    <label>Lote</label>
                    <input type="text" class="form-control lote" placeholder="Lote">
                </div>

                <div class="col-md-2">
                    <label>Quantidade</label>
                    <input type="number" class="form-control quantidade" placeholder="0">
                </div>

                <div class="col-md-2">
                    <label>Fabricação</label>
                    <input type="date" class="form-control fabricacao">
                </div>

                <div class="col-md-2">
                    <label>Vencimento</label>
                    <input type="date" class="form-control vencimento">
                </div>

                <div class="col-md-12 mt-2 text-end">
                    <button type="button" class="btn btn-danger remove-produto-btn">
                        Remover
                    </button>
                </div>

            </div>

        </div>
    `;
}

    const addEstoqueProdutoBtn = $('#addEstoqueProdutoBtn');
    const estoqueProdutosContainer = $('#estoqueProdutosContainer');
    function adicionarProdutoEstoque() {
        const index = estoqueProdutosContainer.children('.produto-item').length;
        estoqueProdutosContainer.append(criarTemplateProdutoEstoque(index));
        estoqueProdutosContainer.find('.remove-produto-btn').off('click').on('click', function() {
            $(this).closest('.produto-item').remove();
        });

        
    }
    addEstoqueProdutoBtn.on('click', adicionarProdutoEstoque);

    // Adicionar produto ao formulário
    function adicionarProduto(produtoData = null) {
        const container = $('#produtosContainer');
        const index = container.children('.produto-item').length;
        container.append(criarTemplateProduto(index, produtoData));
        
        $('.remove-produto-btn').off('click').on('click', function() {
            $(this).closest('.produto-item').remove();
        });
        
        const cliente = $('#cliente').val();
        if (cliente) {
            const $ultimoProduto = $('.produto-item').last();
            const produtos = getProdutosDoCliente(cliente);
            if (produtos.length > 0) {
                const produtoInput = $ultimoProduto.find('.produto-nome')[0];
                autocomplete(produtoInput, produtos);
                
                $(produtoInput).on('input', function() {
                    setTimeout(() => {
                        const produto = $(this).val();
                        if (produto) {
                            const lotes = getLotesDoProduto(cliente, produto);
                            if (lotes.length > 0) {
                                const loteInput = $(this).closest('.produto-item').find('.produto-lote')[0];
                                const loteId = 'lote-' + Date.now() + '-' + Math.random();
                                $(loteInput).attr('id', loteId);
                                
                                const oldList = document.getElementById(loteInput.id + "autocomplete-list");
                                if (oldList) oldList.parentNode.removeChild(oldList);
                                
                                autocomplete(document.getElementById(loteId), lotes);
                            }
                        }
                    }, 100);
                });
            }
        }
    }

    // Inicializar com um produto
    adicionarProduto();

    // Adicionar novo produto
    $('#addProdutoBtn').on('click', adicionarProduto);

    // Carregar dados de uma movimentação para edição
    function carregarMovimentacaoParaEdicao(index) {
        const movimentacao = movimentacoes[index];
        editandoMovimentacaoIndex = index;
        
        $('#dataMovimentacao').val(movimentacao.dataMovimentacao);
        $('#tipoMovimentacao').val(movimentacao.tipoMovimentacao);
        $('#cte').val(movimentacao.cte);
        $('#nf').val(movimentacao.nf);
        $('#nfAgro').val(movimentacao.nfAgro || '');
        $('#cliente').val(movimentacao.cliente);
        $('#motorista').val(movimentacao.motorista);
        $('#valorNf').val(movimentacao.valorNf);
        $('#destino').val(movimentacao.destino);
        $('#observacoes').val(movimentacao.observacoes);
        
        $('#produtosContainer').empty();
        
        movimentacao.produtos.forEach(produto => {
            adicionarProduto(produto);
        });
        
        const clientes = getClientesUnicos();
        if (clientes.length > 0) {
            const clienteInput = document.getElementById("cliente");
            const oldList = document.getElementById("cliente-autocomplete-list");
            if (oldList) oldList.parentNode.removeChild(oldList);
            autocomplete(clienteInput, clientes);
        }
        
        atualizarCamposProduto();
        
        $('#submitBtn').text('Atualizar Movimentação');
        $('#cancelEditBtn').show();
    }

    // Cancelar edição
    $('#cancelEditBtn').on('click', function() {
        $('#dataForm')[0].reset();
        $('#produtosContainer').empty();
        adicionarProduto();
        $('#submitBtn').text('Adicionar à Lista');
        $('#cancelEditBtn').hide();
        editandoMovimentacaoIndex = null;
        
        const hoje = new Date().toISOString().split('T')[0];
        $('#dataMovimentacao').val(hoje);
        $('#valorNf').val('');
    });

    // Adicionar/editar dados ao formulário de movimentação
    $('#dataForm').on('submit', function(e) {
        e.preventDefault();
        
        const produtos = [];
        let todosValidos = true;
        
        $('.produto-item').each(function() {
            const $item = $(this);
            const produto = {
                produto: $item.find('.produto-nome').val(),
                qtde: $item.find('.produto-qtde').val(),
                qtdePallets: $item.find('.produto-pallets').val() || '',
                pesoNf: $item.find('.produto-peso').val() || '',
                lote: $item.find('.produto-lote').val(),
                dataFabricacao: $item.find('.produto-fabricacao').val(),
                dataVencimento: $item.find('.produto-vencimento').val()
            };
            
            if (!produto.produto || !produto.qtde || !produto.lote || !produto.dataFabricacao || !produto.dataVencimento) {
                alert('Preencha todos os campos obrigatórios dos produtos!');
                todosValidos = false;
                return false;
            }
            
            if (new Date(produto.dataVencimento) < new Date(produto.dataFabricacao)) {
                alert('A data de vencimento não pode ser anterior à data de fabricação!');
                todosValidos = false;
                return false;
            }
            
            produtos.push(produto);
        });
        
        if (!todosValidos) return;
        if (produtos.length === 0) {
            alert('Adicione pelo menos um produto!');
            return;
        }
        
        const novoDado = {
            dataMovimentacao: $('#dataMovimentacao').val(),
            tipoMovimentacao: $('#tipoMovimentacao').val(),
            cte: $('#cte').val(),
            nf: $('#nf').val(),
            nfAgro: $('#nfAgro').val() || '',
            cliente: $('#cliente').val(),
            produtos: produtos,
            motorista: $('#motorista').val(),
            valorNf: $('#valorNf').val() || '',
            destino: $('#destino').val(),
            observacoes: $('#observacoes').val() || ''
        };

        if (!novoDado.dataMovimentacao || !novoDado.tipoMovimentacao || !novoDado.nf || !novoDado.cliente) {
            alert('Preencha todos os campos obrigatórios!');
            return;
        }

        if (editandoMovimentacaoIndex !== null) {
            const movimentacaoAntiga = movimentacoes[editandoMovimentacaoIndex];
            const sucesso = atualizarEstoque(novoDado, true, movimentacaoAntiga);
            
            if (sucesso) {
                movimentacoes[editandoMovimentacaoIndex] = novoDado;
                salvarDados();
                aplicarFiltros();
                atualizarTabelasEstoque();
                
                $('#dataForm')[0].reset();
                $('#produtosContainer').empty();
                adicionarProduto();
                $('#submitBtn').text('Adicionar à Lista');
                $('#cancelEditBtn').hide();
                editandoMovimentacaoIndex = null;
                
                const hoje = new Date().toISOString().split('T')[0];
                $('#dataMovimentacao').val(hoje);
                $('#valorNf').val('');
            }
        } else {
            if (novoDado.tipoMovimentacao === 'saida') {
                const sucesso = atualizarEstoque(novoDado);
            } else {
                atualizarEstoque(novoDado);
            }

            movimentacoes.push(novoDado);
            salvarDados();
            aplicarFiltros();
            atualizarTabelasEstoque();
            $('#dataForm')[0].reset();
            $('#produtosContainer').empty();
            adicionarProduto();
            
            const hoje = new Date().toISOString().split('T')[0];
            $('#dataMovimentacao').val(hoje);
            $('#valorNf').val('');
        }
    });

    // Adicionar/editar produto no estoque diretamente
    $('#estoqueForm').on('submit', function(e) {
        e.preventDefault();

        const produtos = $('.produto-item');
        const listaProdutos = [];

        const dataFabricacao = $('#estoqueFabricacao').val();
        const dataVencimento = $('#estoqueVencimento').val();
        produtos.each(function() {

    const produto = $(this).find('.produto').val();
    const lote = $(this).find('.lote').val();
    const quantidade = $(this).find('.quantidade').val();
    const fabricacao = $(this).find('.fabricacao').val();
    const vencimento = $(this).find('.vencimento').val();
        
        if (new Date(dataVencimento) < new Date(dataFabricacao)) {
            alert('A data de vencimento não pode ser anterior à data de fabricação!');
            return;
        }

    listaProdutos.push({
        produto,
        lote,
        quantidade,
        fabricacao,
        vencimento
    });

});
        
        const cliente = $('#estoqueCliente').val();
        const produto = $('#estoqueProduto').val();
        const lote = $('#estoqueLote').val();
        const quantidade = parseInt($('#estoqueQuantidade').val());
        const fabricacao = dataFabricacao;
        const vencimento = dataVencimento;
        
        if (editandoItemId === null) {

            listaProdutos.forEach(item => {

            const novoProduto = {
                id: Date.now(),
                cliente: cliente,
                produto: produto,
                lote: lote,
                dataFabricacao: fabricacao,
                dataVencimento: vencimento,
                quantidade: quantidade,
                ultimaMovimentacao: new Date().toISOString().split('T')[0]
            };
            estoque.push(novoProduto);
            });

        } else {
            const index = estoque.findIndex(item => item.id === editandoItemId);
            if (index !== -1) {

                const item = listaProdutos[0];

                estoque[index].cliente = cliente;
                estoque[index].produto = produto;
                estoque[index].lote = lote;
                estoque[index].dataFabricacao = fabricacao;
                estoque[index].dataVencimento = vencimento;
                estoque[index].quantidade = quantidade;
                estoque[index].ultimaMovimentacao = new Date().toISOString().split('T')[0];
            }
            editandoItemId = null;
            $('#cancelarEdicao').hide();
        }
        
        salvarDados();
        atualizarTabelasEstoque();
        $('#estoqueForm')[0].reset();
    });

    // Cancelar edição de estoque
    $('#cancelarEdicao').on('click', function() {
        editandoItemId = null;
        $(this).hide();
        $('#estoqueForm')[0].reset();
    });

    // Função para renderizar a tabela de movimentações
    function renderizarTabelaMovimentacoes(dadosFiltrados) {
        const tbody = $('#dataTableBody');
        tbody.empty();

        if (dadosFiltrados.length === 0) {
            tbody.append('<tr><td colspan="10" class="text-center">Nenhuma movimentação encontrada</td></tr>');
            return;
        }

        dadosFiltrados.forEach((dado, index) => {
            const tipoClasse = dado.tipoMovimentacao === 'entrada' ? 'tipo-entrada' : 'tipo-saida';
            const tipoBadge = dado.tipoMovimentacao === 'entrada' ? '<span class="badge-entrada">ENTRADA</span>' : '<span class="badge-saida">SAÍDA</span>';
            const observacoes = dado.observacoes || '';
            const nfAgro = dado.nfAgro || '';
            const totalQtde = dado.produtos.reduce((sum, p) => sum + parseInt(p.qtde || 0), 0);
            const produtosLista = dado.produtos.map(p => `${p.produto} (Lote: ${p.lote})`).join(', ');
            
            const row = `
                <tr class="${tipoClasse}">
                    <td>${formatarData(dado.dataMovimentacao)}</td>
                    <td>${tipoBadge}</td>
                    <td>${dado.nf}</td>
                    <td>${nfAgro}</td>
                    <td>${dado.cliente}</td>
                    <td class="observacao-cell" title="${produtosLista}">${produtosLista}</td>
                    <td>${totalQtde}</td>
                    <td class="observacao-cell" title="${observacoes}">${observacoes}</td>
                    <td>
                        <button class="edit-nf-btn btn-sm" data-index="${movimentacoes.indexOf(dado)}">Editar</button>
                        <button class="delete-btn btn-sm" data-index="${movimentacoes.indexOf(dado)}">Excluir</button>
                    </td>
                </tr>
            `;
            tbody.append(row);
        });

        // MODIFICAÇÃO AQUI: Adicionar confirmação antes de excluir
        $('.delete-btn').on('click', function() {
            const originalIndex = $(this).data('index');
            const movimentacao = movimentacoes[originalIndex];
            
            if (confirm(`Tem certeza que deseja excluir a movimentação ${movimentacao.nf} do cliente ${movimentacao.cliente}?`)) {
                const movimentacaoRemovida = movimentacoes[originalIndex];
                
                movimentacoes.splice(originalIndex, 1);
                
                if (movimentacaoRemovida.tipoMovimentacao === 'entrada') {
                    movimentacaoRemovida.produtos.forEach(produto => {
                        const indexEstoque = estoque.findIndex(item => 
                            item.produto === produto.produto && 
                            item.lote === produto.lote && 
                            item.cliente === movimentacaoRemovida.cliente
                        );
                        if (indexEstoque !== -1) {
                            estoque[indexEstoque].quantidade -= parseInt(produto.qtde);
                            if (estoque[indexEstoque].quantidade <= 0) {
                                estoque.splice(indexEstoque, 1);
                            }
                        }
                    });
                } else if (movimentacaoRemovida.tipoMovimentacao === 'saida') {
                    movimentacaoRemovida.produtos.forEach(produto => {
                        const indexEstoque = estoque.findIndex(item => 
                            item.produto === produto.produto && 
                            item.lote === produto.lote && 
                            item.cliente === movimentacaoRemovida.cliente
                        );
                        if (indexEstoque !== -1) {
                            estoque[indexEstoque].quantidade += parseInt(produto.qtde);
                        } else {
                            estoque.push({
                                id: Date.now() + Math.random(),
                                cliente: movimentacaoRemovida.cliente,
                                produto: produto.produto,
                                lote: produto.lote,
                                dataFabricacao: produto.dataFabricacao,
                                dataVencimento: produto.dataVencimento,
                                quantidade: parseInt(produto.qtde),
                                ultimaMovimentacao: new Date().toISOString().split('T')[0]
                            });
                        }
                    });
                }
                
                salvarDados();
                aplicarFiltros();
                atualizarTabelasEstoque();
                alert('Movimentação excluída com sucesso!');
            }
        });

        $('.edit-nf-btn').on('click', function() {
            const index = $(this).data('index');
            carregarMovimentacaoParaEdicao(index);
        });
    }

    // Função para atualizar estoque geral
    function atualizarEstoqueGeral() {
        const tbody = $('#estoqueGeralTableBody');
        const info = $('#estoqueGeralInfo');
        tbody.empty();

        if (estoque.length === 0) {
            info.show();
            return;
        }

        info.hide();
        
        const estoqueAgrupado = {};
        estoque.forEach(item => {
            const chave = `${item.produto}`;
            if (!estoqueAgrupado[chave]) {
                estoqueAgrupado[chave] = {
                    produto: item.produto,
                    totalQuantidade: 0,
                    lotes: new Set(),
                    datasVencimento: []
                };
            }
            estoqueAgrupado[chave].totalQuantidade += item.quantidade;
            estoqueAgrupado[chave].lotes.add(item.lote);
            estoqueAgrupado[chave].datasVencimento.push(item.dataVencimento);
        });

        Object.values(estoqueAgrupado).forEach(item => {
            let statusMedio = 'VÁLIDO';
            const hoje = new Date();
            
            for (const dataVenc of item.datasVencimento) {
                const vencimento = new Date(dataVenc);
                const diffDays = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));
                
                if (diffDays < 0) {
                    statusMedio = 'VENCIDO';
                    break;
                } else if (diffDays <= 30) {
                    statusMedio = 'VENCE EM BREVE';
                }
            }
            
            const statusClasse = statusMedio === 'VENCIDO' ? 'vencimento-vencido' : 
                                statusMedio === 'VENCE EM BREVE' ? 'vencimento-proximo' : '';
            
            const row = `
                <tr class="${statusClasse}">
                    <td>${item.produto}</td>
                    <td>${item.lotes.size} lote(s)</td>
                    <td><strong>${item.totalQuantidade}</strong></td>
                    <td>${statusMedio}</td>
                </tr>
            `;
            tbody.append(row);
        });
    }

    // Função para atualizar estoque por cliente
    function atualizarEstoquePorCliente() {
        const tabsContainer = $('#clienteTabs');
        const contentContainer = $('#clienteTabContent');
        tabsContainer.empty();
        contentContainer.empty();

        if (estoque.length === 0) {
            contentContainer.append('<div class="alert alert-info p-3 text-center">Nenhum cliente com estoque cadastrado.</div>');
            return;
        }

        const clientes = [...new Set(estoque.map(item => item.cliente))];
        
        clientes.forEach((cliente, index) => {
            const activeClass = index === 0 ? 'active' : '';
            const activeAria = index === 0 ? 'true' : 'false';
            
            tabsContainer.append(`
                <li class="nav-item" role="presentation">
                    <button class="nav-link ${activeClass}" id="cliente-${index}-tab" 
                            data-bs-toggle="tab" data-bs-target="#cliente-${index}" 
                            type="button" role="tab" aria-selected="${activeAria}">
                        <span class="cliente-badge">${cliente}</span>
                    </button>
                </li>
            `);
            
            const estoqueCliente = estoque.filter(item => item.cliente === cliente);
            let tableRows = '';
            
            estoqueCliente.forEach(item => {
                const statusVenc = getStatusVencimento(item.dataVencimento);
                const statusClasse = statusVenc.classe;
                const estoqueZeroClasse = item.quantidade === 0 ? 'estoque-zero' : '';
                const finalClasse = statusClasse ? statusClasse : estoqueZeroClasse;
                
                const quantidadeClasse = item.quantidade < 0 ? 'text-danger fw-bold' : '';
                
                tableRows += `
                    <tr class="${finalClasse}">
                        <td>${item.produto}</td>
                        <td>${item.lote}</td>
                        <td>${formatarData(item.dataFabricacao)}</td>
                        <td>${formatarData(item.dataVencimento)}</td>
                        <td class="${quantidadeClasse}">${item.quantidade}</td>
                        <td>${statusVenc.status}</td>
                        <td>
                            <button class="edit-btn btn-sm" data-id="${item.id}">Editar</button>
                            <button class="delete-btn btn-sm" data-id="${item.id}">Excluir</button>
                        </td>
                    </tr>
                `;
            });
            
            contentContainer.append(`
                <div class="tab-pane fade ${activeClass} show" id="cliente-${index}" role="tabpanel">
                    <div class="card">
                        <div class="card-body p-4">
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <h5 class="mb-0">Estoque - ${cliente}</h5>
                                <button class="btn btn-warning btn-sm export-cliente-btn" data-cliente="${cliente}">Exportar Estoque Cliente</button>
                            </div>
                            <div class="table-responsive">
                                <table class="table table-striped">
                                    <thead>
                                        <tr>
                                            <th>PRODUTO</th>
                                            <th>LOTE</th>
                                            <th>FABRICAÇÃO</th>
                                            <th>VENCIMENTO</th>
                                            <th>QTDE</th>
                                            <th>STATUS</th>
                                            <th>AÇÕES</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${tableRows}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            `);
        });

        $('.edit-btn').on('click', function() {
            const id = $(this).data('id');
            const item = estoque.find(item => item.id === id);
            if (item) {
                $('#estoqueCliente').val(item.cliente);
                $('#estoqueProduto').val(item.produto);
                $('#estoqueLote').val(item.lote);
                $('#estoqueQuantidade').val(item.quantidade);
                $('#estoqueFabricacao').val(item.dataFabricacao);
                $('#estoqueVencimento').val(item.dataVencimento);
                editandoItemId = id;
                $('#cancelarEdicao').show();
            }
        });

        // MODIFICAÇÃO AQUI: Adicionar confirmação antes de excluir
        $('.delete-btn').on('click', function() {
            const id = $(this).data('id');
            const item = estoque.find(item => item.id === id);
            
            if (item && confirm(`Tem certeza que deseja excluir o produto ${item.produto} (Lote: ${item.lote}) do cliente ${item.cliente}?`)) {
                estoque = estoque.filter(item => item.id !== id);
                salvarDados();
                atualizarTabelasEstoque();
                alert('Produto excluído com sucesso!');
            }
        });

        $('.export-cliente-btn').on('click', function() {
            const clienteNome = $(this).data('cliente');
            const estoqueCliente = estoque.filter(item => item.cliente === clienteNome);
            
            if (estoqueCliente.length === 0) {
                alert('Nenhum dado de estoque para este cliente!');
                return;
            }

            const wsData = estoqueCliente.map(item => {
                const statusVenc = getStatusVencimento(item.dataVencimento);
                return {
                    'CLIENTE': item.cliente,
                    'PRODUTO': item.produto,
                    'LOTE': item.lote,
                    'DATA FABRICAÇÃO': formatarData(item.dataFabricacao),
                    'DATA VENCIMENTO': formatarData(item.dataVencimento),
                    'QUANTIDADE TOTAL': item.quantidade,
                    'STATUS VALIDADE': statusVenc.status
                };
            });

            const ws = XLSX.utils.json_to_sheet(wsData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, `Estoque_${clienteNome.replace(/\s+/g, '_')}`);

            const colWidths = [
                {wch: 20},
                {wch: 25},
                {wch: 15},
                {wch: 15},
                {wch: 15},
                {wch: 18},
                {wch: 20}
            ];
            ws['!cols'] = colWidths;

            XLSX.writeFile(wb, `estoque_${clienteNome.replace(/\s+/g, '_')}.xlsx`);
        });
    }

    // Função para atualizar todas as tabelas de estoque
    function atualizarTabelasEstoque() {
        atualizarEstoqueGeral();
        atualizarEstoquePorCliente();
    }

    // Função para aplicar filtros
    function aplicarFiltros() {
        const filtroNf = $('#filterNf').val().toLowerCase();
        const filtroNfAgro = $('#filterNfAgro').val().toLowerCase();
        const filtroDataInicio = $('#filterDataInicio').val();
        const filtroDataFim = $('#filterDataFim').val();
        const filtroCliente = $('#filterCliente').val().toLowerCase();
        const filtroProduto = $('#filterProduto').val().toLowerCase();
        const filtroTipo = $('#filterTipo').val();

        const dadosFiltrados = movimentacoes.filter(dado => {
            const nfMatch = !filtroNf || dado.nf.toLowerCase().includes(filtroNf);
            const nfAgroMatch = !filtroNfAgro || (dado.nfAgro && dado.nfAgro.toLowerCase().includes(filtroNfAgro));
            
            let dataMatch = true;
            if (filtroDataInicio || filtroDataFim) {
                const dataMov = new Date(dado.dataMovimentacao);
                if (filtroDataInicio) {
                    const dataInicio = new Date(filtroDataInicio);
                    dataMatch = dataMatch && dataMov >= dataInicio;
                }
                if (filtroDataFim) {
                    const dataFim = new Date(filtroDataFim);
                    dataMatch = dataMatch && dataMov <= dataFim;
                }
            }
            
            const clienteMatch = !filtroCliente || dado.cliente.toLowerCase().includes(filtroCliente);
            const produtoMatch = !filtroProduto || dado.produtos.some(p => p.produto.toLowerCase().includes(filtroProduto));
            const tipoMatch = !filtroTipo || dado.tipoMovimentacao === filtroTipo;
            
            return nfMatch && nfAgroMatch && dataMatch && clienteMatch && produtoMatch && tipoMatch;
        });

        renderizarTabelaMovimentacoes(dadosFiltrados);
    }

    // Eventos de filtro
    $('#applyFilter').on('click', aplicarFiltros);
    
    $('#clearFilter').on('click', function() {
        $('#filterNf, #filterNfAgro, #filterDataInicio, #filterDataFim, #filterCliente, #filterProduto').val('');
        $('#filterTipo').val('');
        aplicarFiltros();
    });

    // Permitir filtragem ao digitar Enter
    $('.filter-section input, .filter-section select').on('keypress', function(e) {
        if (e.which === 13) {
            aplicarFiltros();
        }
    });

    // Exportar movimentações para Excel
    $('#exportBtn').on('click', function() {
        if (movimentacoes.length === 0) {
            alert('Nenhuma movimentação para exportar!');
            return;
        }

        const wsData = [];
        movimentacoes.forEach(dado => {
            dado.produtos.forEach(produto => {
                wsData.push({
                    'DATA MOVIMENTAÇÃO': formatarData(dado.dataMovimentacao),
                    'TIPO': dado.tipoMovimentacao === 'entrada' ? 'ENTRADA' : 'SAÍDA',
                    'CT-e': dado.cte,
                    'NF': dado.nf,
                    'NF AGRO': dado.nfAgro || '',
                    'CLIENTE/FORNECEDOR': dado.cliente,
                    'PRODUTO': produto.produto,
                    'QTDE PALLETS': produto.qtdePallets,
                    'QTDE': produto.qtde,
                    'PESO NF': produto.pesoNf,
                    'LOTE': produto.lote,
                    'DATA FABRICAÇÃO': formatarData(produto.dataFabricacao),
                    'DATA VENCIMENTO': formatarData(produto.dataVencimento),
                    'MOTORISTA': dado.motorista,
                    'VALOR NF': dado.valorNf ? dado.valorNf : 'R$ 0,00',
                    'DESTINO/LOCAL': dado.destino,
                    'OBSERVAÇÕES': dado.observacoes
                });
            });
        });

        const ws = XLSX.utils.json_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Movimentacoes");

        const colWidths = [
            {wch: 15},
            {wch: 10},
            {wch: 15},
            {wch: 12},
            {wch: 12},
            {wch: 20},
            {wch: 20},
            {wch: 12},
            {wch: 10},
            {wch: 12},
            {wch: 12},
            {wch: 15},
            {wch: 15},
            {wch: 20},
            {wch: 15},
            {wch: 20},
            {wch: 25}
        ];
        ws['!cols'] = colWidths;

        XLSX.writeFile(wb, "movimentacoes_transporte.xlsx");
    });

    // Exportar estoque geral para Excel
    $('#exportEstoqueGeralBtn').on('click', function() {
        if (estoque.length === 0) {
            alert('Nenhum dado de estoque geral para exportar!');
            return;
        }

        const estoqueAgrupado = {};
        estoque.forEach(item => {
            const chave = `${item.produto}`;
            if (!estoqueAgrupado[chave]) {
                estoqueAgrupado[chave] = {
                    produto: item.produto,
                    totalQuantidade: 0,
                    lotes: new Set(),
                    datasVencimento: []
                };
            }
            estoqueAgrupado[chave].totalQuantidade += item.quantidade;
            estoqueAgrupado[chave].lotes.add(item.lote);
            estoqueAgrupado[chave].datasVencimento.push(item.dataVencimento);
        });

        const wsData = Object.values(estoqueAgrupado).map(item => {
            let statusMedio = 'VÁLIDO';
            const hoje = new Date();
            
            for (const dataVenc of item.datasVencimento) {
                const vencimento = new Date(dataVenc);
                const diffDays = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));
                
                if (diffDays < 0) {
                    statusMedio = 'VENCIDO';
                    break;
                } else if (diffDays <= 30) {
                    statusMedio = 'VENCE EM BREVE';
                }
            }
            
            return {
                'PRODUTO': item.produto,
                'LOTE TOTAL': `${item.lotes.size} lote(s)`,
                'QUANTIDADE TOTAL': item.totalQuantidade,
                'STATUS MÉDIO': statusMedio
            };
        });

        const ws = XLSX.utils.json_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Estoque_Geral");

        const colWidths = [
            {wch: 25},
            {wch: 15},
            {wch: 18},
            {wch: 20}
        ];
        ws['!cols'] = colWidths;

        XLSX.writeFile(wb, "estoque_geral_transporte.xlsx");
    });

    // Exportar resumo para Excel
    $('#exportResumoBtn').on('click', function() {
        const wsData = [{
            'Métrica': 'Total de Entradas',
            'Valor': $('#totalEntradas').text()
        }, {
            'Métrica': 'Total de Saídas',
            'Valor': $('#totalSaidas').text()
        }, {
            'Métrica': 'Pallets Entrada',
            'Valor': $('#totalPalletsEntrada').text()
        }, {
            'Métrica': 'Pallets Saída',
            'Valor': $('#totalPalletsSaida').text()
        }, {
            'Métrica': 'KG Entrada',
            'Valor': $('#totalKgEntrada').text()
        }, {
            'Métrica': 'KG Saída',
            'Valor': $('#totalKgSaida').text()
        }, {
            'Métrica': 'Produtos Diferentes',
            'Valor': $('#totalProdutos').text()
        }, {
            'Métrica': 'Clientes Ativos',
            'Valor': $('#totalClientes').text()
        }, {
            'Métrica': 'Quantidade Total Entrada',
            'Valor': $('#qtdeTotalEntrada').text()
        }, {
            'Métrica': 'Quantidade Total Saída',
            'Valor': $('#qtdeTotalSaida').text()
        }, {
            'Métrica': 'Valor Total Entrada (R$)',
            'Valor': $('#valorTotalEntrada').text().replace('R$ ', '')
        }, {
            'Métrica': 'Valor Total Saída (R$)',
            'Valor': $('#valorTotalSaida').text().replace('R$ ', '')
        }];

        const ws = XLSX.utils.json_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Resumo_Estatisticas");

        XLSX.writeFile(wb, "resumo_estatisticas.xlsx");
    });

    // Função para importar movimentações
    function importarMovimentacoes(data) {
        try {
            const movimentacoesImportadas = [];
            
            data.forEach(row => {
                if (!row['NF'] || !row['CLIENTE/FORNECEDOR']) {
                    return;
                }
                
                const tipoMovimentacao = row['TIPO'] ? row['TIPO'].toLowerCase() : 'entrada';
                const produtos = [{
                    produto: row['PRODUTO'] || '',
                    qtde: row['QTDE'] || '0',
                    qtdePallets: row['QTDE PALLETS'] || '',
                    pesoNf: row['PESO NF'] || '',
                    lote: row['LOTE'] || '',
                    dataFabricacao: row['DATA FABRICAÇÃO'] ? row['DATA FABRICAÇÃO'].replace(/\//g, '-') : new Date().toISOString().split('T')[0],
                    dataVencimento: row['DATA VENCIMENTO'] ? row['DATA VENCIMENTO'].replace(/\//g, '-') : new Date().toISOString().split('T')[0]
                }];
                
                let valorNf = '';
                if (row['VALOR NF']) {
                    valorNf = formatarMoeda(row['VALOR NF'].replace(/[R$\s]/g, ''));
                }
                
                const movimentacao = {
                    dataMovimentacao: row['DATA MOVIMENTAÇÃO'] ? row['DATA MOVIMENTAÇÃO'].replace(/\//g, '-') : new Date().toISOString().split('T')[0],
                    tipoMovimentacao: tipoMovimentacao,
                    cte: row['CT-e'] || '',
                    nf: row['NF'],
                    nfAgro: row['NF AGRO'] || '',
                    cliente: row['CLIENTE/FORNECEDOR'],
                    produtos: produtos,
                    motorista: row['MOTORISTA'] || '',
                    valorNf: valorNf,
                    destino: row['DESTINO/LOCAL'] || '',
                    observacoes: row['OBSERVAÇÕES'] || ''
                };
                
                movimentacoesImportadas.push(movimentacao);
            });
            
            movimentacoes = movimentacoes.concat(movimentacoesImportadas);
            
            movimentacoesImportadas.forEach(mov => {
                atualizarEstoque(mov);
            });
            
            salvarDados();
            aplicarFiltros();
            atualizarTabelasEstoque();
            
            $('#importCount').text(movimentacoesImportadas.length);
            $('#importSuccess').show().delay(5000).fadeOut();
            
        } catch (error) {
            console.error('Erro ao importar movimentações:', error);
            $('#importError').show().delay(5000).fadeOut();
        }
    }

    // Função para importar estoque
    function importarEstoque(data) {
        try {
            const itensImportados = [];
            
            data.forEach(row => {
                if (!row['CLIENTE'] || !row['PRODUTO'] || !row['LOTE']) {
                    return;
                }
                
                const item = {
                    id: Date.now() + Math.random(),
                    cliente: row['CLIENTE'],
                    produto: row['PRODUTO'],
                    lote: row['LOTE'],
                    dataFabricacao: row['DATA FABRICAÇÃO'] ? row['DATA FABRICAÇÃO'].replace(/\//g, '-') : new Date().toISOString().split('T')[0],
                    dataVencimento: row['DATA VENCIMENTO'] ? row['DATA VENCIMENTO'].replace(/\//g, '-') : new Date().toISOString().split('T')[0],
                    quantidade: parseInt(row['QUANTIDADE TOTAL']) || 0,
                    ultimaMovimentacao: new Date().toISOString().split('T')[0]
                };
                
                itensImportados.push(item);
            });
            
            estoque = estoque.concat(itensImportados);
            
            salvarDados();
            atualizarTabelasEstoque();
            
            $('#importEstoqueCount').text(itensImportados.length);
            $('#importEstoqueSuccess').show().delay(5000).fadeOut();
            
        } catch (error) {
            console.error('Erro ao importar estoque:', error);
            $('#importEstoqueError').show().delay(5000).fadeOut();
        }
    }

    // Evento para importar arquivo de movimentações
    $('#importFile').on('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            importarMovimentacoes(jsonData);
        };
        reader.readAsArrayBuffer(file);
    });

    // Evento para importar arquivo de estoque
    $('#importEstoqueFile').on('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            importarEstoque(jsonData);
        };
        reader.readAsArrayBuffer(file);
    });

    // Inicializar autocomplete para cliente
    function initClienteAutocomplete() {
        const clientes = getClientesUnicos();
        if (clientes.length > 0) {
            autocomplete(document.getElementById("cliente"), clientes);
        }
    }

    // Carregar dados ao iniciar
    carregarDados();
    initClienteAutocomplete();
    aplicarFiltros();
    atualizarTabelasEstoque();
    calcularEstatisticas();

    // Atualizar data atual nos campos relevantes
    const hoje = new Date().toISOString().split('T')[0];
    $('#dataMovimentacao').val(hoje);
    $('#estoqueFabricacao').val(hoje);
});