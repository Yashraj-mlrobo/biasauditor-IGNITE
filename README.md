<p align="center">
  <img src="assets/logo.png" alt="Team IGNITE" width="120"/>
</p>

<h1 align="center">IGNITE — Bias Auditor Dashboard</h1>
<p align="center">
  <b>Google Solution Challenge 2026</b> · Amity University Mumbai · Team IGNITE
</p>
<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10+-blue?style=flat-square"/>
  <img src="https://img.shields.io/badge/Streamlit-1.35-red?style=flat-square"/>
  <img src="https://img.shields.io/badge/Gemini-API-orange?style=flat-square"/>
  <img src="https://img.shields.io/badge/AIF360-0.6.1-purple?style=flat-square"/>
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square"/>
</p>

---

## What is this?

**IGNITE Bias Auditor** is an AI-powered dashboard that helps organizations detect, explain, and fix bias in their machine learning models — before those models impact real people.

Upload your dataset and model. Get a full bias audit in seconds.

---

## Features

- Upload any CSV dataset + trained model
- Auto-detect bias across protected attributes (gender, race, age)
- Compute fairness metrics — demographic parity, equal opportunity, disparate impact
- SHAP-powered explainability — understand *why* your model is biased
- Gemini AI plain-language report — no statistics jargon
- Before/after comparison after bias mitigation
- Downloadable PDF audit report
- Deployed on Google Cloud Run

---

## Tech Stack

| Layer | Tool |
|---|---|
| Bias Detection | IBM AIF360, Microsoft Fairlearn |
| Explainability | SHAP |
| AI Reports | Google Gemini API |
| Dashboard | Streamlit |
| Visualization | Plotly |
| PDF Export | ReportLab |
| Hosting | Google Cloud Run |

---

## Getting Started

### 1. Clone the repo
```bash
git clone https://github.com/your-username/ignite-bias-auditor.git
cd ignite-bias-auditor
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Set up environment variables
```bash
cp .env.example .env
# Add your Gemini API key inside .env
```

### 4. Run the app
```bash
streamlit run app/main.py
```

---

## Project Structure

```
ignite-bias-auditor/
├── app/
│   ├── main.py          # Streamlit entry point
│   ├── upload.py        # Dataset & model upload handler
│   ├── audit.py         # AIF360 + Fairlearn bias engine
│   ├── explain.py       # SHAP explainability layer
│   ├── gemini.py        # Gemini AI report generator
│   ├── report.py        # PDF export
│   └── charts.py        # Plotly visualizations
├── models/
│   └── train.py         # Sample model trainer
├── data/                # Sample datasets
├── assets/              # Logo, CSS
├── tests/               # Unit tests
├── .env.example
├── .gitignore
├── requirements.txt
├── Dockerfile
└── README.md
```

---

## Team

**Team IGNITE** — B.Tech Computer Science, 2nd Year  
Amity University Mumbai · Google Solution Challenge 2026

> *"We don't just solve problems — we ignite movements."*

