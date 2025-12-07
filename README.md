# 🤖 SEO Multi-Agent System

Sistema Multi-Agente AI per Ottimizzazione SEO E-commerce.

## 🎯 Cosa Fa

Un sistema di agenti AI specializzati che lavorano insieme per ottimizzare i contenuti SEO del tuo e-commerce:

| Agente | Funzione |
|--------|----------|
| 🔭 **Discovery Agent** | Scopre competitor, analizza SERP, mappa terminologia di mercato |
| 📚 **SEO Researcher** | Studia best practices SEO da fonti autorevoli |
| 🔍 **Competitor Analyst** | Analizza come i competitor strutturano i contenuti |
| 🔧 **Technical Auditor** | Identifica problemi SEO tecnici (usa dati GSC) |
| 🎯 **Strategy Planner** | Crea piano d'azione prioritizzato |
| ✍️ **Content Writer** | Riscrive i contenuti secondo il piano |

Plus: **GSC Navigator** - un agente conversazionale che ti guida nell'estrazione dati da Google Search Console.

---

## 🚀 Setup Rapido (5 minuti)

### Prerequisiti

- Account [GitHub](https://github.com)
- Account [Vercel](https://vercel.com) (gratis)
- API Key [Anthropic](https://console.anthropic.com/) (~€3-5 per progetto completo)

### Step 1: Fork/Clone Repository

```bash
# Clona il repository
git clone https://github.com/YOUR_USERNAME/seo-multiagent-system.git
cd seo-multiagent-system

# Oppure crea un nuovo repo e copia i file
```

### Step 2: Ottieni API Key Anthropic

1. Vai su [console.anthropic.com](https://console.anthropic.com/)
2. Crea un account o accedi
3. Vai su **API Keys** → **Create Key**
4. Copia la key (inizia con `sk-ant-...`)

### Step 3: Deploy su Vercel

#### Opzione A: Deploy con un click

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/seo-multiagent-system)

#### Opzione B: Deploy manuale

1. Vai su [vercel.com/new](https://vercel.com/new)
2. Clicca **Import Git Repository**
3. Seleziona il tuo repository
4. **IMPORTANTE**: Aggiungi Environment Variable:
   - Name: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-api03-...` (la tua key)
5. Clicca **Deploy**

### Step 4: Configura Environment Variables

In Vercel Dashboard → Settings → Environment Variables, aggiungi:

| Variable | Value | Required |
|----------|-------|----------|
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...` | ✅ Sì |
| `DEFAULT_DOMAIN` | `racoon-lab.it` | No |
| `DEFAULT_NICHE` | `scarpe personalizzate` | No |
| `DEFAULT_BRAND` | `Racoon Lab` | No |

---

## 💻 Sviluppo Locale

```bash
# Installa dipendenze
npm install

# Crea file env locale
cp .env.example .env.local
# Modifica .env.local con la tua API key

# Avvia server di sviluppo
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000)

---

## 📖 Come Usarlo

### 1. Analisi GSC (Opzionale ma consigliato)

1. Vai su **GSC Navigator**
2. Segui le istruzioni per estrarre dati da Google Search Console
3. Incolla i dati quando richiesto
4. L'agente analizza e identifica opportunità

### 2. Carica Prodotti

1. Esporta i prodotti da Shopify (Products → Export)
2. Clicca **Carica CSV Prodotti**
3. Seleziona il file CSV

### 3. Avvia Workflow

1. Configura dominio/nicchia se necessario
2. Clicca **Avvia Workflow Completo**
3. Osserva gli agenti lavorare in sequenza
4. Scarica i risultati quando completato

---

## 💰 Costi Stimati

| Operazione | Token Stimati | Costo |
|------------|---------------|-------|
| Workflow completo (6 agenti) | ~150k | ~€0.50 |
| + Riscrittura 50 prodotti | +200k | +€0.70 |
| + Riscrittura 200 prodotti | +600k | +€2.00 |
| **Progetto completo** | ~1M | **~€3-5** |

Hosting Vercel Hobby: **€0**

---

## 🔧 Personalizzazione

### Modificare System Prompt degli Agenti

Edita `lib/agents.js`:

```javascript
export const AGENTS = {
  discovery: {
    systemPrompt: `Il tuo nuovo prompt qui...`
  }
  // ...
};
```

### Aggiungere Nuovi Agenti

1. Definisci l'agente in `lib/agents.js`
2. Aggiungilo al `WORKFLOW` array
3. Il sistema lo integrerà automaticamente

### Cambiare Modello AI

In `.env.local` o Vercel Environment Variables:

```
ANTHROPIC_MODEL=claude-sonnet-4-20250514  # Default, bilanciato
# oppure
ANTHROPIC_MODEL=claude-opus-4-20250514    # Più potente, più costoso
```

---

## 🐛 Troubleshooting

### "API Key non valida"
- Verifica che la key inizi con `sk-ant-`
- Controlla che sia configurata in Vercel Environment Variables
- Rideploy dopo aver aggiunto la variabile

### "Timeout durante esecuzione"
- Gli agenti con web search possono richiedere fino a 60 secondi
- Se persiste, prova a eseguire singoli agenti

### "Errore parsing CSV"
- Assicurati che il CSV sia esportato da Shopify correttamente
- Il delimitatore deve essere virgola (,)
- La prima riga deve contenere gli header

### "GSC data non parsato"
- Esporta da GSC come TSV (tab-separated)
- Includi sempre la riga header
- Copia TUTTE le righe, non solo alcune

---

## 📁 Struttura Progetto

```
seo-multiagent/
├── app/
│   ├── api/
│   │   ├── agent/route.js      # API proxy per Anthropic
│   │   └── analyze-gsc/route.js # Analisi dati GSC
│   ├── globals.css
│   ├── layout.jsx
│   └── page.jsx                 # Main page
├── components/
│   ├── MultiAgentSystem.jsx     # Sistema multi-agente
│   └── GSCNavigator.jsx         # Navigatore GSC
├── lib/
│   ├── agents.js                # Definizioni agenti
│   └── gsc-analyzer.js          # Funzioni analisi GSC
├── public/
├── .env.example
├── package.json
├── vercel.json
└── README.md
```

---

## 🔐 Sicurezza

- L'API key Anthropic non è mai esposta al client
- Tutte le chiamate passano attraverso API routes server-side
- I dati GSC/prodotti restano nel browser (non vengono salvati)

---

## 📄 License

MIT - Usa liberamente per i tuoi progetti.

---

## 🆘 Supporto

Hai problemi? Apri una Issue su GitHub o contatta lo sviluppatore.

---

Built with ❤️ for Racoon Lab
