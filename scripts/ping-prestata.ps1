# Ping périodique pour éviter la mise en veille du forfait gratuit Render.
# Lancée par la tâche planifiée Windows « Ping Prestata » toutes les 10 minutes.
try { Invoke-WebRequest -Uri "https://prestata.onrender.com/api/health" -UseBasicParsing -TimeoutSec 30 | Out-Null } catch {}