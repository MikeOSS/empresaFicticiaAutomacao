/**
 * Popula a coleção "alertas" no Firestore com dados técnicos industriais.
 *
 * COMO RODAR:
 * 1. Firebase Console → Configurações do projeto → Contas de serviço
 *    → Gerar nova chave privada → salvar como:
 *    C:\Users\migue\Desktop\AltaCLP\service-account.json
 *
 * 2. PowerShell (da pasta raiz do projeto):
 *    $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\Users\migue\Desktop\AltaCLP\service-account.json"
 *    cd functions
 *    node ..\populate-firestore.js
 */

const admin = require("firebase-admin");

admin.initializeApp({ projectId: "altaclp-de762" });
const db = admin.firestore();

const alertas = [
  {
    id: "INC-2026-089",
    maquina: "M-NP-442",
    cliente: "NovaPapel Embalagens",
    sensor: "vibracao",
    leitura_atual: 12.4,
    unidade: "mm/s",
    limite_maximo: 7.0,
    limite_minimo: 0.0,
    timestamp: "2026-05-19T09:14:00",
    status: "pendente",
    resultado: null,
    historico: []
  },
  {
    id: "INC-2026-068",
    maquina: "M-VH-118",
    cliente: "Vinhal Bebidas",
    sensor: "pressao",
    leitura_atual: 8.7,
    unidade: "bar",
    limite_maximo: 8.5,
    limite_minimo: 2.0,
    timestamp: "2026-05-15T14:32:07",
    status: "pendente",
    resultado: null,
    historico: [
      { data: "2026-04-03", leitura: 8.7, tecnico_despachado: true, falha_encontrada: false },
      { data: "2026-03-11", leitura: 8.9, tecnico_despachado: true, falha_encontrada: false },
      { data: "2026-02-19", leitura: 8.8, tecnico_despachado: true, falha_encontrada: false }
    ]
  },
  {
    id: "INC-2026-064",
    maquina: "M-BL-307",
    cliente: "Belmare Cosméticos",
    sensor: "temperatura",
    leitura_atual: 94.2,
    unidade: "°C",
    limite_maximo: 90.0,
    limite_minimo: 60.0,
    timestamp: "2026-05-13T11:04:00",
    status: "pendente",
    resultado: null,
    historico: [
      { data: "2026-05-11", leitura: 93.1, tecnico_despachado: false, falha_encontrada: false },
      { data: "2026-05-09", leitura: 92.8, tecnico_despachado: false, falha_encontrada: false },
      { data: "2026-01-23", leitura: 97.4, tecnico_despachado: true, falha_encontrada: true, observacao: "falha real — hotfix aplicado" }
    ]
  },
  {
    id: "INC-2026-061",
    maquina: "M-MD-201",
    cliente: "Mendegassi Química",
    sensor: "temperatura",
    leitura_atual: 88.3,
    unidade: "°C",
    limite_maximo: 85.0,
    limite_minimo: 55.0,
    timestamp: "2026-05-12T16:47:00",
    status: "pendente",
    resultado: null,
    historico: [
      { data: "2026-05-08", leitura: 87.1, tecnico_despachado: true, falha_encontrada: false },
      { data: "2026-04-21", leitura: 86.5, tecnico_despachado: true, falha_encontrada: false }
    ]
  },
  {
    id: "INC-2026-056",
    maquina: "M-MD-201",
    cliente: "Mendegassi Química",
    sensor: "temperatura",
    leitura_atual: 87.1,
    unidade: "°C",
    limite_maximo: 85.0,
    limite_minimo: 55.0,
    timestamp: "2026-05-08T14:10:00",
    status: "pendente",
    resultado: null,
    historico: [
      { data: "2026-04-21", leitura: 86.5, tecnico_despachado: true, falha_encontrada: false }
    ]
  },
  {
    id: "INC-2026-053",
    maquina: "M-SR-409",
    cliente: "Sorocaba Industrial",
    sensor: "valvula_atuador",
    leitura_atual: 0,
    unidade: "estado",
    limite_maximo: null,
    limite_minimo: null,
    timestamp: "2026-05-02T10:55:00",
    status: "pendente",
    resultado: null,
    historico: [
      { data: "2026-04-27", leitura: 0, tecnico_despachado: true, falha_encontrada: false },
      { data: "2026-04-12", leitura: 0, tecnico_despachado: true, falha_encontrada: false },
      { data: "2026-03-28", leitura: 0, tecnico_despachado: true, falha_encontrada: false },
      { data: "2026-03-10", leitura: 0, tecnico_despachado: true, falha_encontrada: false },
      { data: "2026-02-22", leitura: 0, tecnico_despachado: true, falha_encontrada: false }
    ]
  },
  {
    id: "INC-2026-051",
    maquina: "M-SR-409",
    cliente: "Sorocaba Industrial",
    sensor: "valvula_atuador",
    leitura_atual: 0,
    unidade: "estado",
    limite_maximo: null,
    limite_minimo: null,
    timestamp: "2026-04-27T09:30:00",
    status: "pendente",
    resultado: null,
    historico: [
      { data: "2026-04-12", leitura: 0, tecnico_despachado: true, falha_encontrada: false },
      { data: "2026-03-28", leitura: 0, tecnico_despachado: true, falha_encontrada: false }
    ]
  },
  {
    id: "INC-2026-031",
    maquina: "M-VH-118",
    cliente: "Vinhal Bebidas",
    sensor: "pressao",
    leitura_atual: 8.7,
    unidade: "bar",
    limite_maximo: 8.5,
    limite_minimo: 2.0,
    timestamp: "2026-04-03T10:55:00",
    status: "pendente",
    resultado: null,
    historico: [
      { data: "2026-03-11", leitura: 8.9, tecnico_despachado: true, falha_encontrada: false },
      { data: "2026-02-19", leitura: 8.8, tecnico_despachado: true, falha_encontrada: false }
    ]
  },
  {
    id: "INC-2026-011",
    maquina: "M-TM-051",
    cliente: "Termocelular Plásticos",
    sensor: "temperatura",
    leitura_atual: 87.0,
    unidade: "°C",
    limite_maximo: 82.0,
    limite_minimo: 60.0,
    timestamp: "2026-02-14T09:30:00",
    status: "pendente",
    resultado: null,
    historico: [
      { data: "2026-01-18", leitura: 84.2, tecnico_despachado: true, falha_encontrada: false },
      { data: "2025-12-30", leitura: 83.8, tecnico_despachado: true, falha_encontrada: false },
      { data: "2025-12-01", leitura: 85.1, tecnico_despachado: true, falha_encontrada: false }
    ]
  }
];

async function populate() {
  const batch = db.batch();

  for (const alerta of alertas) {
    const ref = db.collection("alertas").doc(alerta.id);
    batch.set(ref, alerta);
  }

  await batch.commit();
  console.log(`✓ ${alertas.length} alertas gravados na coleção "alertas".`);
  process.exit(0);
}

populate().catch(err => {
  console.error("Erro ao popular Firestore:", err.message);
  process.exit(1);
});
