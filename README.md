# Mosaic — Minimal Social Feed (Express + EJS + MongoDB)

A tiny social app with JWT login, image posts (URL **or** upload), likes, owner/admin delete, and a “This Week” feed—built with **Node.js + Express**, **EJS**, and **MongoDB (Mongoose)**.

> Frontend-ready: keep the SSR pages, and (optionally) add small JSON endpoints so React/Next.js and Postman can consume data easily.

---

## ✨ Features

- 🔐 Auth (email/password) with **JWT** in **HttpOnly cookie**
- 🖼️ Create posts via **image URL** or **file upload** (Multer)
- 👍 **Like/Unlike** (idempotent—no double-like)
- 🗑️ **Delete** if **owner** or **admin**
- 🗓️ **This Week** view (last 7 days)
- 🎨 Clean UI using **Tailwind via CDN**
- 🧱 Mongoose models with helpful indexes
- 🧩 Ready for **Next.js frontend** via proxy rewrites
- 🧪 Works nicely with **Postman**

---

## ⚙️ Prerequisites

- Node.js **18+** (20+ recommended)  
- MongoDB **6/7** (local or Atlas)  
- Git

---

## 🚀 Quick Start

### 1) Clone & install
```bash
# clone your repo
git clone https://github.com/ritesh556/Mosaic-Minimal-Social-Feed-Express-EJS-MongoDB-.git

# cd into the project folder (note the trailing dash in the repo name)
cd Mosaic-Minimal-Social-Feed-Express-EJS-MongoDB-

# install dependencies
npm install
