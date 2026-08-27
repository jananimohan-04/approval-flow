# 🚀 Google OAuth Production Verification Guide

When you are ready to let real clients use your platform without adding them as "Test Users", you must go through Google's OAuth Verification process. 

Because your app requests access to read Google Drive files (`drive.readonly` scope), Google considers this a **"Sensitive Scope"**. They will want to verify your app to ensure it is legitimate and protects user data.

Here is the exact step-by-step process to get verified.

---

## 🛠️ Step 1: Prepare Your Website Prerequisites
Google requires you to have a public-facing website before they verify you. You will need:
- [ ] **A Homepage**: A landing page describing your SaaS platform (e.g., `https://yourdomain.com`).
- [ ] **Privacy Policy Page**: A page hosted on your domain (e.g., `https://yourdomain.com/privacy`). *It must explicitly state how you access, use, and store Google Drive data.*
- [ ] **Terms of Service Page**: A page hosted on your domain (e.g., `https://yourdomain.com/terms`).

## ⚙️ Step 2: Update the OAuth Consent Screen
1. Go to the [Google Cloud Console](https://console.cloud.google.com/) for your project.
2. Go to **APIs & Services → OAuth consent screen**.
3. Under **App Information**:
   - Add your official **App Name** (e.g., Nexus AI).
   - Add an **App Logo** (must be accurate and professional).
   - Add your **User Support Email**.
4. Under **App Domain**:
   - Link your **Application home page**.
   - Link your **Privacy Policy** and **Terms of Service**.
5. Under **Authorized domains**:
   - Add your main domain (e.g., `yourdomain.com`).
6. Click **Save**.

## 📝 Step 3: Provide Scope Justification
Because you use `https://www.googleapis.com/auth/drive.readonly`, you must tell Google *why*.
1. In the consent screen setup, navigate to the **Scopes** step.
2. Find the drive scope and click on the "Justification" box.
3. Write a clear, non-technical explanation. 
   - *Example: "Nexus AI is an enterprise operations assistant. We require read-only access to Google Drive so that our users can authorize our AI to read their specific business spreadsheets (like invoices and HR rosters) to generate automated reports and routing tasks within our platform. We only read files explicitly selected by the user."*

## 🎥 Step 4: Record a Demo Video
**This is the most important step.** Google requires a screen recording (usually uploaded to YouTube as "Unlisted") proving how your app works.
The video MUST clearly show:
- [ ] How a user logs into your app.
- [ ] How a user clicks the "Connect Google Drive" button.
- [ ] **Crucial:** When the Google Consent screen pops up, you must show the URL bar with your `Client ID` clearly visible in the URL.
- [ ] The consent screen where the user clicks "Allow".
- [ ] What your app does with the data immediately after (show them selecting a folder and pulling in data).

## 🚀 Step 5: Submit for Verification
1. Go to the **OAuth consent screen** tab.
2. Click the **PUBLISH APP** button to move from "Testing" to "In Production".
3. Click the **PREPARE FOR VERIFICATION** button.
4. Fill out the final form, link your YouTube demo video, and submit.
5. Wait for Google's Trust & Safety team to review it (usually takes 3 to 7 business days). They will email you if they need more info.

---
*Note: Until the app is verified, you can still let clients use it by keeping the app "In Production", but they will see a scary "Google hasn't verified this app" warning page before they can connect. Verification removes this warning completely.*
