"""
Analysis Engine for Indoor Air Quality Data Platform
Computes data quality statistics, raw vs processed comparisons, aggregations,
insights, and smart visualization recommendations.
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List

def compute_dataset_stats(raw_df: pd.DataFrame, processed_df: pd.DataFrame) -> Dict[str, Any]:
    raw_missing = int(raw_df.isna().sum().sum())
    proc_missing = int(processed_df.isna().sum().sum())
    
    raw_duplicates = int(raw_df.duplicated().sum())
    proc_duplicates = int(processed_df.duplicated().sum())
    
    cities_list = sorted(processed_df['city'].dropna().unique().tolist()) if 'city' in processed_df.columns else []
    room_types_list = sorted(processed_df['room_type'].dropna().unique().tolist()) if 'room_type' in processed_df.columns else []
    
    return {
        "raw_records": len(raw_df),
        "processed_records": len(processed_df),
        "raw_features": len(raw_df.columns),
        "processed_features": len(processed_df.columns),
        "raw_missing_values": raw_missing,
        "processed_missing_values": proc_missing,
        "raw_duplicates": raw_duplicates,
        "processed_duplicates": proc_duplicates,
        "cities": cities_list,
        "cities_count": len(cities_list),
        "room_types": room_types_list,
        "room_types_count": len(room_types_list),
        "overview_averages": {
            "avg_co2": round(float(processed_df['co2_ppm'].mean()), 1) if 'co2_ppm' in processed_df.columns else 0,
            "avg_pm2_5": round(float(processed_df['pm2_5_ug_m3'].mean()), 1) if 'pm2_5_ug_m3' in processed_df.columns else 0,
            "avg_pm10": round(float(processed_df['pm10_ug_m3'].mean()), 1) if 'pm10_ug_m3' in processed_df.columns else 0,
            "avg_temp": round(float(processed_df['temperature_c'].mean()), 1) if 'temperature_c' in processed_df.columns else 0,
            "avg_humidity": round(float(processed_df['relative_humidity'].mean()), 1) if 'relative_humidity' in processed_df.columns else 0,
            "avg_occupancy": round(float(processed_df['occupancy'].mean()), 1) if 'occupancy' in processed_df.columns else 0
        }
    }

def compute_data_quality_report(raw_df: pd.DataFrame, processed_df: pd.DataFrame) -> Dict[str, Any]:
    # 1. Missing values
    missing_raw = raw_df.isna().sum()
    missing_pct = (missing_raw / len(raw_df) * 100).round(2)
    missing_table = []
    for col in raw_df.columns:
        missing_table.append({
            "column": col,
            "missing_count": int(missing_raw[col]),
            "percentage": float(missing_pct[col])
        })
        
    # 2. Duplicates
    dup_rows = raw_df[raw_df.duplicated(keep=False)].head(10).to_dict(orient='records')
    dup_count = int(raw_df.duplicated().sum())
    
    # 3. Outlier analysis on raw numeric columns
    outlier_report = []
    num_cols = ['Temperature_C', 'Relative_Humidity', 'CO2_ppm', 'PM2_5_ug_m3', 'PM10_ug_m3', 'VOC_ppb']
    for col in num_cols:
        if col in raw_df.columns:
            series = pd.to_numeric(raw_df[col].astype(str).str.replace('"', '').str.replace(',', '').str.strip(), errors='coerce').dropna()
            q1 = series.quantile(0.25)
            q3 = series.quantile(0.75)
            iqr = q3 - q1
            lower_bound = q1 - 1.5 * iqr
            upper_bound = q3 + 1.5 * iqr
            outliers_count = int(((series < lower_bound) | (series > upper_bound)).sum())
            def safe_float(val):
                if pd.isna(val) or np.isinf(val):
                    return 0.0
                return round(float(val), 1)

            outlier_report.append({
                "column": col,
                "q1": safe_float(q1),
                "q3": safe_float(q3),
                "iqr": safe_float(iqr),
                "lower_bound": safe_float(lower_bound),
                "upper_bound": safe_float(upper_bound),
                "outliers_count": outliers_count,
                "outlier_percentage": safe_float(outliers_count / len(series) * 100) if len(series) > 0 else 0.0
            })
            
    # 4. Data Type Problems
    dtype_issues = []
    for raw_col in raw_df.columns:
        proc_col = raw_col.lower()
        if proc_col in processed_df.columns:
            dtype_issues.append({
                "raw_column": raw_col,
                "raw_dtype": str(raw_df[raw_col].dtype),
                "processed_column": proc_col,
                "processed_dtype": str(processed_df[proc_col].dtype),
                "status": "Corrected" if str(raw_df[raw_col].dtype) != str(processed_df[proc_col].dtype) else "Unchanged"
            })

    return {
        "missing_table": missing_table,
        "duplicate_count": dup_count,
        "duplicate_examples": dup_rows,
        "outlier_report": outlier_report,
        "dtype_issues": dtype_issues
    }

def compute_raw_vs_processed_comparison(raw_df: pd.DataFrame, processed_df: pd.DataFrame, transformation_logs: List[Dict[str, Any]]) -> Dict[str, Any]:
    raw_rows = len(raw_df)
    proc_rows = len(processed_df)
    raw_cols = len(raw_df.columns)
    proc_cols = len(processed_df.columns)
    raw_missing = int(raw_df.isna().sum().sum())
    proc_missing = int(processed_df.isna().sum().sum())
    raw_dups = int(raw_df.duplicated().sum())
    proc_dups = int(processed_df.duplicated().sum())

    matrix = [
        {"metric": "Total Rows", "raw": raw_rows, "processed": proc_rows, "difference": proc_rows - raw_rows},
        {"metric": "Total Columns", "raw": raw_cols, "processed": proc_cols, "difference": proc_cols - raw_cols},
        {"metric": "Missing Values", "raw": raw_missing, "processed": proc_missing, "difference": proc_missing - raw_missing},
        {"metric": "Duplicate Rows", "raw": raw_dups, "processed": proc_dups, "difference": proc_dups - raw_dups}
    ]

    dataset_level = {
        "metrics": ["Total Rows", "Total Columns", "Total Missing Values", "Duplicate Rows", "Numeric Columns", "Categorical Columns"],
        "raw": [
            raw_rows,
            raw_cols,
            raw_missing,
            raw_dups,
            len(raw_df.select_dtypes(include=[np.number]).columns),
            len(raw_df.select_dtypes(include=['object']).columns)
        ],
        "processed": [
            proc_rows,
            proc_cols,
            proc_missing,
            proc_dups,
            len(processed_df.select_dtypes(include=[np.number]).columns),
            len(processed_df.select_dtypes(include=['object']).columns)
        ],
        "matrix": matrix
    }
    
    column_level = []
    for raw_col in raw_df.columns:
        proc_col = raw_col.lower()
        has_proc = proc_col in processed_df.columns
        
        raw_s = pd.to_numeric(raw_df[raw_col].astype(str).str.replace('"', '').str.replace(',', '').str.strip(), errors='coerce')
        raw_min = round(float(raw_s.min()), 1) if raw_s.notna().any() else "N/A"
        raw_max = round(float(raw_s.max()), 1) if raw_s.notna().any() else "N/A"
        
        proc_min = round(float(processed_df[proc_col].min()), 1) if has_proc and pd.api.types.is_numeric_dtype(processed_df[proc_col]) else "N/A"
        proc_max = round(float(processed_df[proc_col].max()), 1) if has_proc and pd.api.types.is_numeric_dtype(processed_df[proc_col]) else "N/A"

        column_level.append({
            "raw_column": raw_col,
            "proc_column": proc_col if has_proc else "-",
            "raw_dtype": str(raw_df[raw_col].dtype),
            "proc_dtype": str(processed_df[proc_col].dtype) if has_proc else "-",
            "raw_missing": int(raw_df[raw_col].isna().sum()),
            "proc_missing": int(processed_df[proc_col].isna().sum()) if has_proc else "-",
            "raw_unique": int(raw_df[raw_col].nunique()),
            "proc_unique": int(processed_df[proc_col].nunique()) if has_proc else "-",
            "raw_range": f"{raw_min} to {raw_max}" if raw_min != "N/A" else "Categorical/Text",
            "proc_range": f"{proc_min} to {proc_max}" if proc_min != "N/A" else "Categorical/Text"
        })

    return {
        "dataset_level": dataset_level,
        "column_level": column_level,
        "transformations": transformation_logs
    }

def compute_analytical_insights(df: pd.DataFrame) -> List[Dict[str, Any]]:
    insights = []
    
    # 1. City with highest CO2
    city_co2 = df.groupby('city')['co2_ppm'].mean().round(1).sort_values(ascending=False)
    top_co2_city = city_co2.index[0]
    top_co2_val = city_co2.iloc[0]
    insights.append({
        "title": "Highest Average CO₂ Concentration by City",
        "finding": f"{top_co2_city} recorded the highest average indoor CO₂ level across all monitored indoor locations.",
        "supporting_metric": f"{top_co2_val} ppm (Average CO₂ in {top_co2_city})",
        "interpretation": "High urban population density and frequent use of closed AC environments in commercial centers contribute to elevated indoor CO₂ levels."
    })
    
    # 2. Most affected room type
    room_iaq = df.groupby('room_type')['co2_ppm'].mean().round(1).sort_values(ascending=False)
    worst_room = room_iaq.index[0]
    worst_room_val = room_iaq.iloc[0]
    insights.append({
        "title": "Most Frequently Affected Indoor Room Type",
        "finding": f"{worst_room} environments exhibited the highest mean pollutant accumulation.",
        "supporting_metric": f"{worst_room_val} ppm average CO₂",
        "interpretation": "High occupancy density coupled with limited continuous natural airflow leads to rapid CO₂ accumulation in institutional settings."
    })

    # 3. Peak time period for CO2
    hourly_co2 = df.groupby('hour')['co2_ppm'].mean().round(1).sort_values(ascending=False)
    peak_hour = hourly_co2.index[0]
    peak_val = hourly_co2.iloc[0]
    insights.append({
        "title": "Diurnal Peak Air Quality Stress Period",
        "finding": f"Peak indoor air degradation consistently occurs around {peak_hour:02d}:00 hours.",
        "supporting_metric": f"{peak_val} ppm peak average at {peak_hour:02d}:00",
        "interpretation": "Concurs with maximum daily occupant activity and active working hours across offices, classrooms, and commercial spaces."
    })

    # 4. Occupancy vs CO2 correlation
    occ_co2_corr = round(float(df['occupancy'].corr(df['co2_ppm'])), 3)
    insights.append({
        "title": "Strong Positive Correlation: Occupancy & CO₂",
        "finding": "Indoor occupant count strongly correlates with elevated carbon dioxide concentrations.",
        "supporting_metric": f"Pearson Correlation Coefficient r = {occ_co2_corr}",
        "interpretation": "Human respiration is the primary indoor source of CO₂. Increased occupancy without proportional fresh air intake degrades indoor air quality."
    })

    # 5. Ventilation impact on PM2.5
    vent_pm = df.groupby('ventilation_type')['pm2_5_ug_m3'].mean().round(1).sort_values()
    best_vent = vent_pm.index[0]
    best_vent_pm = vent_pm.iloc[0]
    worst_vent = vent_pm.index[-1]
    worst_vent_pm = vent_pm.iloc[-1]
    insights.append({
        "title": "Impact of Ventilation Architecture on Fine Particulates (PM2.5)",
        "finding": f"{best_vent} systems achieved lowest indoor PM2.5 concentrations compared to {worst_vent} systems.",
        "supporting_metric": f"{best_vent_pm} µg/m³ ({best_vent}) vs {worst_vent_pm} µg/m³ ({worst_vent})",
        "interpretation": "Filtered mechanical HVAC systems effectively scrub ambient outdoor particulate matter, whereas unmanaged natural ventilation allows unfiltered outdoor fine dust to enter."
    })

    return insights

def recommend_chart_type(x_axis: str, y_axis: str) -> Dict[str, str]:
    x = x_axis.lower() if x_axis else ""
    y = y_axis.lower() if y_axis else ""
    
    categorical_cols = ['city', 'room_type', 'ventilation_type', 'iaq_category', 'day_of_week']
    numerical_cols = ['co2_ppm', 'pm2_5_ug_m3', 'pm10_ug_m3', 'temperature_c', 'relative_humidity', 'occupancy', 'voc_ppb', 'co_ppm', 'iaq_index']
    time_cols = ['timestamp', 'date', 'hour']
    
    if x in time_cols and y in numerical_cols:
        return {
            "recommended_chart": "Line Chart",
            "reason": f"Tracking time-series progression of {y_axis} over {x_axis} is best visualized with a smooth Line Chart."
        }
    elif x in categorical_cols and y in numerical_cols:
        return {
            "recommended_chart": "Bar Chart",
            "reason": f"Comparing numerical metric ({y_axis}) across categorical groups ({x_axis}) is optimal with a Bar Chart."
        }
    elif x in numerical_cols and y in numerical_cols:
        return {
            "recommended_chart": "Scatter Plot",
            "reason": f"Analyzing bivariate relationship and correlation between two continuous metrics ({x_axis} vs {y_axis}) is best shown using a Scatter Plot."
        }
    elif x in numerical_cols and not y:
        return {
            "recommended_chart": "Histogram",
            "reason": f"Distribution of single continuous feature ({x_axis}) is effectively analyzed using a Histogram / Density Plot."
        }
    else:
        return {
            "recommended_chart": "Bar Chart",
            "reason": "Default responsive Bar Chart recommended for categorical vs numerical summary."
        }
