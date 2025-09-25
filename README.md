# Mosaic — Minimal Social Feed (Express + EJS + MongoDB)

A tiny social app with JWT login, image posts (URL **or** upload), likes, owner/admin delete, and a “This Week” feed—built with **Node.js + Express**, **EJS**, and **MongoDB (Mongoose)**.

> Frontend-ready: you can keep the SSR pages, and (optionally) add small JSON endpoints so React/Next.js and Postman can consume data easily.

---

## ✨ Features

- 🔐 Auth (email/password) with **JWT** stored in **HttpOnly cookie**
- 🖼️ Create posts via **image URL** or **file upload** (Multer)
- 👍 **Like/Unlike** (idempotent—no double-like)
- 🗑️ **Delete** if **owner** or **admin**
- 🗓️ **This Week** view (last 7 days)
- 🎨 Clean UI using **Tailwind via CDN**
- 🧱 Mongoose models with helpful indexes
- 🧩 Ready for **Next.js frontend** via proxy rewrites
- 🧪 Easy to use with **Postman**

---

## ⚙️ Prerequisites

- Node.js 18+ (or 20+)
- MongoDB 6/7 (local or Atlas)
- Git

---

## 🚀 Quick Start

1. **Clone & install**
   ```bash
  https://github.com/ritesh556/Mosaic-Minimal-Social-Feed-Express-EJS-MongoDB-.git
   cd mosaic
   npm install