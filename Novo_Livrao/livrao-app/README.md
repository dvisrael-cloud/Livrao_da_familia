# 📖 Livrão da Família — App do Usuário

Aplicativo web para preservação da memória genealógica e cultural de famílias.

## 🚀 Como rodar

```bash
npm install
npm run dev
```

O app estará em **http://localhost:3002**

## 📂 Estrutura do Projeto

```
livrao-app/
├── public/                  # Assets estáticos (logo, vídeo)
├── src/
│   ├── App.jsx              # Componente raiz e roteamento
│   ├── main.jsx             # Entry point
│   ├── index.css            # Design tokens (cores, fontes)
│   ├── components/          # Componentes reutilizáveis
│   │   ├── common/UI.jsx    #   Button, Input
│   │   ├── FamilyTreeSelector.jsx  # Árvore genealógica
│   │   ├── LocationSelector.jsx    # Seletor de localização
│   │   └── FormSection.jsx
│   ├── features/            # Módulos por funcionalidade
│   │   ├── Auth/            #   Login + Cadastro
│   │   ├── Hub/             #   Console principal (UserHub)
│   │   ├── Form/            #   Formulário dinâmico (FormEngine)
│   │   ├── Gallery/         #   Galeria de fotos (PhotoGalleryModal)
│   │   ├── Recipes/         #   Receitas da família
│   │   ├── Account/         #   Configurações da conta
│   │   ├── Welcome/         #   Tela de boas-vindas
│   │   └── Upload/          #   Widget de upload
│   ├── layouts/             # Layout principal (MainLayout)
│   ├── services/            # Firebase, API, autenticação
│   ├── constants/           # formConfig, initial_state
│   └── utils/               # Utilitários
├── docs/                    # Documentação
│   ├── anatomia_telas.html  #   Anatomia visual de cada tela
│   ├── guia_telas.html      #   Guia de telas com prints
│   └── screenshots/         #   Prints de cada tela
├── firebase.json            # Config Firebase Hosting
├── storage.rules            # Rules do Firebase Storage
└── package.json
```

## 🛠️ Stack Tecnológica

- **React 18** + **Vite**
- **Tailwind CSS v4**
- **Firebase** (Auth, Firestore, Storage, Hosting)
- **Framer Motion** (animações)
- **Lucide React** (ícones)

## 📚 Documentação

- `docs/anatomia_telas.html` — Mapeamento detalhado de cada elemento visual
- `docs/guia_telas.html` — Guia visual com prints e nomes técnicos
- `docs/GUIA_TELAS.md` — Versão markdown do guia

---

**Desenvolvido por HOD** (CNPJ: 11.702.142/0001-70)  
Parceria: Comissão Livrão da Família  
© 2025 HOD. Todos os direitos reservados.
