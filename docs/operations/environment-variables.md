# Environment Variables

All variables are required unless marked optional. Never commit real values.

## API (`apps/api`)

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/salonomia` |
| `SESSION_SECRET` | Secret for signing express-session cookies (≥32 random bytes) | `$(openssl rand -hex 32)` |
| `LOCAL_STORAGE_SIGNING_SECRET` | HMAC key for signed local-storage values (≥32 random bytes) | `$(openssl rand -hex 32)` |
| `CORS_ORIGINS` | Comma-separated list of allowed CORS origins | `https://salonomia.com,https://dashboard.salonomia.com` |
| `NODE_ENV` | Runtime environment | `production` |
| `PORT` | Port the API listens on (optional, default 4000) | `4000` |
| `STORAGE_BUCKET` | S3/R2 bucket name for portfolio images | `salonomia-uploads` |
| `STORAGE_ENDPOINT` | S3-compatible endpoint URL | `https://your-account.r2.cloudflarestorage.com` |
| `STORAGE_ACCESS_KEY_ID` | S3 access key | — |
| `STORAGE_SECRET_ACCESS_KEY` | S3 secret | — |
| `STORAGE_REGION` | Bucket region | `auto` |
| `AUTH_THROTTLE_LIMIT` | Max auth attempts per minute (optional, default 10) | `10` |

## Web (`apps/web`)

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Public URL of the API, accessible from the browser | `https://api.salonomia.com` |

## Dashboard (`apps/dashboard`)

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Same as above | `https://api.salonomia.com` |

## Secret management

- Use a secrets manager (AWS Secrets Manager, Vault, Doppler) — never `.env` files in production.
- Rotate `SESSION_SECRET` causes all active sessions to invalidate — plan accordingly.
- `STORAGE_SECRET_ACCESS_KEY` should be scoped to the single bucket with `PutObject`, `GetObject`, `DeleteObject` only.
- Audit secret access in the secrets manager.
