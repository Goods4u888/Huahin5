# Chiang Rai Disaster GIS — Data Source References

## Live App
- https://chiangraimonitoring-alq2.vercel.app/

## Data Sources

### 1. Windy
- Main: https://www.windy.com/
- Embed docs: https://embed.windy.com/
- API docs: https://api.windy.com/map-forecast/docs
- GitHub: https://github.com/windycom/API
- Notes: Windy API key required for production use. Current UI shows coverage area placeholder only.

### 2. Thai Meteorological Department (TMD)
- Public webservice: https://data.tmd.go.th/api/index1.php
- Main site: https://www.tmd.go.th/en/
- QGIS plugin reference: https://plugins.qgis.org/plugins/tmd/
- Notes: Public API, no key required. May block direct browser fetch due to CORS.

### 3. ThaiWater
- Main site: https://www.thaiwater.net/
- App: https://play.google.com/store/apps/details?id=mobile.nhc.thaiwater
- Notes: National Hydroinformatics data portal. Direct API access may require registration.

### 4. FloodDash / DDPM
- DDPM warnings: https://www.facebook.com/TheNationThailand/posts/
- Research PDF: https://www.hii.or.th/wp-content/uploads/2024/11/28-Development-of-Flood-Monitoring-System-from-Social-Media-in-Thailand.pdf
- NASA Sensorweb: https://ai.jpl.nasa.gov/public/projects/thailand-flood-sensorweb/
- Notes: No confirmed public FloodDash API. Placeholder uses research/known flood-risk zones.

## Project
- GitHub: https://github.com/Goods4u888/Chiangraimonitoring
