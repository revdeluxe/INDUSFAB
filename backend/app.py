from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
import sqlite3
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
import os
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

DB_PATH = "quotation.db"

# Database URL (this should be adjusted according to your setup)
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

# Create the database engine and sessionmaker
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Dependency to get the database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change to specific origin in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class Component(BaseModel):
    name: str
    description: str
    unit_price: float

class Quote(BaseModel):
    client_name: str
    date: str
    notes: str
    items: list

def init_db():
    """Initialize the database, creating tables if they don't exist"""
    if not os.path.exists(DB_PATH):
        conn = sqlite3.connect(DB_PATH)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS components (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                description TEXT,
                unit_price REAL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS quotes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_name TEXT,
                date TEXT,
                notes TEXT
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS quote_items (
                quote_id INTEGER,
                component_id INTEGER,
                quantity INTEGER,
                FOREIGN KEY(quote_id) REFERENCES quotes(id),
                FOREIGN KEY(component_id) REFERENCES components(id)
            )
        """)
        conn.commit()
        conn.close()

        def seed_components(db: Session):
        # Example components
            components = [
                {"name": "Power Supply", "description": "A standard 12V power supply", "unit_price": 50.0},
                {"name": "Motor", "description": "A 300W electric motor", "unit_price": 100.0},
                # Add more components here as needed
            ]
            for component in components:
                db.add(Component(**component))
            db.commit()




@app.get("/components")
def get_components(db: Session = Depends(get_db)):
    components = db.query(Component).all()
    return components


@app.get("/api/components")
def get_components():
    """Fetch all components from the database"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM components")
    components = cursor.fetchall()
    conn.close()
    return [{"id": row[0], "name": row[1], "description": row[2], "unit_price": row[3]} for row in components]

@app.post("/api/components")
def add_component(component: Component):
    """Add a new component to the database"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("INSERT INTO components (name, description, unit_price) VALUES (?, ?, ?)",
                   (component.name, component.description, component.unit_price))
    conn.commit()
    conn.close()
    return {"message": "Component added"}

@app.post("/api/quote")
def create_quote(quote: Quote):
    """Create a new quote with selected components"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("INSERT INTO quotes (client_name, date, notes) VALUES (?, ?, ?)",
                   (quote.client_name, quote.date, quote.notes))
    quote_id = cursor.lastrowid

    for item in quote.items:
        cursor.execute("INSERT INTO quote_items (quote_id, component_id, quantity) VALUES (?, ?, ?)",
                       (quote_id, item['component_id'], item['quantity']))

    conn.commit()
    conn.close()
    return {"quote_id": quote_id, "message": "Quote created"}

@app.get("/api/quote/{quote_id}")
def get_quote(quote_id: int):
    """Fetch a specific quote by ID"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT q.id, q.client_name, q.date, q.notes, qi.component_id, c.name, c.unit_price, qi.quantity
        FROM quotes q
        JOIN quote_items qi ON q.id = qi.quote_id
        JOIN components c ON qi.component_id = c.id
        WHERE q.id = ?
    """, (quote_id,))
    rows = cursor.fetchall()
    conn.close()

    quote = {
        "id": rows[0][0],
        "client_name": rows[0][1],
        "date": rows[0][2],
        "notes": rows[0][3],
        "items": [{"component_id": row[4], "name": row[5], "unit_price": row[6], "quantity": row[7]} for row in rows]
    }
    return quote

if __name__ == "__main__":
    import uvicorn
    init_db()  # Ensure the database is initialized
    uvicorn.run(app, host="127.0.0.1", port=8000)
