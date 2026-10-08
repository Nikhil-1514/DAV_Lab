"""
FastAPI Backend Server for Indoor Air Quality Data Analysis & Visualization Platform
"""

import os
import json
import shutil
import numpy as np
import pandas as pd
from datetime import datetime
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, UploadFile, File, Query, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .data_generator import generate_iaq_raw_dataset
from .pipeline import run_preprocessing_pipeline
from .analysis import (
    compute_dataset_stats,
    compute_data_quality_report,
    compute_raw_vs_processed_comparison,
    compute_analytical_insights,
    recommend_chart_type
)

app = FastAPI(
    title="Indoor Air Quality Analysis - Andhra Pradesh API",
    description="Backend API supporting the Indoor Air Quality Data Analysis & Visualization Platform",
    version="1.0.0"
)

# Enable CORS for frontend Vite development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths configuration
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
RAW_DATA_PATH = os.path.join(DATA_DIR, "raw", "indoor_air_quality_raw.csv")
PROCESSED_DATA_PATH = os.path.join(DATA_DIR, "processed", "indoor_air_quality_processed.csv")
UPLOADS_DIR = os.path.join(DATA_DIR, "uploads")
VERSIONS_META_PATH = os.path.join(DATA_DIR, "versions_meta.json")

os.makedirs(os.path.join(DATA_DIR, "raw"), exist_ok=True)
os.makedirs(os.path.join(DATA_DIR, "processed"), exist_ok=True)
os.makedirs(UPLOADS_DIR, exist_ok=True)

# State Management for Dataset Versions & In-Memory Cache
current_active_version_id = "v0_original"
versions_registry = {}
global_transformation_logs = []

# Simple In-Memory DataFrame Cache to eliminate redundant CSV disk reads
df_cache = {
    "active_version_id": None,
    "raw_df": None,
    "proc_df": None
}

def init_versions_metadata():
    global versions_registry, current_active_version_id, global_transformation_logs
    
    # Ensure initial raw & processed datasets exist
    if not os.path.exists(RAW_DATA_PATH):
        generate_iaq_raw_dataset(num_records=5200, output_path=RAW_DATA_PATH)
        
    raw_df = pd.read_csv(RAW_DATA_PATH)
    proc_df, pipeline_summary = run_preprocessing_pipeline(raw_df, processed_output_path=PROCESSED_DATA_PATH)
    global_transformation_logs = pipeline_summary['logs']

    versions_registry = {
        "v0_original": {
            "version_id": "v0_original",
            "name": "Original Dataset (AP Synthetic)",
            "file_name": "indoor_air_quality_raw.csv",
            "raw_path": RAW_DATA_PATH,
            "processed_path": PROCESSED_DATA_PATH,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "raw_rows": len(raw_df),
            "processed_rows": len(proc_df),
            "columns": len(raw_df.columns),
            "raw_missing": int(raw_df.isna().sum().sum()),
            "status": "Processed",
            "is_original": True
        }
    }
    
    if os.path.exists(VERSIONS_META_PATH):
        try:
            with open(VERSIONS_META_PATH, 'r') as f:
                saved = json.load(f)
                versions_registry.update(saved.get("versions", {}))
                current_active_version_id = saved.get("current_active_version_id", "v0_original")
        except Exception:
            pass

    save_versions_metadata()
    invalidate_cache()

def save_versions_metadata():
    with open(VERSIONS_META_PATH, 'w') as f:
        json.dump({
            "current_active_version_id": current_active_version_id,
            "versions": versions_registry
        }, f, indent=2)

def invalidate_cache():
    df_cache["active_version_id"] = None
    df_cache["raw_df"] = None
    df_cache["proc_df"] = None

@app.on_event("startup")
def startup_event():
    init_versions_metadata()

def get_active_dataframes():
    global df_cache
    if df_cache["active_version_id"] == current_active_version_id and df_cache["raw_df"] is not None and df_cache["proc_df"] is not None:
        return df_cache["raw_df"], df_cache["proc_df"]

    meta = versions_registry.get(current_active_version_id, versions_registry["v0_original"])
    raw_path = meta["raw_path"]
    proc_path = meta["processed_path"]
    
    if not os.path.exists(raw_path) or not os.path.exists(proc_path):
        init_versions_metadata()
        meta = versions_registry["v0_original"]
        raw_path = meta["raw_path"]
        proc_path = meta["processed_path"]
        
    raw_df = pd.read_csv(raw_path)
    proc_df = pd.read_csv(proc_path)

    df_cache["active_version_id"] = current_active_version_id
    df_cache["raw_df"] = raw_df
    df_cache["proc_df"] = proc_df

    return raw_df, proc_df

def filter_dataframe(
    df: pd.DataFrame,
    city: Optional[str] = None,
    room_type: Optional[str] = None,
    ventilation_type: Optional[str] = None,
    iaq_category: Optional[str] = None
) -> pd.DataFrame:
    filtered = df.copy()
    if city and city != "All":
        filtered = filtered[filtered['city'] == city]
    if room_type and room_type != "All":
        filtered = filtered[filtered['room_type'] == room_type]
    if ventilation_type and ventilation_type != "All":
        filtered = filtered[filtered['ventilation_type'] == ventilation_type]
    if iaq_category and iaq_category != "All":
        filtered = filtered[filtered['iaq_category'] == iaq_category]
    return filtered

# Helper function for JSON nan/inf sanitization
def sanitize_records(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    sanitized = []
    for record in records:
        clean_row = {}
        for k, v in record.items():
            if pd.isna(v) or v is None:
                clean_row[k] = None
            elif isinstance(v, (float, np.floating)):
                if np.isnan(v) or np.isinf(v):
                    clean_row[k] = None
                else:
                    clean_row[k] = round(float(v), 2)
            elif isinstance(v, (int, np.integer)):
                clean_row[k] = int(v)
            else:
                clean_row[k] = str(v)
        sanitized.append(clean_row)
    return sanitized

# ---------------------------------------------------------
# API ENDPOINTS
# ---------------------------------------------------------

@app.get("/api/versions")
def get_versions():
    return {
        "current_active_version_id": current_active_version_id,
        "versions": list(versions_registry.values())
    }

@app.post("/api/versions/select")
def select_version(version_id: str = Form(...)):
    global current_active_version_id
    if version_id not in versions_registry:
        raise HTTPException(status_code=404, detail=f"Version ID '{version_id}' not found.")
    current_active_version_id = version_id
    invalidate_cache()
    save_versions_metadata()
    return {
        "status": "success",
        "message": f"Switched to dataset version: {versions_registry[version_id]['name']}",
        "current_active_version_id": current_active_version_id
    }

@app.get("/api/dataset/stats")
def get_dataset_stats(
    city: Optional[str] = None,
    room_type: Optional[str] = None,
    ventilation_type: Optional[str] = None,
    iaq_category: Optional[str] = None
):
    raw_df, proc_df = get_active_dataframes()
    filtered_proc = filter_dataframe(proc_df, city, room_type, ventilation_type, iaq_category)
    
    stats = compute_dataset_stats(raw_df, filtered_proc)
    meta = versions_registry.get(current_active_version_id, versions_registry["v0_original"])
    stats["active_version"] = meta
    return stats

@app.get("/api/dataset/raw")
def get_raw_dataset(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=500),
    search: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_order: Optional[str] = "asc"
):
    raw_df, _ = get_active_dataframes()
    df = raw_df.copy()
    
    if search:
        search_lower = search.lower()
        mask = df.astype(str).apply(lambda row: row.str.lower().str.contains(search_lower).any(), axis=1)
        df = df[mask]
        
    if sort_by and sort_by in df.columns:
        ascending = sort_order.lower() == "asc"
        df.sort_values(by=sort_by, ascending=ascending, inplace=True)
        
    total_records = len(df)
    total_pages = int(np.ceil(total_records / page_size)) if total_records > 0 else 1
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    
    sliced = df.iloc[start_idx:end_idx].to_dict(orient='records')
    
    return {
        "data": sanitize_records(sliced),
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total_records": total_records,
            "total_pages": total_pages
        },
        "columns": df.columns.tolist()
    }

@app.get("/api/dataset/processed")
def get_processed_dataset(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=500),
    search: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_order: Optional[str] = "asc",
    city: Optional[str] = None,
    room_type: Optional[str] = None,
    ventilation_type: Optional[str] = None,
    iaq_category: Optional[str] = None
):
    _, proc_df = get_active_dataframes()
    df = filter_dataframe(proc_df, city, room_type, ventilation_type, iaq_category)
        
    if search:
        search_lower = search.lower()
        mask = df.astype(str).apply(lambda row: row.str.lower().str.contains(search_lower).any(), axis=1)
        df = df[mask]
        
    if sort_by and sort_by in df.columns:
        ascending = sort_order.lower() == "asc"
        df.sort_values(by=sort_by, ascending=ascending, inplace=True)
        
    total_records = len(df)
    total_pages = int(np.ceil(total_records / page_size)) if total_records > 0 else 1
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    
    sliced = df.iloc[start_idx:end_idx].to_dict(orient='records')
    
    return {
        "data": sanitize_records(sliced),
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total_records": total_records,
            "total_pages": total_pages
        },
        "columns": df.columns.tolist()
    }

@app.get("/api/data-quality")
def get_data_quality():
    raw_df, proc_df = get_active_dataframes()
    report = compute_data_quality_report(raw_df, proc_df)
    return report

@app.get("/api/preprocessing")
def get_preprocessing():
    raw_df, proc_df = get_active_dataframes()
    _, summary_pipeline = run_preprocessing_pipeline(raw_df)
    return {
        "raw_rows": len(raw_df),
        "processed_rows": len(proc_df),
        "pipeline_stages": summary_pipeline['logs']
    }

@app.get("/api/transformation-log")
def get_transformation_log():
    raw_df, _ = get_active_dataframes()
    _, summary_pipeline = run_preprocessing_pipeline(raw_df)
    return summary_pipeline['logs']

@app.get("/api/comparison")
def get_comparison():
    raw_df, proc_df = get_active_dataframes()
    _, summary_pipeline = run_preprocessing_pipeline(raw_df)
    comp = compute_raw_vs_processed_comparison(raw_df, proc_df, summary_pipeline['logs'])
    return comp

@app.get("/api/analysis/overview")
def get_analysis_overview(
    city: Optional[str] = None,
    room_type: Optional[str] = None,
    ventilation_type: Optional[str] = None,
    iaq_category: Optional[str] = None
):
    _, proc_df = get_active_dataframes()
    df = filter_dataframe(proc_df, city, room_type, ventilation_type, iaq_category)
    
    iaq_dist = df['iaq_category'].value_counts().to_dict() if 'iaq_category' in df.columns else {}
    num_cols = ['co2_ppm', 'pm2_5_ug_m3', 'pm10_ug_m3', 'temperature_c', 'relative_humidity', 'occupancy', 'voc_ppb', 'co_ppm', 'iaq_index']
    existing_num = [c for c in num_cols if c in df.columns]
    desc = df[existing_num].describe().to_dict() if not df.empty else {}
    corr_matrix = df[existing_num].corr().round(2).to_dict() if len(df) > 1 else {}
    
    return {
        "iaq_category_distribution": iaq_dist,
        "descriptive_statistics": desc,
        "correlation_matrix": corr_matrix
    }

@app.get("/api/analysis/city")
def get_city_analysis(
    city: Optional[str] = None,
    room_type: Optional[str] = None,
    ventilation_type: Optional[str] = None,
    iaq_category: Optional[str] = None
):
    _, proc_df = get_active_dataframes()
    df = filter_dataframe(proc_df, city, room_type, ventilation_type, iaq_category)
    if 'city' not in df.columns or df.empty:
        return []
    
    city_agg = df.groupby('city').agg({
        'co2_ppm': 'mean',
        'pm2_5_ug_m3': 'mean',
        'pm10_ug_m3': 'mean',
        'temperature_c': 'mean',
        'occupancy': 'mean',
        'record_id': 'count'
    }).reset_index()
    
    city_agg.rename(columns={'record_id': 'record_count'}, inplace=True)
    return sanitize_records(city_agg.to_dict(orient='records'))

@app.get("/api/analysis/room")
def get_room_analysis(
    city: Optional[str] = None,
    room_type: Optional[str] = None,
    ventilation_type: Optional[str] = None,
    iaq_category: Optional[str] = None
):
    _, proc_df = get_active_dataframes()
    df = filter_dataframe(proc_df, city, room_type, ventilation_type, iaq_category)
    if 'room_type' not in df.columns or df.empty:
        return []
        
    room_agg = df.groupby('room_type').agg({
        'co2_ppm': 'mean',
        'pm2_5_ug_m3': 'mean',
        'occupancy': 'mean',
        'voc_ppb': 'mean',
        'record_id': 'count'
    }).reset_index()
    
    room_agg.rename(columns={'record_id': 'record_count'}, inplace=True)
    return sanitize_records(room_agg.to_dict(orient='records'))

@app.get("/api/analysis/ventilation")
def get_ventilation_analysis(
    city: Optional[str] = None,
    room_type: Optional[str] = None,
    ventilation_type: Optional[str] = None,
    iaq_category: Optional[str] = None
):
    _, proc_df = get_active_dataframes()
    df = filter_dataframe(proc_df, city, room_type, ventilation_type, iaq_category)
    if 'ventilation_type' not in df.columns or df.empty:
        return []
        
    vent_agg = df.groupby('ventilation_type').agg({
        'co2_ppm': 'mean',
        'pm2_5_ug_m3': 'mean',
        'temperature_c': 'mean',
        'relative_humidity': 'mean',
        'record_id': 'count'
    }).reset_index()
    
    vent_agg.rename(columns={'record_id': 'record_count'}, inplace=True)
    return sanitize_records(vent_agg.to_dict(orient='records'))

@app.get("/api/analysis/occupancy")
def get_occupancy_analysis(
    city: Optional[str] = None,
    room_type: Optional[str] = None,
    ventilation_type: Optional[str] = None,
    iaq_category: Optional[str] = None
):
    _, proc_df = get_active_dataframes()
    df = filter_dataframe(proc_df, city, room_type, ventilation_type, iaq_category)
    sample_size = min(600, len(df))
    if sample_size == 0:
        return []
    sampled = df.sample(n=sample_size, random_state=42)[['occupancy', 'co2_ppm', 'pm2_5_ug_m3', 'room_type', 'ventilation_type']]
    return sanitize_records(sampled.to_dict(orient='records'))

@app.get("/api/analysis/time")
def get_time_analysis(
    city: Optional[str] = None,
    room_type: Optional[str] = None,
    ventilation_type: Optional[str] = None,
    iaq_category: Optional[str] = None
):
    _, proc_df = get_active_dataframes()
    df = filter_dataframe(proc_df, city, room_type, ventilation_type, iaq_category)
    if 'hour' not in df.columns or df.empty:
        return []
        
    time_agg = df.groupby('hour').agg({
        'co2_ppm': 'mean',
        'pm2_5_ug_m3': 'mean',
        'temperature_c': 'mean',
        'occupancy': 'mean'
    }).reset_index()
    
    return sanitize_records(time_agg.to_dict(orient='records'))

@app.get("/api/insights")
def get_insights():
    _, proc_df = get_active_dataframes()
    insights = compute_analytical_insights(proc_df)
    return insights

@app.post("/api/visualization/recommend")
def get_visualization_recommendation(
    x_axis: str = Form(...),
    y_axis: Optional[str] = Form(None)
):
    rec = recommend_chart_type(x_axis, y_axis or "")
    return rec

@app.post("/api/visualization/custom")
def query_custom_visualization(
    chart_type: str = Form(...),
    x_axis: str = Form(...),
    y_axis: Optional[str] = Form(None),
    group_by: Optional[str] = Form(None),
    aggregation: str = Form("mean"),
    city: Optional[str] = Form(None),
    room_type: Optional[str] = Form(None),
    ventilation_type: Optional[str] = Form(None),
    iaq_category: Optional[str] = Form(None),
    use_raw: Optional[bool] = Form(False)
):
    raw_df, proc_df = get_active_dataframes()
    target_df = raw_df if use_raw else proc_df
    
    # Map lowercase column if selecting in raw
    x_col = x_axis if x_axis in target_df.columns else x_axis.capitalize()
    if x_col not in target_df.columns:
        x_col = x_axis.lower()
        
    y_col = y_axis if y_axis and y_axis in target_df.columns else (y_axis.capitalize() if y_axis else None)
    if y_col and y_col not in target_df.columns:
        y_col = y_axis.lower()

    df = target_df.copy()
    if 'city' in df.columns and city and city != "All":
        df = df[df['city'] == city]
    elif 'City' in df.columns and city and city != "All":
        df = df[df['City'] == city]
        
    if df.empty:
        return {"data": [], "message": "No data matches selected filters."}

    # Aggregate based on parameters
    if chart_type in ['Bar', 'Line']:
        if y_col and y_col in df.columns and x_col in df.columns:
            agg_func = aggregation.lower()
            if agg_func not in ['mean', 'median', 'sum', 'count', 'min', 'max']:
                agg_func = 'mean'
                
            group_cols = [x_col]
            if group_by and group_by != "None" and group_by in df.columns and group_by != x_col:
                group_cols.append(group_by)
                
            res = df.groupby(group_cols)[y_col].agg(agg_func).reset_index()
            return {"data": sanitize_records(res.to_dict(orient='records'))}
        elif x_col in df.columns:
            res = df[x_col].value_counts().reset_index()
            res.columns = [x_col, 'count']
            return {"data": sanitize_records(res.to_dict(orient='records'))}

    elif chart_type == 'Scatter':
        if x_col in df.columns and y_col in df.columns:
            sample_n = min(1000, len(df))
            cols = [x_col, y_col]
            if group_by and group_by != "None" and group_by in df.columns:
                cols.append(group_by)
            res = df.sample(n=sample_n, random_state=42)[cols]
            return {"data": sanitize_records(res.to_dict(orient='records'))}

    elif chart_type == 'Histogram':
        if x_col in df.columns:
            series = pd.to_numeric(df[x_col], errors='coerce').dropna()
            if len(series) > 0:
                counts, bin_edges = np.histogram(series, bins=15)
                histogram_data = []
                for i in range(len(counts)):
                    bin_label = f"{round(float(bin_edges[i]), 1)} - {round(float(bin_edges[i+1]), 1)}"
                    histogram_data.append({"bin": bin_label, "count": int(counts[i])})
                return {"data": histogram_data}

    elif chart_type == 'Box Plot':
        if x_col in df.columns and y_col in df.columns:
            box_stats = []
            for key, grp in df.groupby(x_col):
                s = pd.to_numeric(grp[y_col], errors='coerce').dropna()
                if len(s) > 0:
                    box_stats.append({
                        "category": str(key),
                        "min": round(float(s.min()), 1),
                        "q1": round(float(s.quantile(0.25)), 1),
                        "median": round(float(s.median()), 1),
                        "q3": round(float(s.quantile(0.75)), 1),
                        "max": round(float(s.max()), 1),
                        "count": len(s)
                    })
            return {"data": box_stats}

    elif chart_type == 'Heatmap':
        num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        corr = df[num_cols].corr().round(2).reset_index()
        return {"data": sanitize_records(corr.to_dict(orient='records'))}

    sample_cols = [c for c in [x_col, y_col] if c and c in df.columns]
    return {"data": sanitize_records(df[sample_cols].head(50).to_dict(orient='records'))}

@app.post("/api/upload")
async def upload_dataset(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload a CSV file.")
        
    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    version_key = f"v_{timestamp_str}"
    
    uploaded_raw_filename = f"uploaded_raw_{timestamp_str}.csv"
    uploaded_proc_filename = f"uploaded_processed_{timestamp_str}.csv"
    
    uploaded_raw_path = os.path.join(UPLOADS_DIR, uploaded_raw_filename)
    uploaded_proc_path = os.path.join(UPLOADS_DIR, uploaded_proc_filename)
    
    with open(uploaded_raw_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        raw_df = pd.read_csv(uploaded_raw_path)
    except Exception as e:
        os.remove(uploaded_raw_path)
        raise HTTPException(status_code=400, detail=f"Failed to parse uploaded CSV file: {str(e)}")

    if len(raw_df) == 0:
        os.remove(uploaded_raw_path)
        raise HTTPException(status_code=400, detail="Uploaded CSV file is empty.")

    # Run processing pipeline on uploaded dataset
    proc_df, pipeline_summary = run_preprocessing_pipeline(raw_df, processed_output_path=uploaded_proc_path)

    # Register version
    version_name = f"Uploaded Dataset ({file.filename})"
    versions_registry[version_key] = {
        "version_id": version_key,
        "name": version_name,
        "file_name": file.filename,
        "raw_path": uploaded_raw_path,
        "processed_path": uploaded_proc_path,
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "raw_rows": len(raw_df),
        "processed_rows": len(proc_df),
        "columns": len(raw_df.columns),
        "raw_missing": int(raw_df.isna().sum().sum()),
        "status": "Processed Successfully",
        "is_original": False
    }

    global current_active_version_id
    current_active_version_id = version_key
    invalidate_cache()
    save_versions_metadata()

    return {
        "status": "success",
        "message": f"Dataset '{file.filename}' uploaded and processed successfully!",
        "version": versions_registry[version_key]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
