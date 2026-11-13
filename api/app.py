import os
import psycopg
from flask import Flask

app = Flask(__name__)

@app.route('/ping')
def ping():
    return 'pong'

@app.route('/db-check')
def db_check():
    database_url = os.environ["DATABASE_URL"]
    with psycopg.connect(database_url) as conn:
        res = conn.execute("SELECT 1").fetchone()
    return str(res[0])

if __name__ == '__main__':
    app.run(debug=True)

import re

def validate_order(data):
    # 1. Detail: trim first, then check empty, length, and allowed characters
    raw_detail = data.get('detail', '') or ''
    detail = str(raw_detail).strip()
    
    if not detail:
        return False, "Enter your building and unit."
    if len(detail) > 50:
        return False, "Use up to 50 characters."
    if not re.fullmatch(r'[A-Za-z0-9가-힣 ]+', detail):
        return False, "Use English letters, Korean, numbers or spaces only."

    # 2. Entry Method validation
    entry_method = str(data.get('entry_method', '') or '').strip()
    valid_methods = {'door_code', 'call', 'security_desk', 'free'}
    if entry_method not in valid_methods:
        return False, "Choose how the rider gets in."

    # 3. Entry Code validation
    entry_code = str(data.get('entry_code', '') or '').strip()
    if entry_method == 'door_code':
        if not entry_code:
            return False, "Enter the door code."
        if len(entry_code) > 20:
            return False, "Use up to 20 characters."
        if not re.fullmatch(r'[0-9#*]+', entry_code):
            return False, "Use numbers, # or * only."
    else:
        # Drop and store empty for any other method
        entry_code = ""

    # 4. Rider Note: kept as written (no trimming), length check up to 200
    rider_note = data.get('rider_note', '') or ''
    if len(rider_note) > 200:
        return False, "Use up to 200 characters."

    return True, {
        "detail": detail,
        "entry_method": entry_method,
        "entry_code": entry_code,
        "rider_note": rider_note
    }
