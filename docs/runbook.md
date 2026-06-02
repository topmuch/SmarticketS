# SmartTicketQR — Runbook d'Exploitation

> Guide opérationnel pour l'administration quotidienne de SmartTicketQR en production.

---

## 📋 Table des matières

1. [Architecture](#architecture)
2. [Démarrage / Arrêt](#démarrage--arrêt)
3. [Base de données](#base-de-données)
4. [Redis](#redis)
5. [Migrations](#migrations)
6. [Backups](#backups)
7. [Logs](#logs)
8. [Monitoring](#monitoring)
9. [Onboarding Transporteur](#onboarding-transporteur)
10. [Procédures Courantes](#procédures-courantes)
11. [Contacts & Escalade](#contacts--escalade)

---

## Architecture

```
                    ┌─────────────┐
                    │   Internet  │
                    └──────┬──────┘
                           │
              ┌────────────▼────────────┐
              │   Caddy (Reverse Proxy) │
              │   Port 80/443/443/udp   │
              │   TLS 1.3, HTTP/3       │
              └──────┬─────────┬────────┘
                     │         │
       ┌─────────────┘         └──────────────┐
       │                                       │
┌──────▼──────┐                    ┌──────────▼─────────┐
│ smartticketqr.com               │ signage.smartticketqr.com
│ (Landing+Admin+PWA)             │ (Écrans gare)       │
└──────┬──────┘                    └──────────┬─────────┘
       │                                       │
       └───────────────┬───────────────────────┘
                       │
              ┌────────▼────────┐
              │  Next.js App    │
              │  Port 3000      │
              │  (API + SSR)    │
              └───┬────────┬───┘
                  │        │
         ┌────────▼──┐  ┌─▼──────┐
         │ PostgreSQL │  │ Redis   │
         │ Port 5432  │  │ Port    │
         │            │  │ 6379    │
         └────────────┘  └─────────┘
```

## Démarrage / Arrêt

### Démarrer tous les services
```bash
cd /opt/smartticketqr
docker compose up -d
```

### Arrêter tous les services
```bash
docker compose down
```

### Redémarrer un service spécifique
```bash
docker compose restart app
docker compose restart caddy
```

### Voir l'état des services
```bash
docker compose ps
```

### Voir les logs en temps réel
```bash
# Tous les services
docker compose logs -f

# Un service spécifique
docker compose logs -f app
docker compose logs -f caddy

# 100 dernières lignes
docker compose logs --tail=100 app
```

## Base de données

### Accéder à PostgreSQL
```bash
docker compose exec postgres psql -U smartticketqr -d smartticketqr_prod
```

### Commandes utiles dans psql
```sql
-- Taille de la base
SELECT pg_size_pretty(pg_database_size('smartticketqr_prod'));

-- Nombre de tables
SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';

-- Listes des indexes
\di+

-- Top 10 des tables par taille
SELECT relname AS table, pg_size_pretty(pg_total_relation_size(relid)) AS size
FROM pg_stat_user_tables ORDER BY pg_total_relation_size(relid) DESC LIMIT 10;

-- Connexions actives
SELECT count(*) FROM pg_stat_activity WHERE datname = 'smartticketqr_prod';

-- Verrouiller les tables actives
SELECT locktype, relation::regclass, mode, pid
FROM pg_locks WHERE NOT granted;
```

### Vérifier l'intégrité
```bash
docker compose exec postgres psql -U smartticketqr -d smartticketqr_prod -c "SELECT count(*) FROM _prisma_migrations;"
```

## Redis

### Accéder à Redis CLI
```bash
docker compose exec redis redis-cli -a YOUR_REDIS_PASSWORD
```

### Commandes utiles
```bash
# Statistiques
INFO stats
INFO memory
INFO clients

# Nombre de clés
DBSIZE

# Lister les clés par pattern
KEYS stqr:*

# Vider le cache (ATTENTION)
FLUSHDB
```

## Migrations

### Appliquer les migrations en attente
```bash
docker compose exec app npx prisma migrate deploy
```

### Créer une nouvelle migration (dev uniquement)
```bash
docker compose exec app npx prisma migrate dev --name description_de_la_migration
```

### Statut des migrations
```bash
docker compose exec app npx prisma migrate status
```

### Régénérer le client Prisma
```bash
docker compose exec app npx prisma generate
```

## Backups

### Backup manuel
```bash
./scripts/backup-db.sh
```

### Backup via Docker
```bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
docker compose exec postgres pg_dump -U smartticketqr smartticketqr_prod -F c -b | gzip > "backups/manual_${TIMESTAMP}.dump.gz"
```

### Restaurer un backup
```bash
# Arrêter l'application
docker compose stop app

# Restaurer
docker compose exec -T postgres pg_restore -U smartticketqr -d smartticketqr_prod -c backups/STQR_YYYYMMDD.dump.gz

# Redémarrer
docker compose start app
```

### Vérifier les backups
```bash
ls -lh backups/
find backups/ -name "*.dump.gz" -mtime +30  # Backups de plus de 30 jours
```

### Rotation automatique
Les backups de plus de 30 jours sont supprimés automatiquement par le service `db-backup` dans docker-compose.

## Logs

### Logs Caddy (accès)
```bash
docker compose exec caddy cat /var/log/caddy/access.log | tail -20
```

### Logs Caddy (API)
```bash
docker compose exec caddy cat /var/log/caddy/api-access.log | tail -20
```

### Logs Next.js
```bash
docker compose logs -f app --since 1h
```

### Logs PostgreSQL
```bash
docker compose logs -f postgres --since 1h
```

### Rotation
- Caddy: rotation automatique (100 Mo max, 5 fichiers conservés)
- Docker: `docker system prune -af --volumes` (hebdomadaire)

## Monitoring

### Health Check
```bash
./scripts/health-check.sh
./scripts/health-check.sh --verbose
```

### Vérification manuelle
```bash
# Santé de l'API
curl -sf https://smartticketqr.com/api/health | jq .

# Vérifier TLS
curl -I https://smartticketqr.com | grep -i "strict\|hsts\|HTTP/"

# Temps de réponse
curl -o /dev/null -s -w "%{time_total}s\n" https://smartticketqr.com/api/health
```

### Métriques Docker
```bash
docker stats --no-stream
docker system df
```

### Sentry (si configuré)
1. Accéder au dashboard Sentry
2. Vérifier les erreurs des dernières 24h
3. Créer des alertes sur les erreurs critiques

## Onboarding Transporteur

### Procédure de création d'un tenant

1. **Créer le tenant** (Super Admin)
   - Se connecter en tant que Super Admin
   - Aller dans `Administration → Transporteurs`
   - Cliquer `+ Nouveau transporteur`
   - Remplir: nom, contact, téléphone, email
   - Configurer les paramètres: devise, fuseau horaire, logos

2. **Créer l'administrateur du transporteur**
   - Menu `Administration → Personnel`
   - Sélectionner le tenant
   - Créer un compte `ADMIN` avec email personnel
   - Envoyer les identifiants via WhatsApp sécurisé

3. **Configurer les gares et lignes**
   - Gares: `Configuration → Gares`
   - Lignes: `Configuration → Lignes`
   - Départs: `Exploitation → Départs`

4. **Configurer les tarifs**
   - Tickets: `Configuration → Tarifs tickets`
   - Colis: `Configuration → Tarifs colis`

5. **Former les équipes**
   - Guichetiers: formation à la vente de tickets et enregistrement colis
   - Contrôleurs: formation au scan QR (PWA) et contrôle billets
   - Chauffeurs: formation à la confirmation livraison colis

6. **Activer la signalétique**
   - Configurer les écrans dans `Signalétique → Tableaux`
   - Vérifier l'affichage sur `signage.smartticketqr.com/board/{stationId}`

## Procédures Courantes

### Ajouter un utilisateur staff
```bash
# Via l'interface Admin → Personnel
# Ou via l'API:
curl -X POST https://api.smartticketqr.com/api/admin/staff \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"name":"...", "email":"...", "role":"OPERATOR", "tenantId":"..."}'
```

### Réinitialiser un mot de passe
- L'utilisateur peut utiliser "Mot de passe oublié" sur l'écran de connexion
- Admin peut réinitialiser via `Administration → Personnel → Réinitialiser`

### Vider le cache Redis
```bash
docker compose exec redis redis-cli -a YOUR_PASSWORD FLUSHDB
```

### Mettre à jour l'application
```bash
cd /opt/smartticketqr
git pull origin main
docker compose build --no-cache app
docker compose up -d --no-deps app
```

### Diagnostic rapide
```bash
# Vérifier tous les services
docker compose ps

# Tester la DB
docker compose exec postgres psql -U smartticketqr -d smartticketqr_prod -c "SELECT 1;"

# Tester Redis
docker compose exec redis redis-cli -a YOUR_PASSWORD ping

# Tester l'API
curl -sf http://localhost:3000/api/health
```

## Contacts & Escalade

| Rôle | Contact |
|------|---------|
| Support technique | support@smartticketqr.com |
| Support WhatsApp | +221 76 698 85 85 |
| Admin système | (configuré dans .env.production) |
| Hébergeur | (configuration serveur) |

### Heures de support
- Lundi - Samedi : 08h00 - 20h00 (GMT)
- Dimanche : 09h00 - 14h00 (GMT)
- Urgences : disponible 24/7 via WhatsApp
