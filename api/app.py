import os
import re
import secrets
from datetime import datetime, timezone
import psycopg
from flask import Flask, request, jsonify
from psycopg.rows import dict_row

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

    raw_method = data.get('entry_method', '')
    if not isinstance(raw_method, str):
        return False, "Choose how the rider gets in."
    
    entry_method = raw_method.strip()
    valid_methods = {'door_code', 'call', 'security_desk', 'free'}
    if entry_method not in valid_methods:
        return False, "Choose how the rider gets in."

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
    ok, result = validate_order(data)
    if not ok:
        return jsonify({"error": result}), 400

    raw_address_id = data.get('address_id', '')
    if not isinstance(raw_address_id, str) or not raw_address_id.strip():
        return jsonify({"error": "Select a valid delivery address."}), 400
    address_id = raw_address_id.strip()

    date_prefix = datetime.now(timezone.utc).strftime("%Y%m%d")
    order_id = f"ORD-{date_prefix}-{secrets.token_hex(3).upper()}"

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM addresses WHERE address_id = %s", (address_id,))
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

@app.route('/addresses', methods=['GET'])
def get_addresses():
    query = request.args.get('q', '').strip()
    with get_conn() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            if query:
                pattern = f"%{query}%"
                cur.execute(
                    """
                    SELECT address_id, building_type, building_name_ko, building_name_en,
                           sub_buildings, road_address_ko, road_address_en,
                           jibun_address_ko, jibun_address_en, district_ko, district_en,
                           legal_dong_ko, legal_dong_en, zip_code, lat, lng
                    FROM addresses
                    WHERE road_address_ko ILIKE %s
                       OR road_address_en ILIKE %s
                       OR jibun_address_ko ILIKE %s
                       OR jibun_address_en ILIKE %s
                       OR building_name_ko ILIKE %s
                       OR building_name_en ILIKE %s
                    ORDER BY address_id
                    """,
                    (pattern, pattern, pattern, pattern, pattern, pattern)
                )
            else:
                cur.execute(
                    """
                    SELECT address_id, building_type, building_name_ko, building_name_en,
                           sub_buildings, road_address_ko, road_address_en,
                           jibun_address_ko, jibun_address_en, district_ko, district_en,
                           legal_dong_ko, legal_dong_en, zip_code, lat, lng
                    FROM addresses
                    ORDER BY address_id
                    """
                )
            rows = cur.fetchall()
    return jsonify({"addresses": rows, "count": len(rows)}), 200

@app.route('/order', methods=['GET'])
def get_order():
    order_id = request.args.get('id', '').strip()
    if not order_id:
        return jsonify({"error": "Order ID is required."}), 400

    with get_conn() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT o.order_id, o.address_id, o.detail, o.entry_method, o.entry_code,
                       o.rider_note, o.status, o.created_at,
                       a.road_address_ko, a.road_address_en, a.building_name_ko, a.building_name_en
                FROM orders o
                JOIN addresses a ON o.address_id = a.address_id
                WHERE o.order_id = %s
                """,
                (order_id,)
            )
            row = cur.fetchone()

    if not row:
        return jsonify({"error": "Order not found."}), 404

    row["created_at"] = row["created_at"].isoformat()
    return jsonify({"order": row}), 200

@app.route('/deliver', methods=['POST'])
def deliver_order():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Invalid request."}), 400

    order_id = data.get('id') or data.get('order_id')
    if not isinstance(order_id, str) or not order_id.strip():
        return jsonify({"error": "Order ID is required."}), 400
    
    order_id = order_id.strip()

    with get_conn() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT order_id, status, delivered_at FROM orders WHERE order_id = %s", (order_id,))
            row = cur.fetchone()
            if not row:
                return jsonify({"error": "Order not found."}), 404

            if row['status'] == 'delivered':
                return jsonify({
                    "message": "Already delivered.",
                    "order_id": row['order_id'],
                    "status": row['status'],
                    "delivered_at": row['delivered_at'].isoformat() if row['delivered_at'] else None
                }), 200

            cur.execute(
                """
                UPDATE orders
                SET status = 'delivered', delivered_at = NOW()
                WHERE order_id = %s
                RETURNING order_id, status, delivered_at
                """,
                (order_id,)
            )
            updated = cur.fetchone()

    updated["delivered_at"] = updated["delivered_at"].isoformat() if updated["delivered_at"] else None
    return jsonify({
        "message": "Order marked as delivered.",
        "order": updated
    }), 200

if __name__ == '__main__':
    app.run(debug=True)
