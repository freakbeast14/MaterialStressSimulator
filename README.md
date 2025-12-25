# MatSim Analytics - Material Property Analysis Dashboard

A professional full-stack web application for analyzing and simulating material properties. Built with React, Node.js, Express, and PostgreSQL.

## Overview

MatSim Analytics is designed for engineers and material scientists to:
- Browse a library of engineering materials (Steel, Aluminum, Titanium, Polymers)
- Visualize material properties with interactive charts (Stress-Strain curves, Thermal expansion)
- Run simulations to analyze material behavior
- Compare multiple materials side-by-side
- Track simulation results with real-time status updates

**Perfect for interview demonstrations** - Shows frontend expertise, full-stack understanding, and domain knowledge in mechanical simulation.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation Guide (Windows)](#installation-guide-windows)
3. [Database Setup](#database-setup)
4. [FEniCS Solver Service (Windows + WSL)](#fenics-solver-service-windows--wsl)
5. [Running the Application](#running-the-application)
5. [Testing the Application](#testing-the-application)
6. [Demo Walkthrough](#demo-walkthrough)
7. [Troubleshooting](#troubleshooting)
8. [Project Structure](#project-structure)

---

## Prerequisites

Before starting, ensure you have the following installed on your Windows machine:

### 1. **Node.js** (v18 or higher)
- **Download**: https://nodejs.org/
- Choose the **LTS** version (recommended)
- **Verify installation**: Open Command Prompt and run:
  ```bash
  node --version
  npm --version
  ```
  You should see version numbers for both.

### 2. **PostgreSQL** (v12 or higher)
- **Download**: https://www.postgresql.org/download/windows/
- **Installer**: Use the official PostgreSQL installer (EDB)
- **During installation**:
  - Set password for the `postgres` user (remember this!)
  - Keep the default port as **5432**
  - Install pgAdmin (optional, useful for managing databases)
- **Verify installation**: Open Command Prompt and run:
  ```bash
  psql --version
  ```

### 3. **WSL + Ubuntu** (Required for FEniCS)
- Install WSL2 with Ubuntu
- You will run the FEniCS solver service inside Ubuntu

### 4. **Python 3** (WSL/Ubuntu)
- Install Python inside Ubuntu for the FastAPI + FEniCS service

### 5. **Git** (Optional, for cloning the repo)
- **Download**: https://git-scm.com/download/win
- Helps if you want to clone the project from a repository

---

## Installation Guide (Windows)

### Step 1: Download/Clone the Project

**Option A: Using Git (Recommended)**
```bash
git clone <your-repo-url>
cd material-analysis-dashboard
```

**Option B: Download ZIP**
- Download the project as a ZIP file
- Extract to your desired location
- Open Command Prompt and navigate to the extracted folder

### Step 2: Open Command Prompt in the Project Directory

1. Navigate to the project folder
2. Click on the address bar and type `cmd` then press Enter
3. Or use: `Win + R`, type `cmd`, and use `cd` to navigate:
   ```bash
   cd C:\path\to\your\project
   ```

### Step 3: Install Node Dependencies

In the Command Prompt, run:
```bash
npm install
```

This will install all required packages listed in `package.json`. Wait for it to complete (1-2 minutes).

**What this installs:**
- React - Frontend framework
- Express - Backend server
- Drizzle ORM - Database management
- Recharts - Charting library
- Tailwind CSS - Styling
- And ~60+ other dependencies

---

## Database Setup

### Step 1: Create a PostgreSQL Database

**Option A: Using pgAdmin (GUI)**
1. Open **pgAdmin** (installed with PostgreSQL)
2. Log in with the password you set during installation
3. Right-click on "Databases" → "Create" → "Database"
4. Name it: `material_db`
5. Click "Save"

**Option B: Using Command Prompt**
1. Open Command Prompt
2. Connect to PostgreSQL:
   ```bash
   psql -U postgres
   ```
3. Enter the password you set during installation
4. Create the database:
   ```sql
   CREATE DATABASE material_db;
   ```
5. Exit psql:
   ```sql
   \q
   ```

### Step 2: Create .env File (Database Connection)

In your project root directory, create a file named `.env` with:

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/material_db
```

**Replace `YOUR_PASSWORD`** with the PostgreSQL password you set during installation.

**Example:**
```
DATABASE_URL=postgresql://postgres:mypassword123@localhost:5432/material_db
```

### Step 3: Initialize Database Schema

In Command Prompt (in your project directory), run:

```bash
npm run db:push
```

This will:
- Create all necessary tables (materials, simulations)
- Set up the database structure
- Seed initial data (4 materials: Steel, Aluminum, Titanium, PEEK)

**Expected output:**
```
✓ Tables created successfully
✓ Database initialized
```

If you get errors, see the [Troubleshooting](#troubleshooting) section.

---

## FEniCS Solver Service (Windows + WSL)

The solver service runs in Ubuntu (WSL) and the Node server runs in Windows. The Node server calls the solver via `FENICS_API_URL`.

### Step 1: Verify FEniCS in Ubuntu
In Ubuntu (WSL), run:
```bash
python3 - <<'PY'
import dolfin as df
print(df.__version__)
PY
```

### Step 2: Create the Python venv for the service
In Ubuntu (WSL), from the project root:
```bash
cd /mnt/c/Users/smoham68/Documents/Job-Overview-Position/Job-Overview-Position
rm -rf fenics_service/.venv
python3 -m venv --system-site-packages fenics_service/.venv
source fenics_service/.venv/bin/activate
python -m pip install fastapi uvicorn
```

### Step 3: Start the solver API
In Ubuntu (WSL):
```bash
fenics_service/.venv/bin/uvicorn fenics_service.main:app --host 0.0.0.0 --port 8001
```
Leave this terminal running.

### Step 4: Get the WSL IP
Open a second Ubuntu terminal:
```bash
ip addr show eth0 | grep 'inet ' | awk '{print $2}' | cut -d/ -f1
```
Use the first IP shown (e.g., `172.29.22.11`).

### Step 5: Set `FENICS_API_URL` on Windows
In Windows PowerShell (project root):
```powershell
$env:FENICS_API_URL="http://<WSL-IP>:8001"
```

You can also set it in `.env`:
```
FENICS_API_URL=http://<WSL-IP>:8001
```

## Running the Application

### Step 1: Start the Development Server

In Command Prompt, in your project directory:

```bash
npm run dev
```

**What happens:**
- Backend server starts on http://localhost:5000
- Frontend (Vite) compiles and hot-reloads
- Database connects and validates
- The server can call the FEniCS service if `FENICS_API_URL` is set
- You should see:
  ```
  > rest-express@1.0.0 dev
  > NODE_ENV=development tsx server/index.ts
  
  10:14:15 PM [express] serving on port 5000
  10:14:21 PM [express] GET /api/materials 200
  ```

### Step 2: Open in Browser

1. Open your web browser (Chrome, Firefox, Edge)
2. Go to: **http://localhost:5000**
3. You should see the MatSim Analytics dashboard

**If you see a blank page:**
- Wait 10-15 seconds for the frontend to compile
- Refresh the page (Ctrl+R or F5)
- Check the terminal for compilation errors

### Step 3: Keep the Server Running

**Do NOT close the Command Prompt window** while using the app. The server must stay running.

To stop the server later:
- Click in the Command Prompt
- Press **Ctrl + C**
- Type `Y` and press Enter to confirm

---

## Testing the Application

### Test 1: View Materials

1. Click **"Materials"** in the navigation
2. You should see 4 materials:
   - Structural Steel ASTM A36
   - Aluminum Alloy 6061-T6
   - Titanium Ti-6Al-4V
   - Polyetheretherketone (PEEK)
3. Click on any material to view detailed properties and charts

**What's happening:**
- Frontend fetches data from `GET /api/materials`
- Charts render using Recharts library
- Properties display in a formatted table

### Test 2: Run a Simulation (FEniCS)

1. From a material detail page, click **"Run Simulation"**
2. Enter a simulation name (e.g., "Tensile Test 1")
3. Select a simulation type (e.g., "Tensile Test")
4. Click **"Start Simulation"**
5. Watch the status change:
   - **Pending**
   - **Running**
   - **Completed** (with results)

**What's happening:**
- Frontend sends `POST /api/simulations` with material data
- Backend enqueues a job and polls the FEniCS service
- Results and time-series data are returned and stored

### Test 3: Compare Materials

1. Click **"Compare"** in navigation
2. Select 2+ materials from the dropdown
3. View overlaid stress-strain curves
4. Compare physical properties side-by-side

**What's happening:**
- Frontend queries all materials
- Dynamically renders comparison charts
- Uses Recharts to overlay multiple data series

### Test 4: Dark Mode (Optional)

1. Look for a theme toggle in the top-right corner
2. Click to switch between light and dark mode
3. Charts and UI should adapt to the theme

---

## Demo Walkthrough

### For Your Interview (5-7 minutes)

**Script & Timing:**

**[0:00-0:30] Introduction**
- "I built a material analysis dashboard to demonstrate how I handle mechanical simulation data on the web."
- Show the dashboard overview

**[0:30-1:30] Material Library**
- Click "Materials"
- "I modeled the system to store standard engineering properties: Density, Young's Modulus, Poisson's Ratio."
- Show the material list and properties

**[1:30-3:00] Visualization (The "Wow" Factor)**
- Click on "Structural Steel"
- Scroll to the Stress-Strain Curve chart
- "Here I'm visualizing the non-linear stress-strain relationship. This is critical for engineers to understand material failure points."
- Scroll to Thermal Expansion
- "The thermal expansion curve shows how materials expand with temperature—essential for design calculations."

**[3:00-4:30] Simulation**
- Click "Run Simulation"
- Enter a name: "Design Test 1"
- Select type: "Tensile Test"
- Click "Start"
- "I implemented an asynchronous job queue pattern. The frontend polls for updates while the backend processes."
- Wait for status to reach "Completed"
- "Once done, the results display—Safety Factor, Max Stress, and a time-series graph of the simulation."

**[4:30-5:30] Comparison**
- Click "Compare"
- Select Steel and Aluminum
- "This view helps engineers make data-driven decisions by comparing materials side-by-side."

**[5:30-6:00] Technical Highlights** (if asked)
- "Frontend: React with Tailwind CSS for styling, Recharts for interactive charts."
- "Backend: Node.js with Express, Drizzle ORM for type-safe database queries."
- "Database: PostgreSQL with JSONB storage for complex curve data."
- "Real-world relevance: Simulates how Synopsys tools handle CAE/FEA data visualization."

---

## Troubleshooting

### Issue 1: "DATABASE_URL is not set"

**Error:**
```
Error: DATABASE_URL must be set. Did you forget to provision a database?
```

**Solution:**
1. Verify the `.env` file exists in your project root
2. Check the connection string format:
   ```
   postgresql://postgres:PASSWORD@localhost:5432/material_db
   ```
3. Verify PostgreSQL is running
4. Test the connection:
   ```bash
   psql -U postgres -h localhost -d material_db
   ```

### Issue 2: "Port 5000 is already in use"

**Error:**
```
Error: listen EADDRINUSE: address already in use 0.0.0.0:5000
```

**Solution:**
- **Quick fix**: Kill the process using port 5000
  ```bash
  netstat -ano | findstr :5000
  taskkill /PID <PID> /F
  ```
- **Alternative**: Change the port in `server/index.ts` (line with `5000`)
- **Or**: Close all other Command Prompt windows running the app

### Issue 3: "Module not found" errors

**Error:**
```
Error: Cannot find module 'react' or similar
```

**Solution:**
```bash
npm install
npm run build
npm run dev
```

### Issue 4: Charts not showing / "Legend is not defined"

**Error:**
Charts display but no data appears

**Solution:**
1. Check browser console (F12 → Console tab)
2. Clear browser cache: Ctrl+Shift+Delete
3. Restart the development server:
   ```bash
   Ctrl+C (in Command Prompt)
   npm run dev
   ```

### Issue 5: "psql is not recognized"

**Error:**
```
'psql' is not recognized as an internal or external command
```

**Solution:**
1. PostgreSQL is not in your PATH
2. Either:
   - Add PostgreSQL to PATH (Google "add PostgreSQL to Windows PATH")
   - Or use full path: `C:\Program Files\PostgreSQL\15\bin\psql`

### Issue 6: Page shows "Cannot GET /"

**Error:**
Server running but page shows error

**Solution:**
1. Ensure frontend compiled: check terminal for "vite" messages
2. Wait 15 seconds for first-time compilation
3. Refresh page: Ctrl+R
4. Check for errors in terminal and browser console (F12)

---

## Project Structure

```
project-root/
├── client/                    # React frontend
│   ├── src/
│   │   ├── App.tsx           # Main app component
│   │   ├── pages/            # Page components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── MaterialLibrary.tsx
│   │   │   ├── MaterialDetail.tsx
│   │   │   ├── SimulationPage.tsx
│   │   │   └── CompareMaterials.tsx
│   │   ├── components/       # Reusable components
│   │   ├── lib/              # Utilities (queryClient, etc)
│   │   ├── index.css         # Global styles
│   │   └── main.tsx          # React entry point
│   └── index.html            # HTML template
│
├── server/                    # Node.js/Express backend
│   ├── index.ts              # Server entry point
│   ├── routes.ts             # API route handlers
│   ├── storage.ts            # Database storage layer
│   ├── db.ts                 # Database connection
│   └── vite.ts               # Vite dev server setup
│
├── shared/                    # Shared between frontend & backend
│   ├── schema.ts             # Data models (Drizzle + Zod)
│   └── routes.ts             # API contract definitions
│
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
├── tailwind.config.ts        # Tailwind CSS config
├── vite.config.ts            # Vite bundler config
├── drizzle.config.ts         # Database ORM config
├── .env                      # Database connection (CREATE THIS)
└── README.md                 # This file
```

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 | UI framework |
| | Vite | Build tool & dev server |
| | Tailwind CSS | Styling |
| | Recharts | Interactive charts |
| | Framer Motion | Animations |
| **Backend** | Node.js | Runtime |
| | Express | Web framework |
| | Drizzle ORM | Type-safe database queries |
| **Database** | PostgreSQL | Relational database |
| | Drizzle Zod | Schema validation |
| **Tools** | TypeScript | Type safety |
| | TanStack Query | Data fetching & caching |

---

## Key Features

✅ **Material Library**
- 4 pre-seeded materials with full properties
- Sortable/searchable list
- Detailed property cards

✅ **Interactive Charts**
- Stress-Strain curves (LineChart)
- Thermal expansion visualization
- Time-series simulation data
- Real-time updates on simulation completion

✅ **Simulation Engine**
- Create and run material simulations
- Real-time status tracking (Pending → Running → Completed)
- FEniCS solver service integration (FastAPI)
- Results storage and retrieval

✅ **Material Comparison**
- Multi-select dropdown
- Overlay curves of multiple materials
- Side-by-side property comparison

✅ **Dark Mode**
- Professional dark theme for engineering software
- Reduces eye strain
- Automatic toggle in header

✅ **Responsive Design**
- Works on desktop and laptop screens
- Optimized for 1920x1080 resolution

---

## Common Commands

| Command | Purpose |
|---------|---------|
| `npm install` | Install all dependencies |
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run db:push` | Initialize/update database schema |
| `npm run db:studio` | Open Drizzle Studio (database GUI) |
| `Ctrl + C` | Stop the development server |

---

## Performance Notes

- **First Load**: 10-15 seconds (Vite compilation)
- **Chart Rendering**: ~200ms with 20+ data points
- **Simulation Duration**: 5 seconds (mock)
- **Database Queries**: <50ms for all operations

---

## Interview Tips

1. **Practice the demo** before showing it
2. **Explain your choices**: "I chose Recharts because it's optimized for engineering dashboards"
3. **Talk about the backend**: "The mock simulation engine demonstrates async handling"
4. **Mention scalability**: "JSONB storage allows flexible data structures for future simulation types"
5. **Show the code**: Be ready to explain `shared/schema.ts`, `server/routes.ts`, and component structure
6. **Test all features** before the interview

---

## Troubleshooting Quick Reference

| Problem | Solution |
|---------|----------|
| Port 5000 in use | `taskkill /F /IM node.exe` |
| No database connection | Check `.env` file and `DATABASE_URL` |
| Charts not showing | Clear browser cache & restart server |
| Blank page | Wait 15s for compilation, then refresh |
| psql not found | Add PostgreSQL to PATH or use full path |

---

## Support

If you encounter issues not listed here:

1. **Check the terminal** for error messages
2. **Read the error stack trace** carefully
3. **Check browser console** (F12 → Console)
4. **Restart the server** (`Ctrl+C` then `npm run dev`)
5. **Delete `node_modules` and reinstall**:
   ```bash
   rm -r node_modules
   npm install
   npm run dev
   ```

---

## Next Steps (After Interview)

To extend this project:
- Add authentication (Replit Auth or Passport.js)
- Implement actual FEA solver integration
- Add export to PDF/CSV functionality
- Create real-time WebSocket updates
- Build mobile app version

---

## License

MIT License - Feel free to use this for your interview preparation.

---

**Last Updated:** December 25, 2025
**Version:** 1.0.0
**Status:** Ready for Demo
### Issue 7: "FEniCS API unreachable"

**Error:**
```
FEniCS API unreachable
```

**Solution:**
1. Confirm the FastAPI service is running in Ubuntu on port 8001
2. Ensure `FENICS_API_URL` points to the WSL IP
3. Restart `npm run dev` after changing `FENICS_API_URL`

├── fenics_service/            # FastAPI + FEniCS solver service (WSL)
│   └── main.py
