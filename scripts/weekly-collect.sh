#!/bin/bash
set -euo pipefail

# --- Configuration ---
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPORT_DATE="$(date -u '+%Y-%m-%d')"
LOG_DIR="${PROJECT_ROOT}/scripts/logs"
LOG_FILE="${LOG_DIR}/weekly-collect-${REPORT_DATE}.log"
CONFLUENCE_PAGE_ID="385791717"
CONFLUENCE_DB_ID="385462031"
CONFLUENCE_BASE="https://redhat.atlassian.net/wiki"

# --- Setup logging ---
mkdir -p "$LOG_DIR"
exec > >(tee -a "$LOG_FILE") 2>&1
echo "=== PatternFly Analytics Collection: ${REPORT_DATE} ==="
echo "Started at: $(date)"

# --- Load environment ---
if [ -f "${PROJECT_ROOT}/.env" ]; then
    set -a
    source "${PROJECT_ROOT}/.env"
    set +a
else
    echo "ERROR: .env file not found at ${PROJECT_ROOT}/.env"
    echo "Create it with GITHUB_TOKEN, CONFLUENCE_EMAIL, and CONFLUENCE_API_TOKEN"
    exit 1
fi

# --- Validate prerequisites ---
if [ -z "${GITHUB_TOKEN:-}" ]; then
    echo "ERROR: GITHUB_TOKEN is not set in .env"
    exit 1
fi

if ! command -v node &>/dev/null; then
    echo "ERROR: node not found in PATH"
    exit 1
fi

if [ ! -d "${PROJECT_ROOT}/node_modules" ]; then
    echo "ERROR: node_modules not found. Run 'npm install' first."
    exit 1
fi

if [ ! -d "${PROJECT_ROOT}/.venv" ]; then
    echo "ERROR: Python venv not found at .venv/"
    echo "Create it with: python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

# --- Phase 1: Collect stats ---
echo ""
echo "--- Phase 1: Collecting PatternFly stats ---"
cd "$PROJECT_ROOT"
node src/static-analysis/cli.js collect -j -d

if [ ! -f "stats-static/${REPORT_DATE}/_all_product_uses.json" ]; then
    echo "ERROR: Collection failed — stats-static/${REPORT_DATE}/_all_product_uses.json not found"
    exit 1
fi
echo "Collection complete."

# --- Phase 2: Generate Excel report ---
echo ""
echo "--- Phase 2: Generating Excel report ---"
source "${PROJECT_ROOT}/.venv/bin/activate"
python3 to_xls.py
deactivate

if [ ! -f "reports/${REPORT_DATE}/pf_report.xlsx" ]; then
    echo "ERROR: Excel generation failed — reports/${REPORT_DATE}/pf_report.xlsx not found"
    exit 1
fi
echo "Excel report generated."

# --- Phase 3: Create zip ---
echo ""
echo "--- Phase 3: Creating zip archive ---"
ZIP_NAME="pf-analytics-${REPORT_DATE}.zip"
zip -r "$ZIP_NAME" \
    "reports/${REPORT_DATE}/pf_report.xlsx" \
    "stats-static/${REPORT_DATE}/"

if [ ! -f "$ZIP_NAME" ]; then
    echo "ERROR: Failed to create zip file"
    exit 1
fi
ZIP_SIZE=$(du -h "$ZIP_NAME" | cut -f1)
echo "Created ${ZIP_NAME} (${ZIP_SIZE})"

# --- Phase 4: Upload to Confluence ---
UPLOAD_SUCCESS=false
if [ -z "${CONFLUENCE_EMAIL:-}" ] || [ -z "${CONFLUENCE_API_TOKEN:-}" ]; then
    echo "WARNING: Confluence credentials not set in .env — skipping upload"
    echo "Set CONFLUENCE_EMAIL and CONFLUENCE_API_TOKEN to enable uploads"
else
    echo ""
    echo "--- Phase 4: Uploading to Confluence ---"

    UPLOAD_RESPONSE=$(curl -s -w "\n%{http_code}" \
        -X PUT \
        -u "${CONFLUENCE_EMAIL}:${CONFLUENCE_API_TOKEN}" \
        -H "X-Atlassian-Token: nocheck" \
        -F "file=@${ZIP_NAME}" \
        "${CONFLUENCE_BASE}/rest/api/content/${CONFLUENCE_PAGE_ID}/child/attachment")

    HTTP_CODE=$(echo "$UPLOAD_RESPONSE" | tail -1)
    RESPONSE_BODY=$(echo "$UPLOAD_RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
        echo "Upload successful (HTTP ${HTTP_CODE})"
        UPLOAD_SUCCESS=true

        # Add a row to the reports table on the page
        echo "Adding table row to page..."

        PAGE_RESPONSE=$(curl -s -w "\n%{http_code}" \
            -u "${CONFLUENCE_EMAIL}:${CONFLUENCE_API_TOKEN}" \
            "${CONFLUENCE_BASE}/rest/api/content/${CONFLUENCE_PAGE_ID}?expand=body.storage,version")

        PAGE_CODE=$(echo "$PAGE_RESPONSE" | tail -1)
        PAGE_DATA=$(echo "$PAGE_RESPONSE" | sed '$d')

        if [ "$PAGE_CODE" -lt 200 ] || [ "$PAGE_CODE" -ge 300 ]; then
            echo "WARNING: Could not fetch page data (HTTP ${PAGE_CODE})"
            echo "Response: ${PAGE_DATA}"
        else
            UPDATE_PAYLOAD=$(echo "$PAGE_DATA" | REPORT_DATE="$REPORT_DATE" PAGE_ID="$CONFLUENCE_PAGE_ID" ZIP_NAME="$ZIP_NAME" python3 -c "
import json, sys, os
data = json.load(sys.stdin)
version = data['version']['number']
body = data['body']['storage']['value']
date = os.environ['REPORT_DATE']
page_id = os.environ['PAGE_ID']
zip_name = os.environ['ZIP_NAME']
marker = '</tbody></table>'
if marker not in body:
    print('ERROR: Page does not contain expected table structure', file=sys.stderr)
    sys.exit(1)
new_row = '<tr><td><p>' + date + '</p></td><td><p><a href=\"/wiki/download/attachments/' + page_id + '/' + zip_name + '\">' + zip_name + '</a></p></td></tr>'
body = body.replace(marker, new_row + marker)
payload = {
    'version': {'number': version + 1},
    'type': 'page',
    'title': data['title'],
    'body': {'storage': {'value': body, 'representation': 'storage'}}
}
print(json.dumps(payload))
") || {
                echo "WARNING: Failed to build page update payload — skipping table row addition"
                UPDATE_PAYLOAD=""
            }

            if [ -n "$UPDATE_PAYLOAD" ]; then
                UPDATE_RESPONSE=$(curl -s -w "\n%{http_code}" \
                    -X PUT \
                    -u "${CONFLUENCE_EMAIL}:${CONFLUENCE_API_TOKEN}" \
                    -H "Content-Type: application/json" \
                    -d "$UPDATE_PAYLOAD" \
                    "${CONFLUENCE_BASE}/rest/api/content/${CONFLUENCE_PAGE_ID}")

                UPDATE_CODE=$(echo "$UPDATE_RESPONSE" | tail -1)
                UPDATE_BODY=$(echo "$UPDATE_RESPONSE" | sed '$d')
                if [ "$UPDATE_CODE" -ge 200 ] && [ "$UPDATE_CODE" -lt 300 ]; then
                    echo "Download link added to page."
                else
                    echo "WARNING: Could not update page body (HTTP ${UPDATE_CODE})"
                    echo "Response: ${UPDATE_BODY}"
                fi
            fi
        fi
    else
        echo "WARNING: Upload failed (HTTP ${HTTP_CODE})"
        echo "Response: ${RESPONSE_BODY}"
        echo "You can manually upload ${ZIP_NAME} to:"
        echo "  ${CONFLUENCE_BASE}/spaces/USEREXPDES/pages/${CONFLUENCE_PAGE_ID}"
    fi

    # --- Phase 5: Confluence Database entry ---
    if [ "$UPLOAD_SUCCESS" = true ]; then
        echo ""
        echo "--- Phase 5: Confluence Database entry ---"

        # Probe the database API to see if entries endpoint is available
        DB_PROBE=$(curl -s -w "\n%{http_code}" \
            -u "${CONFLUENCE_EMAIL}:${CONFLUENCE_API_TOKEN}" \
            "${CONFLUENCE_BASE}/api/v2/databases/${CONFLUENCE_DB_ID}")

        DB_PROBE_CODE=$(echo "$DB_PROBE" | tail -1)

        if [ "$DB_PROBE_CODE" -ge 200 ] && [ "$DB_PROBE_CODE" -lt 300 ]; then
            echo "Database API accessible. Attempting to add entry..."

            DB_ENTRY_RESPONSE=$(curl -s -w "\n%{http_code}" \
                -X POST \
                -u "${CONFLUENCE_EMAIL}:${CONFLUENCE_API_TOKEN}" \
                -H "Content-Type: application/json" \
                -d "{\"title\": \"${REPORT_DATE} Analytics Report\", \"date\": \"${REPORT_DATE}\"}" \
                "${CONFLUENCE_BASE}/api/v2/databases/${CONFLUENCE_DB_ID}/entries")

            DB_ENTRY_CODE=$(echo "$DB_ENTRY_RESPONSE" | tail -1)
            DB_ENTRY_BODY=$(echo "$DB_ENTRY_RESPONSE" | sed '$d')

            if [ "$DB_ENTRY_CODE" -ge 200 ] && [ "$DB_ENTRY_CODE" -lt 300 ]; then
                echo "Database entry added successfully."
            else
                echo "NOTE: Could not add database entry (HTTP ${DB_ENTRY_CODE})"
                echo "Response: ${DB_ENTRY_BODY}"
                echo "Manual step: Add entry at ${CONFLUENCE_BASE}/spaces/USEREXPDES/database/${CONFLUENCE_DB_ID}"
            fi
        else
            echo "NOTE: Confluence Database API not available (HTTP ${DB_PROBE_CODE})"
            echo "Manual step: Add entry at ${CONFLUENCE_BASE}/spaces/USEREXPDES/database/${CONFLUENCE_DB_ID}"
        fi
    else
        echo "Skipping database entry — upload did not succeed."
    fi
fi

# --- Cleanup ---
if [ "$UPLOAD_SUCCESS" = true ]; then
    rm -f "$ZIP_NAME"
else
    echo "Zip file retained at: ${PROJECT_ROOT}/${ZIP_NAME}"
fi

echo ""
echo "=== Collection complete at $(date) ==="
echo "Stats:  stats-static/${REPORT_DATE}/"
echo "Report: reports/${REPORT_DATE}/pf_report.xlsx"
echo "Log:    ${LOG_FILE}"
