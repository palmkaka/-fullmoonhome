---
description: How to deploy the Next.js application to Vercel or Firebase Hosting
---

# Deployment Guide

You have two main options for deploying this Next.js application: **Vercel** (Recommended) or **Firebase Hosting**.

## Option 1: Vercel (Recommended for Next.js)

Vercel is the creators of Next.js and offers the best integration, performance, and ease of use.

### Prerequisites
1.  Push your code to a Git repository (GitHub, GitLab, or Bitbucket).

### Steps
1.  Go to [Vercel.com](https://vercel.com) and sign up/login.
2.  Click **"Add New..."** -> **"Project"**.
3.  Import your Git repository.
4.  **Configure Project**:
    - **Framework Preset**: Next.js (should be auto-detected).
    - **Environment Variables**: Copy these from your `.env.local` file:
        - `NEXT_PUBLIC_FIREBASE_API_KEY`
        - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
        - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
        - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
        - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
        - `NEXT_PUBLIC_FIREBASE_APP_ID`
        - `FIREBASE_SERVICE_ACCOUNT_KEY` (Copy the entire JSON string)
5.  Click **"Deploy"**.

---

## Option 2: Firebase Hosting

Since you are already using Firebase for the database, you can also host the frontend there.

### Prerequisites
1.  Install Firebase CLI: `npm install -g firebase-tools`
2.  Login: `firebase login`

### Steps
1.  **Initialize Hosting**:
    ```bash
    firebase init hosting
    ```
    - Select **"Hosting: Configure files for Firebase Hosting..."**
    - Select **"Use an existing project"** (Choose your project)
    - **Public directory**: `out` (for static export) or `.next` (requires extra setup for SSR)
    - **Configure as a single-page app**: Yes
    - **Set up automatic builds and deploys with GitHub**: Optional

2.  **Build the Project**:
    *Note: For standard Firebase Hosting, it's easiest to use static export if you don't use Image Optimization or API Routes heavily. However, this app uses dynamic features.*
    
    **Better Approach for Next.js on Firebase**: Use **"Firebase App Hosting"** (New) or **"firebase-frameworks"**.
    
    **Using Firebase Frameworks (Recommended for Firebase)**:
    ```bash
    firebase experiments:enable webframeworks
    firebase init hosting
    ```
    - It should detect Next.js.
    - Choose "Server-side rendering" (SSR) if asked.

3.  **Deploy**:
    ```bash
    firebase deploy
    ```

### Important Note on Environment Variables
For Firebase Hosting, you might need to add your public env vars to `next.config.js` or ensure they are available during the build process in your CI/CD pipeline.

---

## Recommendation
**Use Vercel.** It handles the server-side rendering (SSR) and API routes of Next.js automatically without complex configuration, whereas Firebase Hosting often requires setting up Cloud Functions to handle the SSR part manually or using their newer (experimental) frameworks support.
