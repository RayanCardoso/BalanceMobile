# Resumo do mês: cartões, atalhos e o mês em totais

Data: 2026-08-19
Telas: `DashboardScreen`, `CatalogueScreen` (removida), gaveta e rotas do catálogo.

## O problema

O Resumo do mês lista hoje, linha a linha, as quatro partições do mês: receitas recorrentes,
receitas variáveis, despesas recorrentes e despesas variáveis. Essa mesma informação já existe
inteira nas telas de Receitas e Despesas, com mais contexto do que o dashboard consegue dar — status,
menu de ações, valor provisório. O dashboard repete o que a tela ao lado faz melhor e, por causa
disso, não sobra espaço para o que só ele pode responder: **quanto o mês devia ser e quanto ele
efetivamente é.**

No mesmo movimento, as contas cadastradas ficam escondidas atrás de um menu ("Catálogo") cuja única
função é ser um índice de três links. Um índice de três itens é navegação a mais para informação
que cabe na tela inicial.

## O que a tela passa a ser

Na ordem, de cima para baixo:

1. **Tendência do mês** — o `MonthNavigator` com a linha, inalterado.
2. **Resumo do mês** — um card com Receitas, Despesas e Saldo, cada um em previsto → real,
   com uma barra fina de real ÷ previsto.
3. **Quatro linhas de grupo** — ícone, nome, contagem, subtotal e chevron. Tocar leva a
   `/income` ou `/expenses`.
4. **Minhas contas** — carrossel horizontal de cartões, um por conta, na cor do banco.
5. **Atalhos** — três círculos: nova conta, nova pessoa, nova categoria.

O que sai da tela: o nome de cada receita e de cada despesa. Quem quer o lançamento toca na linha do
grupo e chega à tela que o possui.

## Previsto x real, e a exceção ao MAD-001

O `DashboardScreen` não somava nada: toda figura na tela era um campo que a API assinou. A API publica
`income.totalExpected`, `income.totalReceived`, `expenses.totalVariable`,
`expenses.totalRecurringExpected`, `expenses.totalRecurringPaid`, `expenses.totalCommitted` e
`balance` — e `balance` é `totalReceived - totalCommitted`, ou seja, **só existe saldo real**.

Não há total previsto de despesa nem saldo previsto na resposta, e o backend não será alterado. Logo,
entregar a comparação exige somar no cliente. A soma fica em um módulo único,
`src/utils/dashboard/projection.ts`, puro e testado:

| | previsto | real |
| --- | --- | --- |
| Receitas | `income.totalExpected` | `income.totalReceived` |
| Despesas | `totalVariable + totalRecurringExpected` | `totalVariable + totalRecurringPaid` |
| Saldo | receita prevista − despesa prevista | `balance` (da API, já assinado) |

Os subtotais das quatro linhas de grupo saem do mesmo módulo: as duas partições de receita não têm
total publicado (somam `receivedAmount` das linhas do `type` correspondente), enquanto despesa
variável usa `totalVariable` e despesa recorrente usa `totalRecurringPaid`.

O cabeçalho do módulo registra por que ele existe e o que fazer quando deixar de precisar existir: se
a API passar a publicar despesa prevista e saldo previsto, o módulo é deletado e a tela volta a
imprimir campo por campo. Concentrar a exceção em um arquivo é o que permite essa reversão ser uma
deleção em vez de uma caçada.

O saldo continua sendo renderizado com o próprio sinal, nunca em valor absoluto (spec DASH AC5).

A barra de real ÷ previsto só é desenhada quando o previsto é maior que zero. Um mês sem nada
previsto não tem proporção a mostrar, e uma divisão por zero desenharia uma barra que não significa
nada. Ela também não é desenhada na linha do saldo, onde os dois lados podem ser negativos e a razão
deixa de ter leitura.

## Cor por banco

`Account` carrega `institution` como texto livre; não há cor nem bandeira na API. A cor nasce então de
`colors.bank` no `theme.ts`, uma entrada por instituição conhecida, **cada uma com `fill` e `ink`
declarados juntos**. Declarar o par elimina cálculo de luminância em tempo de execução: o amarelo do
Banco do Brasil nasce com tinta escura e o roxo do Nubank com tinta clara, e a decisão de contraste é
lida no arquivo em vez de ser deduzida de uma função.

`src/utils/bank.ts` normaliza o nome — minúsculas, sem acento, sem os ruídos "banco", "s.a." e
"pagamentos" — e procura a chave. Sem correspondência, um hash determinístico do nome escolhe um par
de `colors.bankFallback`: o mesmo banco desconhecido recebe sempre a mesma cor, e três contas de três
bancos não mapeados continuam distinguíveis entre si.

O cartão é preenchido com `fill` e todo o seu texto usa `ink`. É a única superfície do app que não é
azul-marinho, e é deliberado: um cartão é reconhecido pela cor antes de ser lido.

## O cartão

Preenchido, `radius.lg`, largura fixa, num `ScrollView` horizontal com `snapToInterval`. Mostra:

- a instituição, no topo, com o ícone `CreditCard`;
- `•••• •••• •••• ••••` como marca d'água — **decoração, não dado**: a API não guarda número de
  cartão, e nenhum dígito real existe para vazar;
- o nome da conta;
- o nome do dono, cruzando `personId` com `usePeople()`;
- `fecha 05 · vence 12`, omitido quando a conta não é cartão de crédito (os dois campos são nulos).

O limite não aparece. É o dado mais sensível da conta e nada na tela inicial depende dele.

O dono depende de uma segunda query. Enquanto ela não voltou — ou se falhou — a linha do dono
simplesmente não é renderizada. Um cartão não vira estado de erro por causa de uma consulta que não é
a dele.

Sem nenhuma conta cadastrada, o carrossel mostra um único cartão tracejado com "Cadastrar conta",
apontando para `/accounts`.

## Navegação

O destino "Catálogo" deixa de existir. A gaveta fica com Resumo, Receitas e Despesas; o índice
`CatalogueScreen` e a pasta `app/(app)/catalogue/` são removidos.

As três telas passam para a raiz — `/people`, `/categories`, `/accounts` — cada uma como pasta com
`_layout.tsx` (Stack) e `index.tsx`, o mesmo arranjo de `income/` e `expenses/`. O Stack é o que dá a
barra superior com o botão voltar; um arquivo solto na raiz viraria uma tela de gaveta sem retorno.
Elas não aparecem no menu porque `AppDrawer` desenha apenas a constante `DESTINATIONS`.

As três telas continuam com formulário **e** lista. O que mudou foi a porta de entrada: os três
círculos do dashboard.

`useCatalogue.ts`, `types/catalogue.ts` e `utils/errors/catalogue.ts` mantêm o nome. "Catálogo"
continua sendo o nome do domínio; o que foi removido é a superfície de navegação.

## Padrões que continuam valendo

Nenhum hex fora do `theme.ts` — as cores de banco entram como família nova de tokens, não como
literais no componente. Todo espaçamento sai de `space`, todo raio de `radius`, toda tipografia de
`type`. Ícones só do `lucide-react-native`: `CreditCard`, `Landmark`, `UserPlus`, `Tags`, `Repeat`,
`Coins`, `CalendarClock`, `ShoppingBag`, `ChevronRight`.

## Arquivos

Nascem: `src/components/AccountCard.tsx`, `src/components/QuickActions.tsx`,
`src/utils/bank.ts`, `src/utils/dashboard/projection.ts`, os quatro testes correspondentes, e
`app/(app)/{people,categories,accounts}/{_layout,index}.tsx`.

Mudam: `src/components/theme.ts`, `src/screens/Dashboard/DashboardScreen.tsx` e `.styles.ts`,
`src/navigation/AppDrawer.tsx`, `src/navigation/AppNavigator.tsx` e os testes dos três.

Somem: `src/screens/Catalogue/` inteiro e `app/(app)/catalogue/` inteiro.
