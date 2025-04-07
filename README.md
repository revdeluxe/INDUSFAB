# INDUSFAB

 is a web-based system designed to help industrial machine shops manage machine utilization and manufacturing quotations more efficiently. Its main goal is to reduce downtime, optimize machine performance, and streamline cost estimation for custom manufacturing jobs. By integrating machine tracking with an automated quotation system, INDUSFAB helps businesses improve operational efficiency, reduce costs, and provide more accurate pricing to their clients.

# 💡 FastAPI + SQLite + Electron Desktop App

Designed to be a cross-platform desktop app using:

- 🧠 **FastAPI** (Python backend)
- 🗃️ **SQLite** (Local data storage)
- ⚡ **Electron** (Frontend UI)
- 📆 **PyInstaller** for packaging into `.exe`

---

## 📁 Project Structure

```
my-desktop-app/
├── backend/
│   ├── app.py            # FastAPI server
│   ├── database.db       # SQLite file (auto-generated)
│   └── requirements.txt  # Python dependencies
├── frontend/
│   ├── main.js           # Electron main process
│   ├── index.html        # Frontend UI
│   └── package.json      # Electron config
├── build/                # Output of PyInstaller (e.g. backend.exe)
```

---

## ⚙️ Backend: FastAPI + SQLite

### 🔧 Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 📄 requirements.txt

```txt
fastapi
uvicorn
pydantic
```

> Optional:
> ```txt
> python-multipart  # For file uploads if needed
> ```

### 🚀 Run Backend (Dev Mode)

```bash
python app.py
```

- Swagger Docs: `http://127.0.0.1:5000/docs`
- JSON Root: `http://127.0.0.1:5000/`
- HTML Test Page: `http://127.0.0.1:5000/hello`

### 📆 Build Backend Executable

```bash
pyinstaller --onefile app.py --name backend
mv dist/backend ../build/
```

---

## 🧠 Using SQLite

- FastAPI auto-creates `database.db` on first run
- Table schema:

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT
);
```

- Two endpoints:
  - `GET /api/users` → List all users
  - `POST /api/users` → Add new user

---

## 🖥️ Frontend: Electron

### 📄 frontend/main.js

- Launches Electron window
- Starts backend `.exe` in the background
- Loads `index.html`

### 📄 frontend/index.html

- Sends HTTP requests to FastAPI
- Displays & submits user data

### ⚡ Run Electron Dev Mode

```bash
cd frontend
npm install
npm start
```

---

## 📆 Build Electron Desktop App

Use Electron Builder:

```bash
npm run package
```

Make sure `../build/backend.exe` is bundled in your build.

---

## 📝 To-Do Ideas

- [ ] Add login/authentication
- [ ] Persist user preferences
- [ ] Minimize to tray
- [ ] Add sync to remote/cloud

---

## 📃 Resources

- [FastAPI Docs](https://fastapi.tiangolo.com)
- [SQLite Docs](https://www.sqlite.org/docs.html)
- [Electron](https://www.electronjs.org)
- [PyInstaller](https://pyinstaller.org/en/stable/)

