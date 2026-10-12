# Cartify

A full-stack e-commerce application developed for a university Integrative Programming project. It features product browsing, user authentication, profile management, shopping cart functionality, and order-related workflows.

## Tech Stack

- **Frontend:** React, Redux, React Router, Vite, Bootstrap
- **Backend:** Node.js, Express
- **Database:** MongoDB
- **Supporting Tools:** Axios, Cloudinary

## Setup

### Prerequisites

- Node.js and npm
- MongoDB connection
- Any required Cloudinary and email service credentials

### Backend

1. Open a terminal in the backend directory:

   ```bash
   cd backend
   npm install
   ```

2. Configure the environment variables in `backend/config/.env`, including the database connection, server port, authentication settings, and any Cloudinary or email credentials required by the application.
3. Start the backend:

   ```bash
   npm start
   ```

### Frontend

1. Open a separate terminal in the frontend directory:

   ```bash
   cd frontend
   npm install
   ```

2. Configure the frontend's API base URL to point to the running backend, if required.
3. Start the Vite development server:

   ```bash
   npm run dev
   ```

4. Open the local URL displayed by Vite in your browser.

**Note:** This repository is a fork of [jamzayrin/cartify](https://github.com/jamzayrin/cartify). Active contributions are intended for the original shared repository. Never commit environment files or credentials.

## Academic Context

- **Year and Term:** 3rd Year - 1st Term
- **Course:** Integrative Programming
