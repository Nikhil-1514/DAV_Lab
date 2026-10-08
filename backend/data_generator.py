"""
Dataset Generator for Indoor Air Quality (IAQ) Analysis - Andhra Pradesh
Academic Synthetic Data Generator with Fixed Seed (SEED = 42)
"""

import os
import random
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

SEED = 42

def generate_iaq_raw_dataset(num_records: int = 5200, output_path: str = None) -> pd.DataFrame:
    np.random.seed(SEED)
    random.seed(SEED)
    
    cities = ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Tirupati', 'Kakinada', 'Nellore', 'Rajahmundry']
    room_types = ['Classroom', 'Office', 'Laboratory', 'Library', 'Bedroom', 'Living Room', 'Conference Room']
    ventilation_types = ['Natural', 'Mechanical', 'Air Conditioned', 'Mixed']
    
    # Inconsistency mappings for raw generation
    city_variants = {
        'Visakhapatnam': ['Visakhapatnam', 'visakhapatnam', 'VISAKHAPATNAM', 'Vizag', 'Visakhapatnam '],
        'Vijayawada': ['Vijayawada', 'vijayawada', 'VIJAYAWADA', 'Vijayawada '],
        'Guntur': ['Guntur', 'guntur', 'GUNTUR'],
        'Tirupati': ['Tirupati', 'tirupati', 'TIRUPATI'],
        'Kakinada': ['Kakinada', 'kakinada', 'KAKINADA'],
        'Nellore': ['Nellore', 'nellore', 'NELLORE'],
        'Rajahmundry': ['Rajahmundry', 'rajahmundry', 'RAJAHMUNDRY', 'Rajahmundry ']
    }
    
    room_variants = {
        'Classroom': ['Classroom', 'classroom', 'CLASSROOM'],
        'Office': ['Office', 'office', 'OFFICE', 'Office '],
        'Laboratory': ['Laboratory', 'laboratory', 'LABORATORY', 'Lab'],
        'Library': ['Library', 'library', 'LIBRARY'],
        'Bedroom': ['Bedroom', 'bedroom', 'BEDROOM'],
        'Living Room': ['Living Room', 'living room', 'LIVING ROOM', 'Living_Room'],
        'Conference Room': ['Conference Room', 'conference room', 'CONFERENCE ROOM', 'Conf Room']
    }
    
    ventilation_variants = {
        'Natural': ['Natural', 'natural', 'NATURAL'],
        'Mechanical': ['Mechanical', 'mechanical', 'MECHANICAL'],
        'Air Conditioned': ['Air Conditioned', 'air conditioned', 'AC', 'Air-Conditioned', 'AIR CONDITIONED'],
        'Mixed': ['Mixed', 'mixed', 'MIXED']
    }

    start_date = datetime(2026, 1, 1, 8, 0, 0)
    records = []
    
    for i in range(1, num_records + 1):
        record_id = f"IAQ-AP-{i:05d}"
        
        # Time distribution (weighted towards daytime hours)
        time_offset_minutes = int(np.random.exponential(scale=30) + (i * 18) % (75 * 24 * 60))
        current_time = start_date + timedelta(minutes=time_offset_minutes)
        hour = current_time.hour
        
        std_city = np.random.choice(cities, p=[0.22, 0.20, 0.15, 0.15, 0.10, 0.09, 0.09])
        std_room = np.random.choice(room_types, p=[0.25, 0.25, 0.12, 0.10, 0.10, 0.10, 0.08])
        std_vent = np.random.choice(ventilation_types, p=[0.30, 0.25, 0.30, 0.15])
        
        # Realistic room occupancy bounds
        if std_room == 'Classroom':
            occupancy = int(np.random.randint(15, 65) if 8 <= hour <= 17 else np.random.randint(0, 5))
        elif std_room == 'Office':
            occupancy = int(np.random.randint(2, 30) if 8 <= hour <= 18 else np.random.randint(0, 3))
        elif std_room == 'Conference Room':
            occupancy = int(np.random.choice([0, 5, 12, 25, 40], p=[0.4, 0.2, 0.2, 0.1, 0.1]))
        elif std_room == 'Library':
            occupancy = int(np.random.randint(5, 50) if 8 <= hour <= 20 else np.random.randint(0, 4))
        elif std_room == 'Laboratory':
            occupancy = int(np.random.randint(2, 20) if 8 <= hour <= 18 else np.random.randint(0, 2))
        elif std_room == 'Living Room':
            occupancy = int(np.random.randint(1, 10) if (6 <= hour <= 9 or 18 <= hour <= 23) else np.random.randint(0, 4))
        else: # Bedroom
            occupancy = int(np.random.randint(1, 4) if (21 <= hour or hour <= 7) else np.random.randint(0, 2))
            
        # Baseline CO2 dynamics (Occupancy + Ventilation influence)
        base_co2 = 415.0
        occupant_co2 = occupancy * np.random.uniform(14.0, 22.0)
        
        if std_vent == 'Natural':
            vent_factor = 1.35
        elif std_vent == 'Mixed':
            vent_factor = 1.15
        elif std_vent == 'Mechanical':
            vent_factor = 0.85
        else: # Air Conditioned
            vent_factor = 0.95 if occupancy > 10 else 0.80
            
        co2_ppm = base_co2 + (occupant_co2 * vent_factor) + np.random.normal(0, 25)
        co2_ppm = max(390.0, co2_ppm)
        
        # City background PM2.5 & PM10
        city_pm_base = {
            'Visakhapatnam': 48.0, 'Vijayawada': 52.0, 'Guntur': 45.0,
            'Tirupati': 32.0, 'Kakinada': 38.0, 'Nellore': 35.0, 'Rajahmundry': 40.0
        }[std_city]
        
        # AC filters reduce indoor PM, Natural vent brings in outdoor PM
        vent_pm_mult = {'Natural': 1.1, 'Mixed': 0.9, 'Mechanical': 0.65, 'Air Conditioned': 0.5}[std_vent]
        pm2_5 = max(4.0, city_pm_base * vent_pm_mult + np.random.normal(0, 8.0) + (occupancy * 0.3))
        pm10 = pm2_5 * np.random.uniform(1.4, 2.1) + np.random.uniform(4.0, 15.0)
        
        # Temperature & Humidity dynamics
        if std_vent == 'Air Conditioned':
            temp_c = np.random.normal(22.5, 1.2)
            humidity = np.random.normal(52.0, 4.0)
        else:
            temp_c = np.random.normal(28.5, 2.5) + (1.5 if 12 <= hour <= 16 else 0)
            is_coastal = std_city in ['Visakhapatnam', 'Kakinada', 'Nellore']
            humidity = np.random.normal(72.0 if is_coastal else 60.0, 5.0)
            
        temp_c = np.clip(temp_c, 16.0, 42.0)
        humidity = np.clip(humidity, 25.0, 95.0)
        
        # VOC & CO
        voc_base = 120.0 if std_room != 'Laboratory' else 320.0
        voc_ppb = max(40.0, voc_base + (occupancy * 4.5) * vent_factor + np.random.normal(0, 30))
        co_ppm = max(0.1, np.random.exponential(scale=0.8) + (0.4 if std_vent == 'Natural' else 0.1))

        def choose_variant(variants_list):
            if len(variants_list) == 1:
                return variants_list[0]
            # Create base weights and normalize
            weights = np.array([0.7, 0.15, 0.10, 0.03, 0.02][:len(variants_list)], dtype=float)
            weights /= weights.sum()
            return np.random.choice(variants_list, p=weights)

        raw_city = choose_variant(city_variants[std_city])
        raw_room = choose_variant(room_variants[std_room])
        raw_vent = choose_variant(ventilation_variants[std_vent])
        indoor_loc = f"{std_room} Wing-{chr(65 + (i % 4))}, Block {1 + (i % 5)}"

        records.append({
            "Record_ID": record_id,
            "Date": current_time.strftime("%Y-%m-%d"),
            "Time": current_time.strftime("%H:%M:%S"),
            "Timestamp": current_time.strftime("%Y-%m-%d %H:%M:%S"),
            "City": raw_city,
            "Room_Type": raw_room,
            "Indoor_Location": indoor_loc,
            "Occupancy": occupancy,
            "Ventilation_Type": raw_vent,
            "Temperature_C": round(temp_c, 1),
            "Relative_Humidity": round(humidity, 1),
            "CO2_ppm": round(co2_ppm, 1),
            "PM2_5_ug_m3": round(pm2_5, 1),
            "PM10_ug_m3": round(pm10, 1),
            "CO_ppm": round(co_ppm, 2),
            "VOC_ppb": round(voc_ppb, 1)
        })

    df = pd.DataFrame(records)

    # 1. INJECT MISSING VALUES (~3.5% missing in numeric & categorical columns)
    num_missing = int(len(df) * 0.035)
    for col in ['Temperature_C', 'Relative_Humidity', 'CO2_ppm', 'PM2_5_ug_m3', 'Occupancy', 'Ventilation_Type']:
        missing_indices = np.random.choice(df.index, size=num_missing, replace=False)
        df.loc[missing_indices, col] = np.nan

    # 2. INJECT NUMERIC FORMATTING INCONSISTENCIES (Strings with commas/quotes, e.g. "1,050", "920", " 450 ")
    co2_str_indices = np.random.choice(df.index[df['CO2_ppm'].notna()], size=120, replace=False)
    for idx in co2_str_indices:
        val = df.loc[idx, 'CO2_ppm']
        if val > 1000:
            df.loc[idx, 'CO2_ppm'] = f'"{int(val):,}"'
        else:
            df.loc[idx, 'CO2_ppm'] = f'"{int(val)}"'

    pm10_str_indices = np.random.choice(df.index[df['PM10_ug_m3'].notna()], size=80, replace=False)
    for idx in pm10_str_indices:
        val = df.loc[idx, 'PM10_ug_m3']
        df.loc[idx, 'PM10_ug_m3'] = f" {round(val, 1)} "

    # 3. INJECT OUTLIERS (Extreme values & sensor measurement anomalies)
    outlier_indices_co2 = np.random.choice(df.index, size=15, replace=False)
    df.loc[outlier_indices_co2, 'CO2_ppm'] = np.random.uniform(3600.0, 4900.0)

    outlier_indices_pm = np.random.choice(df.index, size=12, replace=False)
    df.loc[outlier_indices_pm, 'PM2_5_ug_m3'] = np.random.uniform(280.0, 420.0)

    outlier_indices_temp = np.random.choice(df.index, size=8, replace=False)
    df.loc[outlier_indices_temp, 'Temperature_C'] = np.random.choice([-12.5, 68.0, 75.0])

    outlier_indices_hum = np.random.choice(df.index, size=6, replace=False)
    df.loc[outlier_indices_hum, 'Relative_Humidity'] = 128.5

    # 4. INJECT DUPLICATES (~1.5% exact duplicates)
    num_duplicates = int(len(df) * 0.015)
    duplicate_rows = df.sample(n=num_duplicates, random_state=SEED)
    df = pd.concat([df, duplicate_rows], ignore_index=True)

    # Save raw file if output path is provided
    if output_path:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        df.to_csv(output_path, index=False)
        print(f"Raw dataset successfully saved to: {output_path} ({len(df)} rows)")

    return df

if __name__ == "__main__":
    target_path = os.path.join(os.path.dirname(__file__), "..", "data", "raw", "indoor_air_quality_raw.csv")
    generate_iaq_raw_dataset(num_records=5200, output_path=target_path)
