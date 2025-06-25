## curl

```
# Full health check
curl http://localhost:3000/health | jq

# Without details
curl "http://localhost:3000/health?details=false" | jq

# Liveness check (for Kubernetes)
curl http://localhost:3000/health/live | jq

# Readiness check (for Kubernetes)
curl http://localhost:3000/health/ready | jq

```
