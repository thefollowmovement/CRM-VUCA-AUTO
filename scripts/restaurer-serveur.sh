#!/usr/bin/env bash
# =====================================================================
#  VUCA AUTO CRM — restauration d'une sauvegarde (serveur sans Docker)
#  En root :
#    bash /opt/vuca-crm/app/scripts/restaurer-serveur.sh              → liste les sauvegardes
#    bash /opt/vuca-crm/app/scripts/restaurer-serveur.sh 2026-10-20_033000
#  Remplace la base et les fichiers ACTUELS par ceux de la sauvegarde choisie.
#  Par sécurité, une sauvegarde de l'état actuel est faite juste avant.
# =====================================================================
set -euo pipefail

DOSSIER="${VUCA_SAUVEGARDES:-/var/backups/vuca-crm}"
BASE="${VUCA_BASE:-vuca_crm}"
ROLE_BASE="${VUCA_ROLE:-$BASE}"
STOCKAGE="${VUCA_STOCKAGE:-/var/lib/vuca-crm/storage}"
SERVICE="${VUCA_SERVICE:-vuca-crm}"
UTILISATEUR_SYS="${VUCA_UTILISATEUR:-vuca-crm}"
ICI="$(cd "$(dirname "$0")" && pwd)"

if [[ $# -eq 0 ]]; then
  echo "Sauvegardes disponibles (de la plus récente à la plus ancienne) :"
  ls -1t "$DOSSIER"/base-*.dump 2>/dev/null | sed -E 's#.*/base-(.*)\.dump#  \1#' || echo "  (aucune)"
  echo
  echo "Pour restaurer : bash $0 <date ci-dessus>"
  exit 0
fi

H="$1"
DUMP="$DOSSIER/base-$H.dump"
ARCHIVE="$DOSSIER/fichiers-$H.tar.gz"
[[ -f "$DUMP" ]] || { echo "Sauvegarde introuvable : $DUMP"; exit 1; }

echo "Vous allez remplacer la base et les fichiers actuels par la sauvegarde du $H."
read -r -p "Tapez « oui » pour continuer : " REPONSE
[[ "$REPONSE" == "oui" ]] || { echo "Annulé, rien n'a été modifié."; exit 0; }

echo "→ Sauvegarde de l'état actuel (au cas où)…"
bash "$ICI/sauvegarde-serveur.sh" >/dev/null

echo "→ Arrêt de l'application…"
systemctl stop "$SERVICE" 2>/dev/null || true

echo "→ Restauration de la base…"
# Le fichier est ouvert par root puis transmis : le dossier des sauvegardes reste réservé à root.
(cd /tmp && runuser -u postgres -- pg_restore --clean --if-exists --no-owner --role="$ROLE_BASE" -d "$BASE") <"$DUMP"

if [[ -f "$ARCHIVE" ]]; then
  echo "→ Restauration des fichiers…"
  ANCIEN="$STOCKAGE.avant-restauration-$(date +%Y%m%d%H%M)"
  mv "$STOCKAGE" "$ANCIEN"
  mkdir -p "$STOCKAGE"
  tar -xzf "$ARCHIVE" -C "$STOCKAGE"
  chown -R "$UTILISATEUR_SYS:$UTILISATEUR_SYS" "$STOCKAGE" 2>/dev/null || true
  echo "   (anciens fichiers gardés dans $ANCIEN — à supprimer quand tout est vérifié)"
fi

echo "→ Redémarrage de l'application…"
systemctl start "$SERVICE" 2>/dev/null || true
echo "Restauration terminée."
