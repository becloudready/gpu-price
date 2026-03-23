This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# 🚀 GPU Price Intelligence Dashboard

A full-stack GPU cloud pricing comparison platform built using **Next.js, React, TypeScript, Tailwind CSS, Recharts, and Flask API**.

⚙️ FULL INSTALLATION FLOW (FROM ZERO)
1️⃣ Install Required Software
Install Node.js (LTS version)
Install Python (3.8+)
Install Git

Verify:

node -v
npm -v
python --version
git --version
🖥️ BACKEND SETUP (Flask API)
2️⃣ Create Backend Folder
mkdir backend
cd backend
3️⃣ Create Virtual Environment
python -m venv venv

Activate:

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate
4️⃣ Install Backend Dependencies
pip install flask flask-cors pandas requests
5️⃣ Create Flask API (app.py)
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route("/prices", methods=["GET"])
def get_prices():
    data = [
        {
            "provider": "AWS",
            "product": "A100",
            "vram_gb": 40,
            "price_per_hour": 3.5
        },
        {
            "provider": "GCP",
            "product": "T4",
            "vram_gb": 16,
            "price_per_hour": 0.8
        }
    ]
    return jsonify(data)

if __name__ == "__main__":
    app.run(debug=True)
6️⃣ Run Backend Server
python app.py

👉 Runs on:

http://127.0.0.1:5000/prices
🌐 FRONTEND SETUP (Next.js)
7️⃣ Create Next.js App
npx create-next-app@latest gpu-dashboard
cd gpu-dashboard

Select:

TypeScript → Yes
Tailwind → Yes
App Router → Yes
8️⃣ Install Extra Libraries
npm install recharts axios
9️⃣ Run Frontend
npm run dev

👉 Open:

http://localhost:3000
🔗 CONNECT FRONTEND TO BACKEND
🔟 Update app/page.tsx

Replace fetch logic:

useEffect(() => {
  const fetchData = async () => {
    try {
      const res = await fetch("http://127.0.0.1:5000/prices");
      const data = await res.json();
      setGpuData(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, []);
▶️ RUN COMPLETE PROJECT
1️⃣ Start Backend
cd backend
venv\Scripts\activate
python app.py
2️⃣ Start Frontend (New Terminal)
cd gpu-dashboard
npm run dev
✅ FINAL RESULT

Open:

http://localhost:3000