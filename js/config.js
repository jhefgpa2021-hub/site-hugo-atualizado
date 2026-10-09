/* =========================================================
   MARONFIT — CONFIGURAÇÕES EDITÁVEIS
   Altere os dados abaixo; o site se atualiza sozinho.
   ========================================================= */
window.MARONFIT_CONFIG = {

  // Número do WhatsApp no formato internacional (somente dígitos)
  whatsapp: "5531984239408",

  // Mensagem que já aparece escrita quando a pessoa clica nos botões do WhatsApp
  mensagemWhatsapp: "Olá, Hugo! Vim pelo site do MaronFit e gostaria de saber mais.",

  // Registro profissional. Ex.: "CRN-9 12345". Deixe vazio ("") até ter o número.
  crn: "CRN-9 37282",

  /* ---------------------------------------------------------
     PROVA SOCIAL
     Os posts de prova social ficam direto no index.html (seção
     Histórias), dentro de <div class="carousel-track">.
     Imagens: assets/img/prova-social/
     --------------------------------------------------------- */

  /* ---------------------------------------------------------
     PROGRAMAS / PRODUTOS (estrutura para venda futura)
     A seção "Programas" e o link no menu só aparecem quando
     houver pelo menos um item nesta lista.

     Exemplo de item:
     {
       nome: "Nome do programa",
       descricao: "Descrição curta.",
       itens: ["Benefício 1", "Benefício 2"],
       preco: "R$ 000",            // opcional
       destaque: "Mais procurado", // opcional
       botao: "Quero este programa",
       link: ""                    // link de pagamento; vazio = abre o WhatsApp
     },
     --------------------------------------------------------- */
  programas: [
  ]
};
