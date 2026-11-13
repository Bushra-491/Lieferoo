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
