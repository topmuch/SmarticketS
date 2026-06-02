# SmartTicketQR — Procédures de Rollback

> Guide de retour en arrière en cas de problème après un déploiement.

---

## 🚨 Procédures d'Urgence

### 1. Rollback de l'application (Image Docker précédente)

#### Via GitHub Actions
1. Aller dans `Actions` → `SmartTicketQR CI/CD`
2. Sélectionner `Rollback to Previous Version`
3. Cliquer `Run workflow`
4. Le workflow va automatiquement revenir à l'image Docker précédente

#### Manuellement (SSH)
```bash
# Se connecter au serveur
ssh admin@VOTRE_SERVEUR

cd /opt/smartticketqr

# 1. Lister les images disponibles
docker images | grep smartticketqr

# 2. Arrêter l'application actuelle
docker compose stop app

# 3. Retrouver l'ID de l'image précédente
# La deuxième ligne = image précédente
PREV_IMAGE=$(docker images --format "{{.Repository}}:{{.Tag}} {{.ID}} {{.CreatedAt}}" | grep smartticketqr | head -2 | tail -1 | awk '{print $2}')

# 4. Modifier le tag de l'image précédente
docker tag $PREV_IMAGE smartticketqr:rollback

# 5. Forcer le redémarrage avec l'image de rollback
docker compose up -d --force-recreate app

# 6. Vérifier le health check
timeout=90
until docker compose exec -T app curl -sf http://localhost:3000/api/health > /dev/null 2>&1; do
  echo "Waiting..."
  sleep 5
  timeout=$((timeout - 5))
  if [ $timeout -le 0 ]; then
    echo "FATAL: Rollback failed!"
    docker compose logs app --tail=50
    exit 1
  fi
done

echo "Rollback successful!"
```

### 2. Rollback de la base de données (Migration cassée)

#### Restaurer le dernier backup
```bash
# 1. Arrêter l'application
docker compose stop app

# 2. Trouver le dernier backup
LATEST=$(ls -t backups/*.dump.gz | head -1)
echo "Restoring from: $LATEST"

# 3. Restaurer (écrase les données actuelles)
docker compose exec -T postgres pg_restore \
  -U smartticketqr \
  -d smartticketqr_prod \
  -c \
  --if-exists \
  "$LATEST"

# 4. Redémarrer l'application
docker compose start app

# 5. Vérifier
curl -sf https://smartticketqr.com/api/health
```

#### Annuler une migration spécifique
```bash
# 1. Voir l'historique des migrations
docker compose exec app npx prisma migrate status

# 2. Annuler la dernière migration (DANGER: peut perdre des données)
docker compose exec app npx prisma migrate resolve --rolled-back NOM_DE_LA_MIGRATION

# 3. Redémarrer l'application
docker compose restart app
```

### 3. Rollback complet (Application + Base de données)

```bash
#!/bin/bash
set -euo pipefail

echo "========================================="
echo "  FULL ROLLBACK — SmartTicketQR"
echo "========================================="

cd /opt/smartticketqr

# 1. Arrêter tout
echo "[1/5] Stopping all services..."
docker compose stop app
docker compose stop caddy

# 2. Identifier la version précédente
echo "[2/5] Finding previous Docker image..."
PREV_IMAGE=$(docker images --format "{{.ID}}" | head -2 | tail -1)
echo "  Previous image: $PREV_IMAGE"

# 3. Restaurer la DB
echo "[3/5] Restoring database from latest backup..."
LATEST=$(ls -t backups/*.dump.gz 2>/dev/null | head -1)
if [ -z "$LATEST" ]; then
    echo "ERROR: No backup found!"
    exit 1
fi
docker compose exec -T postgres pg_restore \
    -U smartticketqr -d smartticketqr_prod -c "$LATEST"

# 4. Redémarrer avec l'image précédente
echo "[4/5] Restarting with previous image..."
# Note: Adjust docker-compose to use the specific image SHA
docker compose up -d

# 5. Health check
echo "[5/5] Verifying health..."
timeout=90
until docker compose exec -T app curl -sf http://localhost:3000/api/health > /dev/null 2>&1; do
    sleep 5
    timeout=$((timeout - 5))
    if [ $timeout -le 0 ]; then
        echo "FATAL: Full rollback failed!"
        docker compose logs app --tail=100
        exit 1
    fi
done

echo "========================================="
echo "  FULL ROLLBACK COMPLETE"
echo "========================================="
```

### 4. Dernier recours — Git Revert

Si le rollback Docker échoue :

```bash
# 1. Identifier le commit problématique
git log --oneline -10

# 2. Revenir au commit précédent
git revert HEAD  # Crée un nouveau commit qui annule le dernier

# 3. Pousser la correction
git push origin main

# 4. Le pipeline CI/CD va automatiquement redéployer
```

---

## 📊 Checklist Post-Rollback

Après chaque rollback, vérifier :

- [ ] `curl -sf https://smartticketqr.com/api/health` retourne 200
- [ ] `curl -sf https://api.smartticketqr.com/api/health` retourne 200
- [ ] La connexion fonctionne (login test)
- [ ] La vente de tickets fonctionne
- [ ] Le scan QR fonctionne (PWA)
- [ ] La signalétique s'affiche (`signage.smartticketqr.com`)
- [ ] Les backups tournent correctement (vérifier logs `db-backup`)
- [ ] Les logs ne montrent pas d'erreurs critiques

---

## 📝 Post-Mortem

Après un rollback, documenter :

1. **Date et heure** du problème
2. **Symptômes** observés (erreurs, timeout, données incorrectes)
3. **Cause racine** (si identifiée)
4. **Action de rollback** effectuée
5. **Impact** (utilisateurs affectés, durée d'indisponibilité)
6. **Action corrective** pour éviter la récidive
7. **Ticket** de suivi pour la correction

Template de post-mortem :
```markdown
## Incident — [DATE]

**Début**: HH:MM (GMT)  
**Fin**: HH:MM (GMT)  
**Durée**: X minutes  
**Impact**: X utilisateurs, Y transactions affectées

### Cause racine
[Description]

### Chronologie
- HH:MM — Détection du problème (alerte / utilisateur)
- HH:MM — Début de l'investigation
- HH:MM — Déclenchement du rollback
- HH:MM — Service restauré

### Actions correctives
- [ ] [Correction 1]
- [ ] [Correction 2]

### Leçons apprises
- [Leçon 1]
- [Leçon 2]
```
