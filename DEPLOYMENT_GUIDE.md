# Step-by-Step Deployment Guide: Netlify & Hostinger

This guide covers how to deploy your React frontend to Netlify and connect your custom domain from Hostinger.

## Prerequisite: Preparation
1.  **Codebase**: Ensure your latest code is pushed to your Git repository (GitHub/GitLab/Bitbucket).
2.  **Environment Variables**: Have your `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` ready. You can find these in your `.env` file or Supabase Dashboard.
3.  **Redirects**: We have already created a `public/_redirects` file for you. This is crucial for your app to work correctly when users refresh the page.

---

## Part 1: Deploy Frontend to Netlify

1.  **Log in to Netlify**: Go to [netlify.com](https://www.netlify.com/) and log in.
2.  **Add New Site**:
    *   Click **"Add new site"** > **"Import from existing project"**.
    *   Select your Git provider (e.g., **GitHub**).
    *   Authorize Netlify and select your repository (`handloom-by-krishnkunj`).
3.  **Configure Build Settings**:
    *   **Team**: Select your team.
    *   **Branch to deploy**: `main` (or `master`).
    *   **Base directory**: (Leave empty).
    *   **Build command**: `npm run build`
    *   **Publish directory**: `dist`
4.  **Add Environment Variables** (Critical Step):
    *   Click **"Add environment variables"**.
    *   Add the following keys and values from your local `.env` file:
        *   `VITE_SUPABASE_URL`: (Your Supabase URL)
        *   `VITE_SUPABASE_PUBLISHABLE_KEY`: (Your public API key)
5.  **Deploy**: Click **"Deploy site"**.
    *   Netlify will start building your site. This may take 1-3 minutes.
    *   Once finished, you will get a URL like `https://random-name-123.netlify.app`. Open it to verify the site works (login, browse products).

---

## Part 2: Connect Hostinger Domain

1.  **Netlify Domain Setup**:
    *   Go to **Site configuration** > **Domain management** in your Netlify dashboard.
    *   Click **"Add a domain"**.
    *   Enter your domain name (e.g., `handloombykrishnkunj.com`).
    *   Click **"Verify"** > **"Add domain"**.
    *   Netlify will check the DNS. It will tell you to **"Check DNS configuration"**.

2.  **Hostinger DNS Configuration**:
    *   Log in to your **Hostinger** account.
    *   Go to **Domains** > **Manage** (for your specific domain).
    *   On the sidebar, find **DNS / Nameservers**.
    *   You have two options (Choose **Option A** for best compatibility if you use Hostinger Email):

    ### Option A: Point via CNAME & A Record (Recommended)
    *   **Delete** any existing A records for `@` (Parked) if they exist.
    *   **Add/Edit A Record**:
        *   **Type**: `A`
        *   **Name**: `@`
        *   **Points to**: `75.2.60.5` (Netlify Load Balancer)
        *   **TTL**: 3600 (or default)
    *   **Add/Edit CNAME Record**:
        *   **Type**: `CNAME`
        *   **Name**: `www`
        *   **Points to**: `[your-site-name].netlify.app` (Copy your Netlify site URL *without* https://)
        *   **TTL**: 3600

    ### Option B: Use Netlify Nameservers (Easier, but manages Email DNS on Netlify)
    *   In Netlify Domain Management, click **"Set up Netlify DNS"**.
    *   Netlify will give you 4 Nameservers (e.g., `dns1.p01.nsone.net`, `dns2...`).
    *   In Hostinger, go to **Nameservers** > **Change Nameservers**.
    *   Select **Change nameservers** and paste the 4 lines from Netlify.
    *   Save. *Note: This moves all DNS management to Netlify.*

3.  **Verification**:
    *   Go back to Netlify and confirm.
    *   **HTTPS/SSL**: Netlify automatically provisions a free SSL certificate (HTTPS). This might take up to 24 hours to active after DNS propagation, but usually happens within an hour.

---

## Part 3: Backend Verification (Supabase)

Since your frontend domain is changing (from `localhost` or `lovable.dev` to `handloombykrishnkunj.com`), you **MUST** update your Supabase Auth settings.

1.  Go to your **Supabase Dashboard**.
2.  Navigate to **Authentication** > **URL Configuration**.
3.  **Site URL**: Change this to your new domain: `https://handloombykrishnkunj.com`.
4.  **Redirect URLs**: Add your new domain URLs to the allow list:
    *   `https://handloombykrishnkunj.com/**`
    *   `https://www.handloombykrishnkunj.com/**`
5.  **Edge Functions**:
    *   If you deployed Edge Functions, ensure you updated the `SITE_URL` secret if it's used for CORS.
    *   Command: `supabase secrets set SITE_URL=https://handloombykrishnkunj.com` (run this locally if you have the CLI, or set it in the Dashboard under Edge Functions > Secrets).

Your site should now be live and fully functional!
