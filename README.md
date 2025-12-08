# Advanced AI Pattern Analyzer

A full-stack application for analyzing number patterns using 15+ ML algorithms with ensemble learning.

## Project Structure

```
funGame/
├── frontend/          # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   └── NumberPatternAnalyzer.jsx
│   │   ├── App.jsx
│   │   └── index.css
│   └── package.json
├── backend/           # Python Flask backend
│   ├── app.py
│   └── requirements.txt
└── package.json       # Root package.json for scripts
```

---

## Quick Start (Step by Step)

### Step 1: Open Terminal and Navigate to Project

```bash
cd /home/shivam/funGame
```

### Step 2: Run the Frontend

```bash
cd frontend
npm run dev
```

You should see output like:
```
  VITE v7.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

**Open your browser and go to:** http://localhost:5173

---

## If `npm run dev` is Not Working

### Check 1: Are you in the correct directory?

```bash
pwd
# Should show: /home/shivam/funGame/frontend
```

### Check 2: Are node_modules installed?

```bash
ls node_modules
# If this shows "No such file or directory", run:
npm install
```

### Check 3: Run with full path

```bash
cd /home/shivam/funGame/frontend && npm run dev
```

### Check 4: Check for errors

```bash
npm run dev 2>&1
```

---

## Running the Backend (Optional)

The frontend works standalone. To run the Python backend:

### Install pip first (if needed):

```bash
sudo apt install python3-pip python3-venv
```

### Create virtual environment and install dependencies:

```bash
cd /home/shivam/funGame/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Run the backend:

```bash
python app.py
```

Backend runs on: http://localhost:3001

---

## Features

- 15+ ML Algorithms for pattern prediction
- Ensemble Learning with adaptive weighting
- Real-time Analysis with interactive charts
- File Upload support (CSV, TXT)
- Multiple Views: Predictions, Methods, Analysis, Statistics

## Tech Stack

| Frontend | Backend |
|----------|---------|
| React 18 | Python 3.12 |
| Vite | Flask |
| Tailwind CSS | Flask-CORS |
| Recharts | |
| Lucide React | |
