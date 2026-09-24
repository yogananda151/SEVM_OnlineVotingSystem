# Smart EVM – FastAPI Python Backend

A robust, asynchronous backend for the **Smart EVM (Electronic Voting Machine)** simulation built with **FastAPI**, **SQLAlchemy 2.0**, **PyMySQL**, **Pydantic v2**, and **MySQL**.

---

## 🚀 Key Features

- **FastAPI Framework**: High performance, native async ASGI with automatic interactive Swagger UI (`/docs`) & ReDoc (`/redoc`).
- **SQLAlchemy 2.0 & PyMySQL**: Complete ORM mapping to all 19 database tables with zero C++ compilation dependencies on Windows.
- **Pydantic v2**: Type-safe validation schemas matching all frontend API contracts.
- **Cryptographic Security**:
  - SHA-256 digital vote hashing for vote integrity
  - Bcrypt password hashing
  - HMAC-SHA256 for Aadhaar hashing (simulation)
  - PyJWT authentication with Access and Refresh tokens
- **Reporting**:
  - PDF generation for Election Summary & Audit Logs (ReportLab)
  - Excel generation & import for Candidates and Voter Rosters (OpenPyXL)
- **Role-Based Access Control**:
  - `COMMISSIONER`: Election lifecycle, Master Data (Regions, Constituencies, Polling Stations, Officers, Candidates, Parties), Audit Logs, System Settings.
  - `OFFICER`: Polling station machine control, starting/stopping active elections.
  - `PUBLIC EVM`: Touchscreen ballot kiosk, Aadhaar/OTP/biometric simulation, casting votes, VVPAT lookup.

---

## 📁 Directory Structure

```
server/
├── app/
│   ├── config.py             # Pydantic Settings (.env loader)
│   ├── database.py           # SQLAlchemy engine & session dependency
│   ├── main.py               # FastAPI application setup, CORS, static uploads
│   ├── models/               # SQLAlchemy ORM models (19 tables)
│   ├── schemas/              # Pydantic request/response schemas
│   ├── middleware/           # JWT auth & error handlers
│   ├── routers/              # API endpoints (/api/auth, /api/voting, etc.)
│   ├── services/             # Business logic layer
│   └── utils/                # Crypto, JWT, logger, and response helpers
├── uploads/                  # Uploaded candidate photos, party symbols, voter photos
├── logs/                     # Application logs
├── scripts/
│   └── seed.py               # Database seeder script
├── .env                      # Environment variables
├── requirements.txt          # Python dependencies
└── run.py                    # Server runner script
```

---

## ⚙️ Setup and Installation

### 1. Create & Activate Virtual Environment

```powershell
# From the server directory:
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### 2. Install Dependencies

```powershell
pip install -r requirements.txt
```

### 3. Configure `.env`

Check `.env` to verify your MySQL connection string:

```ini
DATABASE_URL=mysql+pymysql://root:password@localhost:3306/voting_system
PORT=5000
HOST=0.0.0.0
```

*(Note: If your password contains `@`, it is automatically percent-encoded as `%40` by the application config).*

### 4. Seed the Database

```powershell
python scripts/seed.py
```

**Default Credentials:**
- **Commissioner**: `commissioner@evm.gov.in` / `Admin@12345`
- **Officer**: `officer1@evm.gov.in` / `Officer@12345`

---

## 🏃 Running the Server

### Directly with Python:
```powershell
python run.py
```

### From Project Root with npm:
```powershell
# Run backend only:
npm run dev:server

# Run both FastAPI backend and React frontend concurrently:
npm run dev
```

---

## 📖 Interactive API Documentation

Once the server is running on port 5000:
- **Swagger UI**: [http://localhost:5000/docs](http://localhost:5000/docs)
- **ReDoc**: [http://localhost:5000/redoc](http://localhost:5000/redoc)
- **Health Check**: [http://localhost:5000/health](http://localhost:5000/health)
