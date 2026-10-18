#!/bin/sh
# Démarrage du conteneur : migrations → données de base → application.
set -e

# Clé secrète des sessions : si elle n'est pas fournie, on en génère une
# et on la garde dans le volume de stockage (elle survit aux redémarrages).
if [ -z "$AUTH_SECRET" ] || [ "$AUTH_SECRET" = "remplacez-par-une-longue-chaine-aleatoire" ]; then
  FICHIER_SECRET="$STORAGE_DIR/.secret-auth"
  if [ ! -f "$FICHIER_SECRET" ]; then
    node -e "console.log(require('crypto').randomBytes(32).toString('base64'))" > "$FICHIER_SECRET"
    chmod 600 "$FICHIER_SECRET"
  fi
  AUTH_SECRET=$(cat "$FICHIER_SECRET")
  export AUTH_SECRET
fi

echo "→ Mise à jour de la base de données…"
npx prisma migrate deploy

echo "→ Initialisation des données de base…"
npx tsx prisma/seed/index.ts

echo "→ Démarrage de VUCA AUTO CRM sur le port 3000"
exec npx next start -H 0.0.0.0 -p 3000
