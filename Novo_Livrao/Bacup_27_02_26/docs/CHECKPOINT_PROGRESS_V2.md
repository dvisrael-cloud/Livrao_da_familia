# Checkpoint de Desenvolvimento - Livrão da Família (V2)
**Data:** 30/12/2025
**Status:** ESTÁVEL - UI & Lógica de Progresso Implementadas

## 1. Correções Críticas
- **Autenticação:** Corrigido erro `auth/invalid-credential` no login. Mensagens de erro amigáveis implementadas.
- **Estado do Formulário:** Implementado `formKey` para reset forçado do `FormEngine` ao Sair/Salvar/Apagar, prevenindo vazamento de dados entre os parentes (o ícone "+" volta corretamente).

## 2. Interface de Usuário (Header)
- **Botões:**
  - **SAIR (Porta):** Estilo Clean (Ghost/Branco). Ação: Descarta alterações e volta à árvore.
  - **APAGAR (Lixeira):** Estilo Vermelho. Ação: Apaga registro do banco e via API.
  - **SALVAR (Disquete):** Estilo Clean. Ação: Salva progresso.
- **Tipografia:**
  - Label "EDITANDO: **Nome Bold**, Papel Normal de Representante".
  - Design limpo, sem cores de fundo distrativas.

## 3. Lógica de Progresso (Complexa)
O sistema de progresso foi totalmente reescrito para ser determinístico e justo.

### A. Whitelist de Campos (26 Itens)
Apenas os seguintes campos contam para o progresso ("Vidal's List"):
1. Nome Completo
2. Sobrenomes de Solteiro(a)
3. Religião
4. Apelido
5. Nome do Pai
6. Nome da Mãe
7. Data de Nascimento
8. País de Nascimento
9. Cidade de Nascimento
10. Situação Conjugal
11. Situação Vital (Ignora "Vivo" default)
12. Teve filhos?
13. Grau de Instrução
14. Escolas e Universidades
15. Ocupação Principal
16. Locais de Trabalho
17. Realizações e Prêmios
18. Cidades Onde Morou
19. Locais que Conheceu
20. Amizades Marcantes
21. Atuação Comunitária
22. Sinagoga que Frequentava
23. Professor de Hebraico
24. Hobbies
25. Resumo Histórico
26. Relatos Adicionais

### B. Pesos Ponderados (Weighted Score)
Cada campo tem um peso específico na nota final (Soma = 100%):
- **História (35%):** Resumo Histórico (21%) + Relatos (14%).
- **Filiação (11%):** Pai (5.5%) + Mãe (5.5%).
- **Geografia (4%):** Cidades Onde Morou.
- **Dados Pessoais (3% cada):** Nome, Sobrenomes, Apelido, Nascimento, Local (País/Cidade), Atuação, Professor, Prêmios.
- **Vida (2.5% cada):** Conjugal, Filhos, Instrução, Escolas, Hobbies.
- **Geral (1.5% cada):** Religião, Vital, Ocupação, Trabalho, Viagens, Amizades, Sinagoga.

### C. Progresso Global da Família
- Na tela da Árvore, a barra exibe a **Média Aritmética** do progresso dos 15 papéis fixos da família.
- Cálculo: `(Soma dos Progressos Individuais) / 15`.

## 4. Próximos Passos Sugeridos
- Validação final de responsividade.
- Teste de upload de fotos (já configurado para ignorar no progresso).
