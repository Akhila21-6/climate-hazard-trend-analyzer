import os
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
import pandas as pd
import numpy as np
from scipy import stats
from pymongo import MongoClient

app = FastAPI(title="Climate Hazard Analyzer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connect to MongoDB (fallback gracefully if no external URI provided)
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000)
    db = client["climate_db"]
    cache_col = db["hazard_cache"]
except Exception:
    cache_col = None

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.get("/api/analyze")
async def analyze_hazard(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    start_year: int = Query(1990, ge=1950, le=2024),
    end_year: int = Query(2023, ge=1951, le=2025)
):
    if start_year >= end_year:
        raise HTTPException(status_code=400, detail="Start year must be earlier than end year.")

    cache_key = f"{round(lat, 2)}_{round(lon, 2)}_{start_year}_{end_year}"
    
    # Check cache if DB is available
    if cache_col is not None:
        try:
            cached_doc = cache_col.find_one({"_id": cache_key})
            if cached_doc:
                return cached_doc["data"]
        except Exception:
            pass

    # 1. Fetch weather observations from Open-Meteo
    url = (
        f"https://archive-api.open-meteo.com/v1/archive?"
        f"latitude={lat}&longitude={lon}&start_date={start_year}-01-01&end_date={end_year}-12-31"
        f"&daily=temperature_2m_max&timezone=auto"
    )

    async with httpx.AsyncClient(timeout=45.0) as http_client:
        resp = await http_client.get(url)
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to retrieve weather data from Open-Meteo.")
        raw_data = resp.json()

    daily = raw_data.get("daily", {})
    dates = daily.get("time", [])
    temps = daily.get("temperature_2m_max", [])

    df = pd.DataFrame({"date": pd.to_datetime(dates), "tmax": temps}).dropna()
    if df.empty:
        raise HTTPException(status_code=404, detail="No historical records returned for this region.")

    # 2. Heatwave Logic: 95th Percentile threshold & 3+ consecutive days
    threshold = float(np.percentile(df["tmax"], 95))
    df["is_extreme"] = df["tmax"] >= threshold

    # Group runs of consecutive extreme days
    df["run_id"] = (df["is_extreme"] != df["is_extreme"].shift()).cumsum()
    events = []
    for _, group in df[df["is_extreme"]].groupby("run_id"):
        if len(group) >= 3:
            events.append({
                "start": group["date"].iloc[0].strftime("%Y-%m-%d"),
                "end": group["date"].iloc[-1].strftime("%Y-%m-%d"),
                "year": int(group["date"].iloc[0].year),
                "duration": len(group),
                "max_temp": round(float(group["tmax"].max()), 2),
                "avg_temp": round(float(group["tmax"].mean()), 2)
            })

    # 3. Aggregations & Linear Regression Trend
    all_years = list(range(start_year, end_year + 1))
    yearly_df = pd.DataFrame({"year": all_years})

    if events:
        ev_df = pd.DataFrame(events)
        counts = ev_df.groupby("year").size().reset_index(name="event_count")
        days = ev_df.groupby("year")["duration"].sum().reset_index(name="heatwave_days")
        yearly_df = yearly_df.merge(counts, on="year", how="left").merge(days, on="year", how="left").fillna(0)
    else:
        yearly_df["event_count"] = 0
        yearly_df["heatwave_days"] = 0

    slope, intercept, r_value, p_value, _ = stats.linregress(yearly_df["year"], yearly_df["event_count"])

    # 4. Plain-language Insight Summary
    first_window = yearly_df["event_count"].head(5).mean()
    last_window = yearly_df["event_count"].tail(5).mean()
    if first_window > 0:
        pct_change = round(((last_window - first_window) / first_window) * 100, 1)
        direction = "increased" if pct_change >= 0 else "decreased"
        insight = f"Heatwave frequency has {direction} by {abs(pct_change)}% comparing baseline years ({start_year}–{start_year+4}) to recent years ({end_year-4}–{end_year})."
    else:
        insight = f"Heatwaves occurred at an average rate of {round(last_window, 1)} events/year across the latest 5-year period."

    response_payload = {
        "metadata": {
            "lat": lat,
            "lon": lon,
            "start_year": start_year,
            "end_year": end_year,
            "threshold_c": round(threshold, 2),
            "total_events": len(events)
        },
        "trends": {
            "slope": round(float(slope), 4),
            "p_value": round(float(p_value), 4),
            "statistically_significant": bool(p_value < 0.05),
            "insight": insight
        },
        "yearly_records": yearly_df.to_dict(orient="records"),
        "recent_events": events[-10:]
    }

    if cache_col is not None:
        try:
            cache_col.insert_one({"_id": cache_key, "data": response_payload})
        except Exception:
            pass

    return response_payload