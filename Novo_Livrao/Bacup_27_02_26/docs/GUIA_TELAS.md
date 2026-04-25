# 📖 Guia de Telas do Livrão da Família

Este documento serve como referência rápida para comunicação sobre as telas do aplicativo.
Para cada tela, mostramos o **nome técnico** (usado no código) e o **nome amigável** (como o usuário vê).

> 📸 **Os prints de tela estão na pasta:** `docs/screenshots/`

---

## 🔐 1. TELA DE LOGIN (`LoginForm`)

![Tela de Login](docs/screenshots/01_login.png)

**Nome técnico no código:** `LoginForm` (view = `'login'`)  
**Arquivo:** `src/features/Auth/LoginForm.jsx`  
**O que faz:** Permite ao usuário entrar no sistema com e-mail e senha.

**Elementos visíveis:**  
- Logo "LIVRÃO DA FAMÍLIA"
- Campo de E-mail
- Campo de Senha (com botão mostrar/ocultar)
- Botão "Entrar"
- Link "Ir para Minha Conta"

---

## 📝 2. TELA DE CADASTRO (`RegisterForm`)

**Nome técnico no código:** `RegisterForm` (view = `'register'`)  
**Arquivo:** `src/features/Auth/RegisterForm.jsx`  
**O que faz:** Permite que um novo usuário crie sua conta no sistema.

---

## 🎉 3. TELA DE BOAS-VINDAS (`WelcomeScreen`)

**Nome técnico no código:** `WelcomeScreen` (view = `'welcome'`)  
**Arquivo:** `src/features/Welcome/WelcomeScreen.jsx`  
**O que faz:** Exibida logo após o login. Dá as boas-vindas ao usuário antes de ir ao painel principal.

---

## 🏠 4. PAINEL PRINCIPAL / CONSOLE (`UserHub`)

![Console / Hub](docs/screenshots/02_console_hub.png)

**Nome técnico no código:** `UserHub` (view = `'hub'`)  
**Arquivo:** `src/features/Hub/UserHub.jsx`  
**O que faz:** É o menu central do app. O usuário escolhe para onde ir.

**Elementos visíveis:**  
- Nome do usuário (ex: "David Israel")
- Palavra "CONSOLE" abaixo do nome
- Card **"Árvore Familiar"** → abre a árvore genealógica
- Card **"Álbum Digital"** → abre seletor de fotos
- Card **"Receitas"** → abre o livro de receitas
- Botão **"Minha Conta (Configurações)"** → abre configurações
- Link **"Sair com segurança"** → faz logout

> 💡 **Dica de comunicação:** Quando quiser se referir a esta tela, diga:
> *"Na tela do Console"* ou *"No Painel Principal"* ou *"No Hub"*

---

## 🌳 5. ÁRVORE FAMILIAR (`FamilyTreeSelector`)

![Árvore Familiar](docs/screenshots/03_arvore_familiar.png)

**Nome técnico no código:** `FamilyTreeSelector` (view = `'form'`, passo 2)  
**Arquivo:** `src/components/FamilyTreeSelector.jsx`  
**O que faz:** Mostra a árvore genealógica da família com cards de cada membro. Permite selecionar um familiar para editar.

**Elementos visíveis:**  
- Barra de progresso "PROGRESSO TOTAL DA FAMÍLIA X%"
- Abas de navegação (Identidade, Família e vida, Trajetória, Memórias Vivas)
- Cards hierárquicos: Bisavós → Avós → Pais → Representante → Irmãos
- Barras de progresso em cada card (cor indica % preenchido)
- Botão "+ PARENTE" para adicionar membros extras
- Botão "SAIR" para voltar ao Console

> 💡 **Dica de comunicação:** Quando quiser se referir a esta tela, diga:
> *"Na Árvore Familiar"* ou *"Na tela da Árvore"*
> ❌ Evite: "repositório da árvore"

---

## 📋 6. FORMULÁRIO DE EDIÇÃO (`FormEngine`)

![Formulário de Edição](docs/screenshots/04_formulario_edicao.png)

**Nome técnico no código:** `FormEngine` (view = `'form'`, passo ≥ 3)  
**Arquivo:** `src/features/Form/FormEngine.jsx`  
**O que faz:** Formulário para preencher/editar os dados de um familiar. Tem várias seções organizadas em abas.

**Seções (abas):**
| Aba | Nome Técnico | O que contém |
|-----|-------------|-------------|
| **Identidade** | `Identity` | Nome, apelido, data de nascimento, local |
| **Família e Vida** | `FamilyVital` | Situação conjugal, filhos, dados vitais |
| **Trajetória** | `LifeCulture` | Educação, profissão, hobbies, prêmios |
| **Memórias Vivas** | `Narrative` | Histórias, relatos, resumo histórico |

**Elementos visíveis:**  
- Header mostrando "EDITANDO: [Nome], [Parentesco]"
- Barra de progresso do membro (ex: "IDENTIDADE 39%")
- Campos de formulário (texto, dropdown, etc.)
- Botões: VOLTAR, REFERÊNCIA, PRÓXIMO
- Botões no header: 🟧 Sair sem salvar, 🟥 Apagar, 🟦 Salvar

> 💡 **Dica de comunicação:** Quando quiser se referir a esta tela, diga:
> *"No formulário de edição"* ou *"Na ficha do [Nome do parente]"*
> Ex: *"No formulário do Pai"*

---

## 📸 7. GALERIA DE FOTOS (`PhotoGalleryModal`)

**Nome técnico no código:** `PhotoGalleryModal`  
**Arquivo:** `src/features/Gallery/PhotoGalleryModal.jsx`  
**O que faz:** Modal (janela flutuante) que permite ver e adicionar fotos de um familiar específico.

> 💡 **Dica de comunicação:** Diga:
> *"Na galeria de fotos"* ou *"No álbum do [Nome]"*

---

## 🍳 8. RECEITAS DA FAMÍLIA (`RecipesPage`)

![Receitas](docs/screenshots/05_receitas.png)

**Nome técnico no código:** `RecipesPage` (view = `'recipes'`)  
**Arquivo:** `src/features/Recipes/RecipesPage.jsx`  
**O que faz:** Página para preservar receitas tradicionais da família.

**Elementos visíveis:**  
- Header "Receitas de Família"
- Subtítulo "Sabores e memórias que atravessam gerações"
- Botão "Nova Receita"
- Cards de receitas (ex: "Gefilte Fish da Vovó")
- Tags de contexto (Shabat, Médio, etc.)

> 💡 **Dica de comunicação:** Diga:
> *"Na página de receitas"* ou *"No livro de receitas"*

---

## ⚙️ 9. MINHA CONTA (`AccountSettings`)

![Minha Conta](docs/screenshots/06_minha_conta.png)

**Nome técnico no código:** `AccountSettings` (view = `'account'`)  
**Arquivo:** `src/features/Account/AccountSettings.jsx`  
**O que faz:** Permite ao representante atualizar seus dados pessoais.

**Elementos visíveis:**  
- Foto do usuário (Selfie)
- Botão "Atualizar Selfie"
- Campo Telefone (WhatsApp)
- E-mail de login (somente leitura)
- Cidade Atual
- Profissão

> 💡 **Dica de comunicação:** Diga:
> *"Na tela de Minha Conta"* ou *"Nas configurações"*

---

## ✅ 10. TELA DE SUCESSO (`SuccessView`)

**Nome técnico no código:** view = `'success'` (componente inline no App.jsx)  
**O que faz:** Aparece após salvar dados com sucesso.

**Elementos visíveis:**  
- Ícone de check verde
- "Cadastro Salvo com Sucesso!"
- Botão "Incluir ou Editar Membro Familiar"
- Botão "Voltar ao Console"

> 💡 **Dica de comunicação:** Diga:
> *"Na tela de confirmação"* ou *"Na tela de sucesso"*

---

## 👋 11. TELA DE DESPEDIDA (`GoodbyeView`)

**Nome técnico no código:** view = `'goodbye'` (componente inline no App.jsx)  
**O que faz:** Aparece quando o usuário escolhe sair do app.

**Elementos visíveis:**  
- Emoji 👋
- "Até logo, [Nome]!"
- Botão "Voltar ao Início"

---

## 🗺️ MAPA DE NAVEGAÇÃO

```
LOGIN ──→ BOAS-VINDAS ──→ CONSOLE (HUB)
                              │
                    ┌─────────┼─────────┐──────────┐
                    │         │         │          │
                    ▼         ▼         ▼          ▼
              ÁRVORE     ÁLBUM    RECEITAS    MINHA CONTA
              FAMILIAR   DIGITAL
                 │
                 ▼
           FORMULÁRIO
           DE EDIÇÃO
                 │
                 ▼
              SUCESSO ──→ CONSOLE
```

---

## 📚 GLOSSÁRIO RÁPIDO

| Quando você quer dizer... | Use este termo |
|---------------------------|----------------|
| A tela onde faço login | **Tela de Login** |
| A tela principal com os cards | **Console** ou **Hub** |
| A tela com a árvore genealógica | **Árvore Familiar** |
| A tela onde preencho dados de um parente | **Formulário de Edição** |
| A tela de fotos | **Galeria de Fotos** |
| A tela de receitas | **Página de Receitas** |
| A tela onde mudo meus dados | **Minha Conta** |
| A janela flutuante que aparece sobre a tela | **Modal** |
| As abas no topo do formulário | **Barra de Navegação** (NavBar) |
| A barra que mostra % preenchido | **Barra de Progresso** |
| Cada retângulo com nome de parente na árvore | **Card** (cartão) |

---

*Documento gerado em 23/02/2026 — Livrão da Família v1.5 Beta*
