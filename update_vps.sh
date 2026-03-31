#!/bin/bash
VPS_IP="45.90.237.197"
VPS_USER="root"

echo "Syncing files to VPS..."
rsync -avz -e "ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null" \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=.git \
  --exclude=.opencode \
  --exclude=designs/ \
  --exclude=*.md \
  --exclude=.env \
  --exclude=update_vps.sh \
  ./ $VPS_USER@$VPS_IP:/srv/border-control-game/app/

echo "Rebuilding and restarting on VPS..."
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $VPS_USER@$VPS_IP "cd /srv/border-control-game/app && docker compose build && docker compose up -d"
echo "Update complete."
