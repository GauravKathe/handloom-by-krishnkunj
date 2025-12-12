# Step-by-Step Deployment Guide: Vercel & Hostinger

This guide covers how to deploy your React frontend to Vercel and connect your custom domain from Hostinger.

## Prerequisite: Preparation
1.  **Codebase**: Ensure your latest code is pushed to your Git repository (GitHub).
2.  **Environment Variables**: Have your `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` ready.
3.  **Routing**: We have added a `vercel.json` file to handle routing properly.

---

## Part 1: Deploy Frontend to Vercel

1.  **Log in to Vercel**: Go to [vercel.com](https://vercel.com/) and log in (use your GitHub account).
2.  **Add New Project**:
    *   Click **"Add New..."** > **"Project"**.
    *   Import your `handloom-by-krishnkunj` repository from GitHub.
3.  **Configure Project**:
    *   **Framework Preset**: It should auto-detect "Vite". If not, select it manually.
    *   **Root Directory**: Leave as `./`.
    *   **Environment Variables** (Critical):
        *   Expand the **"Environment Variables"** section.
        *   Add `VITE_SUPABASE_URL` = `(Your Supabase URL)`
        *   Add `VITE_SUPABASE_PUBLISHABLE_KEY` = `(Your Public Key)`
4.  **Deploy**: Click **"Deploy"**.
    *   Vercel will build your site. Wait about a minute.
    *   Once done, you will see a preview URL like `https://handloom-by-krishnkunj.vercel.app`. Visit it to verify the site works.

---

## Part 2: Connect Hostinger Domain

1.  **Vercel Domain Setup**:
    *   Go to your project Dashboard on Vercel.
    *   Click **"Settings"** > **"Domains"**.
    *   Enter your domain: `handloombykrishnkunj.com`.
    *   Click **"Add"**.
    *   Select the option recommended (usually `Add handloombykrishnkunj.com` and it will also suggest `www`).
    *   Vercel will show you the **DNS Records** you need to add (an A record and a CNAME record).

2.  **Hostinger DNS Configuration**:
    *   Log in to **Hostinger** > **Domains** > **Manage** (for your domain).
    *   Go to **DNS / Nameservers**.
    *   **Delete** any existing A records for `@` (Parked) or those pointing to Netlify (75.2.60.5).
    *   **Add/Edit A Record**:
        *   **Type**: `A`
        *   **Name**: `@`
        *   **Points to**: `76.76.21.21` (Vercel IP)
        *   **TTL**: 3600
    *   **Add/Edit CNAME Record**:
        *   **Type**: `CNAME`
        *   **Name**: `www`
        *   **Points to**: `cname.vercel-dns.com`
        *   **TTL**: 3600

3.  **Verification**:
    *   Go back to Vercel. It might take a few minutes to verify.
    *   Once both `@` and `www` show as "Valid Configuration" with a green checkmark, SSL generation will succeed automatically.

---

## Part 3: Update Supabase Auth URL

Changing deployment providers means your domain URL might change temporarily (or permanently if you use the Vercel default domain).

1.  Go to **Supabase Dashboard**.
2.  **Authentication** > **URL Configuration**.
3.  Ensure **Site URL** matches your main domain: `https://handloombykrishnkunj.com`.
4.  Add your temporary Vercel URL (e.g., `https://handloom-by-krishnkunj.vercel.app/**`) to **Redirect URLs** if you want to test on the Vercel subdomain before the main domain propagates.

Your site is now live on Vercel!
