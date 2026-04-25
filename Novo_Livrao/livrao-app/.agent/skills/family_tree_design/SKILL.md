---
name: Family Tree Design Preservation
description: Instruções e constantes críticas para manter a integridade visual da Árvore Genealógica (FamilyTreeSelector).
---

# Preservação do Design da Árvore Genealógica

Esta "Skill" define as regras de ouro para a manutenção do componente `FamilyTreeSelector.jsx`. **Qualquer alteração nestes valores pode quebrar as conexões SVG e a diagramação hierárquica.**

## 1. Constantes da Grade (Grid)
As posições são calculadas em uma grade matemática fixa:
- **GRID_COLS**: 34
- **GRID_ROWS**: 65
- **SCALE_FACTOR**: 1.3 (Fator de escala para renderização visual)

- **Altura Fixa (h)**: `3.90` (Imutável para garantir integridade das conexões SVG)

- **GRANDE (Representante)**: `10.00`
- **MÉDIO (Pais)**: `10.00`
- **MINI (Avós, Cônjuges, Filhos, etc.)**: `5.84`
  - *Comportamento de Expansão*: Ao ser selecionado, o Card Mini expande **40% na largura** para facilitar a leitura do nome, mantendo a altura original.

## 3. Espaçamentos e Afastamentos (Gaps)
- **Passo Vertical (V_STEP)**: `5.5`
  - Define a distância do topo de um card ao topo do próximo na coluna lateral (Cônjuges/Filhos/Outros).
- **Gap Vertical Efetivo**: `1.6` unidades de grade (`5.5 - 3.9`).
- **Passo Horizontal**: Definido pelas coordenadas `x` fixas (ex: `1.68`, `9.54`, `17.98`, `25.99`).

## 4. Regras de Linhas e Conexões
- **SVG Stroke Width**: `0.15`
- **Conexão em "L"**: Casamentos secundários (2º em diante) devem obrigatoriamente usar ramificações em "L" a partir do tronco central (`STEM_X`), nunca linhas retas sobrepostas.
- **Stroke Color**: `#cbd5e1` (Slate 300)

## 5. Áreas de Proteção
- **Coluna da Direita**: Inicia em `x: 25.0`.
- **Coluna da Esquerda (Outros Parentes)**: 
  - Col 1: `x: 1.68`
  - Col 2: `x: 9.54`
  - *Distribuição*: O botão `[+]` ocupa a Col 1 (Linha 0). Novos parentes são intercalados entre as duas colunas a partir da Linha 1.
- **Eixo Central (Eu mesmo)**: `y: 24.5`.

> [!IMPORTANT]
> Se precisar adicionar novos membros, use o `V_STEP` de 5.5 para calcular as novas coordenadas `y`. Nunca altere o `CARD_H` de 3.90.
