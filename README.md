# Climate Hazard Trend Analyzer

A full-stack web application designed to analyze historical meteorological data and detect multi-decade trends in regional climate hazards (heatwaves).

---

## 1. Architecture Overview
- **Frontend:** React (Vite), Tailwind CSS, Recharts, Lucide Icons
- **Backend:** FastAPI, Pandas, NumPy, SciPy (Linear Regression)
- **Data Ingestion:** Open-Meteo Historical Weather API (`temperature_2m_max`)
- **Database / Cache:** MongoDB (keyed by rounded coordinates and historical date range)

---

## 2. Climate Hazard Logic & Domain Methodology
- **Threshold Determination ($T_{95}$):** Calculates the local 95th percentile baseline of daily maximum temperatures across the selected multi-decade period.
- **Heatwave Event Criteria:** Any continuous run of $\ge 3$ consecutive days exceeding the local 95th percentile threshold.
- **Trend Detection:**
  - Annual counts and total heatwave days are aggregated across the timeline.
  - Linear regression ($y = mx + c$) is applied via `scipy.stats.linregress` to compute the rate of change ($\text{slope}$) and statistical significance ($p$-value < 0.05).
  - Summary findings compute the percentage shift between the earliest 5-year baseline window and the most recent 5-year observation window.

---

## 3. Assumptions & Real-World Data Handling
- **Missing Data:** Rows containing null/NaN records from the meteorological stream are dropped using `dropna()` to prevent skewed quantile boundaries.
- **Rate-Limiting & Caching:** Coordinates are rounded to 2 decimal places (~1.1 km resolution) to maximize cache hits in MongoDB and reduce upstream API overhead.
- **Zero-Event Edge Cases:** Regions or windows with 0 baseline events default to absolute frequency metrics to avoid division-by-zero errors.

---

## 4. AI Tools Used
- **Gemini:** Assisted with formulating the vector run-length streak grouping logic in Pandas (`(df['is_extreme'] != df['is_extreme'].shift()).cumsum()`) and structuring Recharts responsive grid layouts.

---

## 5. Potential Enhancements (With More Time)
- Implement interactive bounding-box polygon drawing using Leaflet.
- Support multi-hazard indexing: Drought (SPI / SPEI) and extreme precipitation events.
- Automated PDF report generation with embedded chart snapshots.