# Verification record

Date: 5 November 2026. Source: existing local working tree at audit intake, not merely baseline commit `a820401`. No dependencies were installed/upgraded and no application fixes were applied.

## Story and boundaries

The principal story is a customer choosing catalog items, reviewing a server delivery quote, creating a COD order, and seeing the persisted order in authenticated tracking. The boundaries are React cart/checkout → Axios → DRF validation → transactional commerce service → temporary SQL database → serialized response → tracking UI.

| Boundary | Actual evidence | Limit |
|---|---|---|
| Browser renders | Genuine cart, checkout, confirmation and tracking PNGs | Synthetic local fixtures |
| Client sends requests | Existing Playwright live test posts login and triggers UI quote/checkout | One tested product/address combination |
| API validates and prices | Regression tests send tampered client money, invalid quantities/products, duplicate lines and changed retry payloads | Most backend tests bypass JWT with force_authenticate |
| SQL records result | Order total 250 AFN from two 100 AFN items plus 50 AFN delivery; stock and unique retry tests | SQLite; row-lock concurrency test skipped |
| Response reaches UI | Existing browser assertion checks tracking URL, product name and total | No production deployment claim |

Other independently verified stories include TOTP setup/challenge/backup-code behavior, admin role rejection/approval tests, and the targeted security/integrity probes. The first broken boundary for each probe is documented in the audit rather than worked around in application code.

## Existing checks actually executed

- Django `check`: no issues.
- `makemigrations --check --dry-run`: no changes detected.
- Fresh migrations applied to isolated SQLite databases.
- Django `test home`: 28 discovered, 27 passed, one PostgreSQL-only test skipped.
- Frontend `npm run typecheck`: passed.
- Frontend `npm run build -- --outDir <temporary-directory>`: passed; main JS 651.73 kB, 188.04 kB gzip, large-chunk warning.
- `BAZAAR_E2E_LIVE=1 npm run test:e2e -- --reporter=line --output <temporary-directory>`: all five passed in 18.7 seconds. Four cover UI/mocked scenarios, one uses a real backend checkout.
- Thirty-six genuine full-page screenshots; initial 31-route traversal recorded no page exceptions or API errors. Supplemental captures include quote confirmation, order tracking, mobile Dari, Django admin and its user list.
- Eleven Mermaid blocks parsed and rendered successfully using Mermaid 10.9.3 transiently loaded into a blank Chromium page. No Mermaid package was installed in the repository.

Machine-readable [check results](evidence/check-results.json), [targeted API probes](evidence/api-probes.json), [diagram checks](evidence/diagram-checks.json), [screenshot manifest](evidence/screenshots.json), [model schema](evidence/model-schema.json), [API routes](evidence/api-routes.json) and [source inventory](evidence/source-inventory.json) accompany these observations.

## Isolation method

The installed `.venv-production` environment was used (Python 3.13.0, Django 5.2.18, DRF 3.17.2). Node 23.3.0 and the existing frontend node_modules/Chromium installation were used. No `pip install`, `npm install`, `npm ci`, browser download, or dependency upgrade was performed by this audit. Dependency installation commands in README are instructions for a fresh clone only.

`Bazar.test_settings` was selected before Django setup. It sets `PYTHON_DOTENV_DISABLED=1`, in-memory SQLite, local-memory mail/cache, empty cloud settings, and test-only secret material. The audit additionally changed settings.BASE_DIR and MEDIA_ROOT in the temporary process before model loading, so private-document test writes also stayed outside the repository. A representative wrapper, run from the root with the existing Python environment, is:

```python
import os
import pathlib
import sys
import tempfile

os.environ['DJANGO_SETTINGS_MODULE'] = 'Bazar.test_settings'
sys.path.insert(0, str(pathlib.Path('backend').resolve()))
from django.conf import settings
settings.BASE_DIR = pathlib.Path(tempfile.mkdtemp(prefix='bazaraf-audit-tests-'))
settings.MEDIA_ROOT = settings.BASE_DIR / 'media'
import django
django.setup()
from django.core.management import call_command
call_command('check')
call_command('makemigrations', '--check', '--dry-run')
call_command('test', 'home', interactive=False, verbosity=1)
```

Set `PYTHONIOENCODING=utf-8` in the invoking process first. The original cp1252 attempt failed on an emoji print in migration 0009. This was an actual setup portability issue; changing the invoking environment let verification continue without editing that migration.

For browser work, a separate process reused test settings but selected a newly created temporary file-backed SQLite database, allowed only localhost test hosts/CORS origins, and used local-memory email. It migrated that database and invoked the existing `seed_e2e` command with IS_E2E enabled. Additional synthetic catalog, order and review fixtures were created in that same temporary database. It did not reuse either checked-in SQLite database or the existing `.test-postgres` data.

The backend ran on `127.0.0.1:8001`, Vite on `127.0.0.1:5176` with VITE_API_URL pointing to that backend. Production credentials were never needed. API probe output records only status, shape and boolean exposure evidence; tokens, passwords, download tickets and actual environment values are not stored.

The frontend build initially failed because the Windows sandbox denied esbuild's parent-directory config lookup; the reviewed rerun succeeded. This was not recorded as an application compile failure. Build output and Playwright artifacts were directed into temporary directories to preserve existing generated output.

## Important unverified areas

PostgreSQL migrations/concurrency, distributed Redis throttles/MFA, real SMTP delivery/retries, Google sign-in, cloud media privacy, production deployment, rider collection-to-settlement, real refunds, all CRUD/form actions, complete keyboard/screen-reader/mobile coverage, and quantitative load/query budgets remain unverified. No test coverage percentage is reported. The hosted GitHub Actions workflow was inspected but its run status was not checked.

Existing tests did not catch the document link exposure, shared-order line-item leak, deletion reservation bug or commission preview failure. Those targeted probes are new audit evidence, not fixes or permanent regression tests. The next implementation stage should add tests that fail before each corresponding fix.

## Preservation and final checks

A SHA-256 baseline of 1,535 existing Git-tracked and non-ignored untracked files was captured before documentation/test writes. The final preservation comparison permits only the intentional `.gitignore` publication exclusions; all existing application/document/database contents must match their intake hashes. Generated docs/assets are new files, and local databases are retained on disk while excluded from the new repository's clean history.

Markdown/image links, screenshot/manifest correspondence, model coverage, Mermaid render results and publication file selection are checked before commit. The final chat report supplies the actual pushed commit and remote synchronization result, which cannot be embedded self-referentially in that same commit.
