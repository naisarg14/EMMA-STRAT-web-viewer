# EMMA-STRAT Results Browser

Interactive web-based results explorer for the EMMA-STRAT manuscript, hosted on GitHub Pages.

**Live site:** https://naisarg14.github.io/EMMA-STRAT

## About EMMA-STRAT

EMMA-STRAT (**E**ndometrial cancer **M**ulti-omics **M**achine learning **A**rchitecture for **ST**RAT**ification**) is a supervised multi-omics machine learning framework for classifying UCEC (Uterine Corpus Endometrial Carcinoma) molecular subtypes and MSI status.

- **Training cohort:** TCGA UCEC (N = 433)
- **External validation:** CPTAC Set-2 (N = 95), CPTAC Set-3 (N = 108)
- **Omics layers:** mRNA expression, miRNA expression, DNA methylation
- **Classifiers benchmarked:** LightGBM, MLP, Random Forest, SVM, KNN, GNN
- **Feature selection methods:** ANOVA, LASSO, RF, SVM (10–200 features)
- **Total models optimised and trained:** 1,152

### Top results

| Task | Best model | Internal balanced acc. | External balanced acc. |
|---|---|---|---|
| MSI classification | LightGBM | 0.981 | 0.931–0.949 |
| Genomic subtyping | MLP | 0.891 | 0.847–0.862 |

## Pages

| Page | File | Description |
|---|---|---|
| Home | `index.html` | Landing page with study overview and key statistics |
| Model Results | `results.html` | Filterable table of balanced accuracy, F1, and AUC for all model × feature-selection combinations across internal and external sets; click any row to see performance charts and confusion matrices |
| Selected Features | `features.html` | Browse the top-N features selected for each task, FS method, and omics layer |
| SHAP Analysis | `shap.html` | Per-class SHAP feature importance for the best MSI (LightGBM) and genomic subtype (MLP) models |
| Flexynesis Comparison | `flexynesis.html` | Head-to-head comparison of EMMA-STRAT against three Flexynesis multi-omics integration strategies |

## Repository structure

```
├── index.html              # Landing / home page
├── results.html            # Model performance explorer
├── features.html           # Selected features viewer
├── shap.html               # SHAP importance viewer
├── flexynesis.html         # Flexynesis benchmarking
├── shared.css              # Shared styles (navy/teal theme)
├── shared.js               # Shared utilities (chart rendering, Tabulator helpers)
└── data/
    ├── results_viewer_data.json        # All model results (metrics, CIs, confusion matrices)
    ├── flexynesis.json                 # Flexynesis comparison data
    ├── shap_msi.csv                    # SHAP values — MSI task
    ├── shap_ic.csv                     # SHAP values — genomic subtype task
    └── selected_features/
        └── {METHOD}_{task}/
            └── selected_{omics}_{METHOD}_{N}.txt   # Feature lists
```

## Running locally

This is a fully static site — no build step or server-side code required.

```bash
# Any static file server works, e.g.:
python -m http.server 8000
# then open http://localhost:8000
```

Opening `index.html` directly as a `file://` URL will cause the JSON/CSV data fetches to fail due to browser CORS restrictions. Use a local server instead.

