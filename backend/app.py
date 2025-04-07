from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
import sqlite3
import os
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

DB_PATH = "database.db"

# Allow frontend (Electron) to access the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic model for request body
class User(BaseModel):
    name: str

# Create the database file if it doesn't exist
def init_db():
    if not os.path.exists(DB_PATH):
        conn = sqlite3.connect(DB_PATH)
        conn.execute("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)")
        conn.commit()
        conn.close()

# Root endpoint - shows welcome message
@app.get("/")
def root():
    return {"message": "✅ FastAPI backend is running!"}

# Optional browser test route
@app.get("/hello", response_class=HTMLResponse)
def hello():
    return """
    <html>
        <head><title>Hello FastAPI</title></head>
        <body>
            <h1>👋 Hello from FastAPI!</h1>
            <p>Try visiting <code>/api/users</code> or use <a href="/docs">Swagger UI</a>.</p>
        </body>
    </html>
    """

# Get all users
@app.get("/api/users")
def get_users():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users")
    users = cursor.fetchall()
    conn.close()
    return [{"id": row[0], "name": row[1]} for row in users]

# Add a new user
@app.post("/api/users")
def add_user(user: User):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("INSERT INTO users (name) VALUES (?)", (user.name,))
    conn.commit()
    conn.close()
    return {"message": "User added"}

# Run the app
if __name__ == "__main__":
    import uvicorn
    init_db()
    uvicorn.run(app, host="127.0.0.1", port=5000)
