# Corrigir erro de deploy das Functions

## Erro que você viu

```
Build failed ... missing permission on the build service account
```

Isso é **permissão IAM no Google Cloud**, não bug do seu código. Comum em projetos Firebase novos na primeira vez que deploya Cloud Functions (2ª geração).

**Seu projeto:** `altaclp-de762`  
**Número do projeto:** `121533994509`

---

## Opção A — Google Cloud Shell (mais fácil, sem instalar nada)

1. Abra: https://console.cloud.google.com/?project=altaclp-de762  
2. Clique no ícone **>_** (Cloud Shell) no canto superior direito.  
3. Cole e execute **tudo de uma vez**:

```bash
PROJECT_ID="altaclp-de762"
PROJECT_NUMBER="121533994509"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.builder"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/storage.objectViewer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/logging.logWriter"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.builder"
```

4. Aguarde cada comando retornar `Updated IAM policy`.  
5. No seu PC, rode de novo:

```powershell
cd c:\Users\migue\Desktop\AltaCLP
firebase deploy --only functions
```

---

## Opção B — Pela interface (IAM)

1. Abra: https://console.cloud.google.com/iam-admin/iam?project=altaclp-de762  
2. Clique em **Conceder acesso** (Grant access).  
3. **Novos principais:**  
   `121533994509@cloudbuild.gserviceaccount.com`  
4. **Papel (roles)** — adicione um por um:
   - Cloud Build → **Cloud Build Service Account** (ou *Cloud Build Builds Builder*)
   - Artifact Registry → **Artifact Registry Writer**
   - Cloud Storage → **Storage Object Viewer**
   - Logging → **Logs Writer**  
5. Salvar.  
6. Repita para:  
   `121533994509-compute@developer.gserviceaccount.com`  
   com o papel **Cloud Build Builds Builder**.  
7. Rode no terminal:

```powershell
firebase deploy --only functions
```

---

## Depois que funcionar

Teste o site (Hosting já pode estar no ar):

https://altaclp-de762.web.app

Clique em **Analisar** em um alerta. Se der 404 em `/api/analyze`, a function ainda não subiu — confira o deploy.

Deploy completo (hosting + functions):

```powershell
firebase deploy
```

---

## Se ainda falhar

1. Veja o log do build (link que apareceu no terminal).  
2. Confirme plano **Blaze** ativo no Firebase.  
3. Aguarde 2–3 minutos após mudar IAM e tente de novo.  
4. Documentação Google: https://cloud.google.com/functions/docs/troubleshooting#build-service-account
