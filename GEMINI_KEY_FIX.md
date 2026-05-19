# Corrigir: "API key not valid"

A chave do Gemini está no **Firebase Secret** (`GEMINI_API_KEY`), não no site. Esse erro significa que a chave salva está **inválida, revogada ou com restrição** que bloqueia o servidor.

---

## Passo 1 — Criar chave nova (Google AI Studio)

1. Abra: https://aistudio.google.com/apikey  
2. **Create API key** (pode vincular ao projeto Google Cloud `altaclp-de762`).  
3. Copie a chave inteira (começa com `AIza...`).  
4. **Não** cole em lugar público (GitHub, print).

### Restrições da chave (importante)

Se criar a chave no Google Cloud Console em vez do AI Studio:

- **Application restrictions:** deixe **None** (nenhuma) para uso no servidor.  
- Restrição por **site/HTTP referrer** impede a Cloud Function de usar a chave.  
- **API restrictions:** permita **Generative Language API**.

---

## Passo 2 — Atualizar o secret no Firebase

No PowerShell, na pasta do projeto:

```powershell
cd c:\Users\migue\Desktop\AltaCLP
firebase functions:secrets:set GEMINI_API_KEY
```

Cole a chave **nova** quando pedir (sem espaços no início/fim).

---

## Passo 3 — Publicar a function de novo

O secret só entra em vigor após novo deploy:

```powershell
firebase deploy --only functions
```

Aguarde `Successful update operation`.

---

## Passo 4 — Testar

1. Abra: https://altaclp-de762.web.app  
2. **Ctrl+F5**  
3. Clique em **Analisar** em um alerta.

---

## Ainda falha?

| Causa | O que fazer |
|-------|-------------|
| Chave antiga ainda em cache | Espere 1–2 min após deploy |
| Chave do projeto errado | Use AI Studio com a mesma conta do Firebase |
| API desabilitada | Cloud Console → APIs → ative **Generative Language API** |
| Cota zerada | Troque modelo em `functions/index.js` ou aguarde reset |

Ver logs:

```powershell
firebase functions:log
```
