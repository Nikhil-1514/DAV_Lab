"""
Data Cleaning, Preprocessing, Wrangling, and Feature Engineering Pipeline
Maintains strict Raw Data Preservation rules and outputs transformation logs.
"""

import os
import json
import re
import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple

def run_preprocessing_pipeline(raw_df: pd.DataFrame, processed_output_path: str = None) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    # Create a COPY of raw dataframe. NEVER mutate raw_df directly.
    cleaned_df = raw_df.copy()
    
    transformation_logs = []
    
    # ---------------------------------------------------------
    # STAGE 1: COLUMN NAME STANDARDIZATION
    # ---------------------------------------------------------
    col_mapping = {col: re.sub(r'[\s_\-]+', '_', col).lower() for col in cleaned_df.columns}
    cleaned_df.rename(columns=col_mapping, inplace=True)
    
    transformation_logs.append({
        "stage": "Column Standardization",
        "operation": "snake_case_conversion",
        "rows_affected": len(cleaned_df),
        "description": "Standardized all column headers to snake_case format.",
        "details": col_mapping
    })
    
    # ---------------------------------------------------------
    # STAGE 2: DUPLICATE REMOVAL
    # ---------------------------------------------------------
    rows_before = len(cleaned_df)
    duplicates_count = int(cleaned_df.duplicated().sum())
    cleaned_df.drop_duplicates(inplace=True)
    rows_after = len(cleaned_df)
    
    transformation_logs.append({
        "stage": "Duplicate Removal",
        "operation": "exact_duplicate_removal",
        "rows_affected": duplicates_count,
        "description": f"Removed {duplicates_count} exact duplicate rows.",
        "metrics": {
            "rows_before": rows_before,
            "duplicates_found": duplicates_count,
            "rows_removed": duplicates_count,
            "rows_after": rows_after
        }
    })
    
    # ---------------------------------------------------------
    # STAGE 3: NUMERIC FORMATTING CONVERSION
    # ---------------------------------------------------------
    numeric_cols = ['temperature_c', 'relative_humidity', 'co2_ppm', 'pm2_5_ug_m3', 'pm10_ug_m3', 'co_ppm', 'voc_ppb', 'occupancy']
    converted_formatting_count = 0
    
    for col in numeric_cols:
        if col in cleaned_df.columns:
            # Clean string numbers (e.g., "1,050", "920 ", quotes)
            def clean_num(val):
                if pd.isna(val):
                    return np.nan
                if isinstance(val, (int, float)):
                    return float(val)
                val_str = str(val).replace('"', '').replace(',', '').strip()
                try:
                    return float(val_str)
                except ValueError:
                    return np.nan
            
            non_numeric_mask = cleaned_df[col].apply(lambda x: isinstance(x, str) and (',' in x or '"' in x or x.strip() != x))
            converted_formatting_count += int(non_numeric_mask.sum())
            cleaned_df[col] = cleaned_df[col].apply(clean_num)

    transformation_logs.append({
        "stage": "Numeric Formatting Conversion",
        "operation": "string_to_numeric_parsing",
        "rows_affected": converted_formatting_count,
        "description": "Parsed numerical columns containing string formatting (commas, quotes, whitespace).",
        "numeric_columns": numeric_cols
    })
    
    # ---------------------------------------------------------
    # STAGE 4: CATEGORICAL NORMALIZATION
    # ---------------------------------------------------------
    city_norm_map = {
        'visakhapatnam': 'Visakhapatnam', 'vizag': 'Visakhapatnam',
        'vijayawada': 'Vijayawada', 'guntur': 'Guntur',
        'tirupati': 'Tirupati', 'kakinada': 'Kakinada',
        'nellore': 'Nellore', 'rajahmundry': 'Rajahmundry'
    }
    
    room_norm_map = {
        'classroom': 'Classroom', 'office': 'Office',
        'laboratory': 'Laboratory', 'lab': 'Laboratory',
        'library': 'Library', 'bedroom': 'Bedroom',
        'living room': 'Living Room', 'living_room': 'Living Room',
        'conference room': 'Conference Room', 'conf room': 'Conference Room'
    }
    
    vent_norm_map = {
        'natural': 'Natural', 'mechanical': 'Mechanical',
        'air conditioned': 'Air Conditioned', 'ac': 'Air Conditioned',
        'air-conditioned': 'Air Conditioned', 'mixed': 'Mixed'
    }
    
    cat_changes = 0
    if 'city' in cleaned_df.columns:
        original_city = cleaned_df['city'].astype(str).str.strip().str.lower()
        cleaned_df['city'] = original_city.map(city_norm_map).fillna(cleaned_df['city'].astype(str).str.strip().str.title())
        cat_changes += int((cleaned_df['city'] != raw_df.loc[cleaned_df.index, 'City']).sum())
        
    if 'room_type' in cleaned_df.columns:
        original_room = cleaned_df['room_type'].astype(str).str.strip().str.lower()
        cleaned_df['room_type'] = original_room.map(room_norm_map).fillna(cleaned_df['room_type'].astype(str).str.strip().str.title())
        
    if 'ventilation_type' in cleaned_df.columns:
        original_vent = cleaned_df['ventilation_type'].astype(str).str.strip().str.lower()
        cleaned_df['ventilation_type'] = original_vent.map(vent_norm_map).fillna('Natural')

    transformation_logs.append({
        "stage": "Categorical Normalization",
        "operation": "standardize_categories",
        "rows_affected": cat_changes,
        "description": "Standardized raw categorical text (City, Room_Type, Ventilation_Type) to canonical labels.",
        "categories_processed": ["city", "room_type", "ventilation_type"]
    })
    
    # ---------------------------------------------------------
    # STAGE 5: MISSING VALUE HANDLING
    # ---------------------------------------------------------
    missing_summary = cleaned_df.isna().sum().to_dict()
    
    # Impute missing occupancy by room_type median
    if cleaned_df['occupancy'].isna().any():
        room_occupancy_median = cleaned_df.groupby('room_type')['occupancy'].transform('median')
        cleaned_df['occupancy'] = cleaned_df['occupancy'].fillna(room_occupancy_median).fillna(5).astype(int)
        
    # Impute missing temperature_c by ventilation_type median
    if cleaned_df['temperature_c'].isna().any():
        vent_temp_median = cleaned_df.groupby('ventilation_type')['temperature_c'].transform('median')
        cleaned_df['temperature_c'] = cleaned_df['temperature_c'].fillna(vent_temp_median).fillna(25.0)

    # Impute missing relative_humidity by city median
    if cleaned_df['relative_humidity'].isna().any():
        city_hum_median = cleaned_df.groupby('city')['relative_humidity'].transform('median')
        cleaned_df['relative_humidity'] = cleaned_df['relative_humidity'].fillna(city_hum_median).fillna(65.0)

    # Impute missing co2_ppm by (room_type, ventilation_type) median
    if cleaned_df['co2_ppm'].isna().any():
        group_co2_median = cleaned_df.groupby(['room_type', 'ventilation_type'])['co2_ppm'].transform('median')
        cleaned_df['co2_ppm'] = cleaned_df['co2_ppm'].fillna(group_co2_median).fillna(550.0)

    # Impute missing pm2_5_ug_m3 by (city, ventilation_type) median
    if cleaned_df['pm2_5_ug_m3'].isna().any():
        group_pm_median = cleaned_df.groupby(['city', 'ventilation_type'])['pm2_5_ug_m3'].transform('median')
        cleaned_df['pm2_5_ug_m3'] = cleaned_df['pm2_5_ug_m3'].fillna(group_pm_median).fillna(35.0)

    # Impute missing pm10_ug_m3 based on pm2_5 ratio if NaN
    if cleaned_df['pm10_ug_m3'].isna().any():
        cleaned_df['pm10_ug_m3'] = cleaned_df['pm10_ug_m3'].fillna(cleaned_df['pm2_5_ug_m3'] * 1.8 + 10.0)

    transformation_logs.append({
        "stage": "Missing Value Handling",
        "operation": "group_median_imputation",
        "rows_affected": sum(missing_summary.values()),
        "description": "Imputed missing numerical & categorical values using domain-specific group medians.",
        "initial_missing_counts": missing_summary
    })
    
    # ---------------------------------------------------------
    # STAGE 6: OUTLIER TREATMENT & ANOMALY RESOLUTION
    # ---------------------------------------------------------
    # Sensor malfunction correction: impossible physical bounds
    temp_anomalies = (cleaned_df['temperature_c'] < 0) | (cleaned_df['temperature_c'] > 55)
    hum_anomalies = cleaned_df['relative_humidity'] > 100
    
    anomalies_count = int(temp_anomalies.sum() + hum_anomalies.sum())
    
    # Replace physical impossible values with group medians
    cleaned_df.loc[temp_anomalies, 'temperature_c'] = cleaned_df.groupby('ventilation_type')['temperature_c'].transform('median')
    cleaned_df.loc[hum_anomalies, 'relative_humidity'] = cleaned_df.groupby('city')['relative_humidity'].transform('median')
    
    # Cap extreme upper statistical outliers (> 99.5 percentile) for CO2 & PM2.5 to preserve extreme events safely
    co2_cap = cleaned_df['co2_ppm'].quantile(0.995)
    pm25_cap = cleaned_df['pm2_5_ug_m3'].quantile(0.995)
    
    co2_capped_count = int((cleaned_df['co2_ppm'] > co2_cap).sum())
    pm25_capped_count = int((cleaned_df['pm2_5_ug_m3'] > pm25_cap).sum())
    
    cleaned_df['co2_ppm'] = cleaned_df['co2_ppm'].clip(upper=co2_cap)
    cleaned_df['pm2_5_ug_m3'] = cleaned_df['pm2_5_ug_m3'].clip(upper=pm25_cap)
    cleaned_df['pm10_ug_m3'] = cleaned_df['pm10_ug_m3'].clip(upper=pm25_cap * 2.2 + 20)

    transformation_logs.append({
        "stage": "Outlier & Anomaly Treatment",
        "operation": "physical_bound_correction_and_quantile_capping",
        "rows_affected": anomalies_count + co2_capped_count + pm25_capped_count,
        "description": "Corrected impossible sensor glitches (negative temp, >100% humidity) and capped extreme 99.5% outliers.",
        "details": {
            "impossible_sensor_errors_fixed": anomalies_count,
            "co2_ppm_99_5_cap": round(float(co2_cap), 1),
            "pm2_5_99_5_cap": round(float(pm25_cap), 1)
        }
    })
    
    # ---------------------------------------------------------
    # STAGE 7: FEATURE ENGINEERING
    # ---------------------------------------------------------
    processed_df = cleaned_df.copy()
    
    # Extract timestamp features
    processed_df['timestamp_parsed'] = pd.to_datetime(processed_df['timestamp'], errors='coerce')
    processed_df['hour'] = processed_df['timestamp_parsed'].dt.hour.fillna(12).astype(int)
    processed_df['day_of_week'] = processed_df['timestamp_parsed'].dt.day_name().fillna('Monday')
    
    # Occupancy flag
    processed_df['is_high_occupancy'] = processed_df['occupancy'] > 15
    
    # PM Ratio (PM2.5 / PM10)
    processed_df['pm_ratio'] = (processed_df['pm2_5_ug_m3'] / np.maximum(processed_df['pm10_ug_m3'], 1.0)).round(3)
    
    # Ventilation efficiency metric (CO2 per occupant)
    processed_df['ventilation_efficiency'] = (processed_df['co2_ppm'] / (processed_df['occupancy'] + 1)).round(2)
    
    # Composite IAQ Index
    # Scaled metric: (CO2/1000)*0.4 + (PM2.5/35)*0.4 + (VOC/300)*0.2
    processed_df['iaq_index'] = (
        (processed_df['co2_ppm'] / 1000.0) * 0.4 +
        (processed_df['pm2_5_ug_m3'] / 35.0) * 0.4 +
        (processed_df['voc_ppb'] / 300.0) * 0.2
    ).round(2)
    
    # Project-Defined IAQ Classification
    def classify_iaq(row):
        co2 = row['co2_ppm']
        pm25 = row['pm2_5_ug_m3']
        if co2 <= 700 and pm25 <= 35:
            return 'Good'
        elif co2 <= 1000 and pm25 <= 75:
            return 'Moderate'
        elif co2 <= 1500 and pm25 <= 150:
            return 'Poor'
        else:
            return 'Very Poor'

    processed_df['iaq_category'] = processed_df.apply(classify_iaq, axis=1)
    
    # Drop intermediate parse column
    processed_df.drop(columns=['timestamp_parsed'], inplace=True, errors='ignore')

    transformation_logs.append({
        "stage": "Feature Engineering",
        "operation": "engineered_domain_features",
        "rows_affected": len(processed_df),
        "description": "Created new analytical features: hour, is_high_occupancy, pm_ratio, ventilation_efficiency, iaq_index, and iaq_category.",
        "new_features": ["hour", "day_of_week", "is_high_occupancy", "pm_ratio", "ventilation_efficiency", "iaq_index", "iaq_category"]
    })

    # Save processed dataframe if output path requested
    if processed_output_path:
        os.makedirs(os.path.dirname(processed_output_path), exist_ok=True)
        processed_df.to_csv(processed_output_path, index=False)
        print(f"Processed dataset successfully saved to: {processed_output_path} ({len(processed_df)} rows)")

    summary_pipeline = {
        "raw_rows": len(raw_df),
        "processed_rows": len(processed_df),
        "raw_columns_count": len(raw_df.columns),
        "processed_columns_count": len(processed_df.columns),
        "logs": transformation_logs
    }

    return processed_df, summary_pipeline

if __name__ == "__main__":
    raw_path = os.path.join(os.path.dirname(__file__), "..", "data", "raw", "indoor_air_quality_raw.csv")
    proc_path = os.path.join(os.path.dirname(__file__), "..", "data", "processed", "indoor_air_quality_processed.csv")
    
    if not os.path.exists(raw_path):
        from data_generator import generate_iaq_raw_dataset
        generate_iaq_raw_dataset(num_records=5200, output_path=raw_path)
        
    raw_df = pd.read_csv(raw_path)
    run_preprocessing_pipeline(raw_df, processed_output_path=proc_path)
