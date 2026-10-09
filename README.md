# Indoor Air Quality Analysis — Andhra Pradesh
### Academic Data Analysis and Visualization Lab Project

> **Academic Dataset Notice**  
> The dataset used in this project is synthetically generated for educational purposes. It simulates indoor environmental observations across selected locations in Andhra Pradesh. The dataset does not represent direct sensor measurements and should not be interpreted as actual air-quality measurements for these cities.

---

## 1. Project Overview
The **Indoor Air Quality (IAQ) Data Analysis & Visualization Platform** is an end-to-end full-stack application and data science workflow developed for the semester-end **Data Analysis and Visualization Lab** project.

The system simulates, preserves, cleans, wrangles, analyzes, and visualizes indoor air quality metrics across major urban environments in Andhra Pradesh (*Visakhapatnam, Vijayawada, Guntur, Tirupati, Kakinada, Nellore, Rajahmundry*).

---

## 2. Core Architecture Pipeline
```text
RAW DATA (indoor_air_quality_raw.csv)
     ↓
RAW DATA PRESERVATION (Immutable storage)
     ↓
DATA PROFILING & IMPERFECTION DETECTION
     ↓
DATA CLEANING (Duplicates removal, Column standardization)
     ↓
DATA PREPROCESSING (Missing value imputation, String numeric parsing)
     ↓
DATA WRANGLING & ANOMALY TREATMENT (Physical sensor bounds, Capping)
     ↓
FEATURE ENGINEERING (IAQ Index, IAQ Category, PM Ratio, Ventilation Score)
     ↓
PROCESSED DATA (indoor_air_quality_processed.csv)
     ↓
STATISTICAL & EXPLORATORY ANALYSIS (Jupyter Notebook & Web API)
     ↓
INTERACTIVE VISUALIZATION STUDIO (Chart.js + Smart Recommendations)
     ↓
AUTOMATED DOMAIN INSIGHTS
```

---

## 3. Technology Stack
- **Data Science & Analytics**: Python 3.11, pandas, numpy, scipy, matplotlib, seaborn, jupyter, nbformat
- **Backend API**: FastAPI, Uvicorn, Python-Multipart
- **Frontend Web UI**: React 18, Vite, Chart.js, react-chartjs-2, Lucide-react, Vanilla CSS design system

---

## 4. Installation & Setup Instructions

### Prerequisites
- Python 3.10+
- Node.js v18+ & npm

### Step 1: Install Python Dependencies
```bash
pip install -r requirements.txt
```

### Step 2: Install Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

---

## 5. Running the Data Pipeline & Notebook

### Generate Raw Dataset & Run Preprocessing Pipeline
```bash
python backend/pipeline.py
```
*Outputs:*
- `data/raw/indoor_air_quality_raw.csv` (5,278 rows, 16 columns)
- `data/processed/indoor_air_quality_processed.csv` (5,200 rows, 23 columns)

### Generate Jupyter Notebook
```bash
python scripts/create_notebook.py
```
*Output:*
- `notebooks/indoor_air_quality_analysis.ipynb` (Contains all 25 analysis sections)

---

## 6. Running the Full-Stack Web Application

### Option A: Quick Start (Single Command via Batch File)
Double-click `run.bat` or run from terminal:
```cmd
run.bat
```
This automatically launches both the FastAPI backend and React Vite frontend in separate terminal windows.

### Option B: Manual Start (Separate Terminals)

#### Terminal 1: Start FastAPI Backend Server
```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation available at: `http://127.0.0.1:8000/docs`

#### Terminal 2: Start Vite Frontend Server
In Terminal 2 (from root directory):
```bash
cd frontend
npm run dev
```
Web Application UI available at: `http://localhost:3000`

---

## 7. Key Platform Features

1. **Dashboard**: Stat cards, environmental averages, IAQ category distribution, city CO2 breakdown, diurnal PM2.5 trends, and occupancy scatter plot.
2. **Dataset Explorer**: Paginated tab views for Raw (unmodified) vs Processed (cleaned) datasets with search, sorting, column visibility toggle, and category filters.
3. **Data Quality Profiler**: Profiling missing values %, duplicate record previews, IQR statistical outlier bounds, and data type conversion logs.
4. **Preprocessing Flowchart**: Interactive expandable pipeline stages detailing *What was done*, *Why*, and *Records affected*.
5. **Jupyter-Style Analysis Workflow**: Visual representation of the notebook cells with code blocks, output tables, and embedded analytical charts.
6. **Visualization Studio**: Custom chart builder (Bar, Line, Scatter, Histogram, Box Plot, Heatmap) with dynamic X/Y axes, aggregations, filters, editable chart title, PNG export, CSV export, and **Smart Visualization Recommendations**.
7. **Raw vs. Processed Empirical Comparison**: Side-by-side comparison matrix and structured JSON transformation logs.
8. **Automated Insights**: Dynamically calculated findings cards with supporting metrics and academic interpretations.
9. **Upload & Versioning**: Allows users to upload custom CSV datasets, validate columns, run automatic preprocessing, maintain versions (*Original, Upload 1, Upload 2*), and switch active versions seamlessly.

---

## 8. Academic Integrity & Limitations
- **Academic Purpose**: This project is created for educational assessment in Data Analysis & Visualization.
- **Simulated Synthetic Nature**: Observations are generated via mathematical stochastic models and physics approximations (`SEED = 42`).
- **Project-Defined IAQ Classification**: Categories (*Good, Moderate, Poor, Very Poor*) are project-defined for analytical evaluation and should not be interpreted as the official Indian Ambient AQI.

---

## 9. License
Distributed under the MIT License for educational and academic project use.
