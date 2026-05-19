# AltaCLP — Trocar Gemini por Groq

A análise de alertas usa **Groq** (modelo `llama-3.1-8b-instant`) na Cloud Function. A chave fica no Firebase Secret Manager, não no site.

---

## O que você precisa fazer (só você consegue)

### 1. Criar conta e chave na Groq

1. Acesse [https://console.groq.com](https://console.groq.com)
2. Crie conta (grátis, sem cartão na maioria dos casos)
3. Menu **API Keys** → **Create API Key**
4. Copie a chave (começa com `gsk_...`) — ela só aparece uma vez

### 2. Salvar a chave no Firebase (Secret)

No PowerShell, na pasta do projeto:

```powershell
cd C:\Users\migue\Desktop\AltaCLP
firebase functions:secrets:set GROQ_API_KEY
```

Cole a chave `gsk_...` quando pedir e confirme.

### 3. Publicar a Cloud Function

```powershell
firebase deploy --only functions
```

Espere `Deploy complete!`

### 4. Testar no site

1. Abra https://altaclp-de762.web.app
2. Clique **Analisar** em um alerta pendente
3. Deve aparecer veredito à direita e o status no card

---

## O que já foi feito no código

| Arquivo | Mudança |
|---------|---------|
| `functions/index.js` | Chama API Groq em vez de Gemini |
| Modelo | `llama-3.1-8b-instant` (bom free tier) |
| Secret | `GROQ_API_KEY` (substitui `GEMINI_API_KEY`) |

O front-end **não muda** — continua chamando `/api/analyze`.

---

## Problemas comuns

### `GROQ_API_KEY inválida ou vazia`
Rode o passo 2 de novo e depois `firebase deploy --only functions`.

### `401` / `invalid api key`
Chave errada ou copiada incompleta. Gere outra em console.groq.com.

### `429` / rate limit
Espere 1 minuto e tente de novo. Evite **Analisar todos** na demo.

### A function ainda pede GEMINI_API_KEY no deploy
Você está com código antigo. Faça `git pull` ou confira se `functions/index.js` usa `GROQ_API_KEY`.

---

## Gemini antigo

O secret `GEMINI_API_KEY` pode continuar no Google Cloud, mas **não é mais usado**. Pode apagar depois no Console se quiser limpar.

---

## Trocar modelo Groq (opcional)

Em `functions/index.js`, linha `GROQ_MODEL`:

- `llama-3.1-8b-instant` — mais requisições/dia (recomendado demo)
- `llama-3.3-70b-versatile` — respostas melhores, limite diário menor

Depois: `firebase deploy --only functions`
