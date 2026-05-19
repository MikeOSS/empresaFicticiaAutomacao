# AltaCLP — Deploy no Firebase (API de IA protegida)

A análise usa **Groq** (Llama) no servidor. A chave fica **somente na Cloud Function**. O site chama `/api/analyze` sem expor a key.

**Configurar Groq:** veja **[GROQ_SETUP.md](./GROQ_SETUP.md)** (conta, `GROQ_API_KEY`, deploy).

---

## Pré-requisitos

1. Conta Google
2. [Node.js 20 LTS](https://nodejs.org/) instalado
3. Plano **Blaze** no Firebase (pay-as-you-go) — obrigatório para Functions chamarem APIs externas (Gemini). O uso em demo costuma ficar no free tier do Gemini + mínimo do Firebase.

---

## Passo 1 — Instalar Firebase CLI

```bash
npm install -g firebase-tools
firebase login
```

---

## Passo 2 — Criar projeto no Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. **Adicionar projeto** (ex.: `altaclp-alerts`)
3. Anote o **Project ID**

Na pasta do projeto (`AltaCLP`):

```bash
cd c:\Users\migue\Desktop\AltaCLP
copy .firebaserc.example .firebaserc
```

Edite `.firebaserc` e troque `SEU_PROJECT_ID_AQUI` pelo ID real:

```json
{
  "projects": {
    "default": "altaclp-alerts"
  }
}
```

---

## Passo 3 — Ativar Blaze (faturamento)

1. Firebase Console → seu projeto → **Upgrade** (plano Blaze)
2. Vincule conta de faturamento Google Cloud
3. (Opcional) Configure **orçamento/alerta** no Google Cloud Billing

---

## Passo 4 — Configurar secret da API Gemini

Na pasta do projeto:

```bash
firebase functions:secrets:set GEMINI_API_KEY
```

Cole sua chave do [Google AI Studio](https://aistudio.google.com/apikey) quando solicitado.

---

## Passo 5 — Instalar dependências e fazer deploy

```bash
cd functions
npm install
cd ..
firebase deploy
```

Isso publica:

- **Hosting:** `public/index.html` (painel)
- **Function:** `analyzeAlert` em `/api/analyze`

Ao final, aparece uma URL tipo:

`https://altaclp-alerts.web.app`

Abra essa URL e teste **Analisar** em um alerta.

---

## Passo 6 — Testar localmente (opcional)

Com emuladores (não precisa deploy para testar UI + function):

```bash
cd functions
npm install
cd ..
firebase functions:secrets:access GEMINI_API_KEY
# Se o emulador pedir secret, use:
firebase emulators:start --only functions,hosting
```

Abra: `http://localhost:5000`

---

## Estrutura do projeto

```
AltaCLP/
├── public/
│   └── index.html          ← painel (sem API key no browser)
├── functions/
│   ├── index.js            ← proxy Gemini + validação
│   └── package.json
├── firebase.json           ← hosting + rewrite /api/analyze
├── .firebaserc             ← seu project id (não commitar se privado)
└── FIREBASE_SETUP.md       ← este arquivo
```

---

## Segurança implementada

| Item | Status |
|------|--------|
| API key só no servidor (Secret Manager) | Sim |
| Front não envia chave | Sim |
| Whitelist dos 8 IDs de incidente | Sim |
| Validação de campos do alerta | Sim |
| Prompt montado no servidor (cliente não injeta prompt) | Sim |

### Melhorias futuras (produção)

- Firebase **App Check** para bloquear chamadas fora do seu app
- **Rate limit** por IP/usuário na Function
- Autenticação (Firebase Auth) antes de analisar
- Restringir CORS ao seu domínio (`Access-Control-Allow-Origin`)

---

## Problemas comuns

### `missing permission on the build service account`

Primeiro deploy de Cloud Functions em projeto novo. Siga o guia:

**[FIX_DEPLOY_FUNCTIONS.md](./FIX_DEPLOY_FUNCTIONS.md)**

Resumo: conceda papéis IAM à conta `121533994509@cloudbuild.gserviceaccount.com` via Cloud Shell e rode `firebase deploy --only functions` de novo.

### `GEMINI_API_KEY` not found
Rode novamente: `firebase functions:secrets:set GEMINI_API_KEY` e `firebase deploy --only functions`

### `API key not valid`

A chave no secret está inválida ou restrita. Siga **[GEMINI_KEY_FIX.md](./GEMINI_KEY_FIX.md)**.

### Quota exceeded (Gemini)
Troque o modelo em `functions/index.js` (`GEMINI_MODEL`) ou aguarde reset da cota.

### Erro ao abrir HTML direto (file://)
Use a URL do Hosting (`web.app`) ou emulador (`localhost:5000`). O `/api/analyze` só funciona com Hosting + Function.

### Precisa de .firebaserc
Copie de `.firebaserc.example` e preencha o Project ID.

---

## Comandos úteis

```bash
firebase deploy --only hosting
firebase deploy --only functions
firebase functions:log
firebase open hosting:site
```
