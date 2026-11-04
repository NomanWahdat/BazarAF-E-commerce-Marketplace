#!/usr/bin/env bash
set -euo pipefail
pip install -r requirements.txt
python manage.py collectstatic --noinput
# Migrations run once as the Railway pre-deploy command.
