import os
import re
import secrets
from datetime import datetime, timezone
import psycopg
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/ping')
def ping():
    return 'pong'

def get_conn():
    return psycopg.connect(os.environ["DATABASE_URL"])

@app.route('/db-check')
def db_check():
    with get_conn() as conn:
        res = conn.execute("SELECT 1").fetchone()
    return str(res[0])

def validate_order(data):
    if not isinstance(data, dict):
        return False, "Invalid request."

    # 1. Detail
    raw_detail = data.get('detail', '')
    if not isinstance(raw_detail, str):
        return False, "Use English letters, Korean, numbers or spaces only."
    
    detail = raw_detail.strip()
    if not detail:
        return False, "Enter your building and unit."
    if len(detail) > 50:
        return False, "Use up to 50 characters."
    if not re.fullmatch(r'[A-Za-z0-9가-힣 ]+', detail):
        return False, "Use English letters, Korean, numbers or spaces only."

    # 2. Entry Method
    raw_method = data.get('entry_method', '')
    if not isinstance(raw_method, str):
        return False, "Choose how the rider gets in."
    
    entry_method = raw_method.strip()
    valid_methods = {'door_code', 'call', 'security_desk', 'free'}
    if entry_method not in valid_methods:
        return False, "Choose how the rider gets in."

    # 3. Entry Code
    raw_code = data.get('entry_code', '')
    if not isinstance(raw_code, str):
        raw_code = str(raw_code) if raw_code is not None else ''
        
    entry_code = raw_code.strip()
    if entry_method == 'door_code':
        if not entry_code:
            return False, "Enter the door code."
        if len(entry_code) > 20:
            return False, "Use up to 20 characters."
        if not re.fullmatch(r'[0-9#*]+', entry_code):
            return False, "Use numbers, # or * only."
    else:
        entry_code = ""

    # 4. Rider Note
    rider_note = data.get('rider_note', '')
    if rider_note is None:
        rider_note = ''
    if not isinstance(rider_note, str):
        return False, "Use up to 200 characters."
    if len(rider_note) > 200:
        return False, "Use up to 200 characters."

    return True, {
        "detail": detail,
        "entry_method": entry_method,
        "entry_code": entry_code,
        "rider_note": rider_note
    }

@app.route('/orders', methods=['POST'])
def create_order():
    data = request.get_json(silent=True)

    # 1. Validate order fields first
    ok, result = validate_order(data)
    if not ok:
        return jsonify({"error": result}), 400

    # 2. Check address_id presence and format
    raw_address_id = data.get('address_id', '')
    if not isinstance(raw_address_id, str) or not raw_address_id.strip():
        return jsonify({"error": "Select a valid delivery address."}), 400
    address_id = raw_address_id.strip()

    # 3. Verify address_id exists in Neon and insert order
    date_prefix = datetime.now(timezone.utc).strftime("%Y%m%d")
    order_id = f"ORD-{date_prefix}-{secrets.token_hex(3).upper()}"

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT 1 FROM addresses WHERE address_id = %s",
                (address_id,)
            )
            if cur.fetchone() is None:
                return jsonify({"error": "Selected address does not exist."}), 400

            cur.execute(
                """
                INSERT INTO orders (order_id, address_id, detail, entry_method, entry_code, rider_note, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    order_id,
                    address_id,
                    result["detail"],
                    result["entry_method"],
                    result["entry_code"],
                    result["rider_note"],
                    "delivering"
                )
            )

    return jsonify({"order_id": order_id}), 201

if __name__ == '__main__':
    app.run(debug=True)
