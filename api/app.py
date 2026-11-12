import os
import psycopg2
from flask import Flask

app = Flask(__name__)

@app.route('/ping')
def ping():
    return 'pong'

@app.route('/db-test')
def db_test():
    # Retrieve DATABASE_URL from Vercel's environment settings
    database_url = os.getenv('DATABASE_URL')
    
    if not database_url:
        return "Error: DATABASE_URL environment variable is not set.", 500
    
    try:
        # Establish connection to Neon Postgres
        conn = psycopg2.connect(database_url)
        cur = conn.cursor()
        
        # Run a simple test query
        cur.execute("SELECT version();")
        db_version = cur.fetchone()
        
        cur.close()
        conn.close()
        
        return f"Successfully connected to Neon Postgres! Database version: {db_version[0]}"
    
    except Exception as e:
        return f"Connection failed: {str(e)}", 500

if __name__ == '__main__':
    app.run(debug=True)
