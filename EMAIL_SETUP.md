# Email Setup Guide

Your app supports multiple email providers. Choose the one that works best for you!

## 🚀 Quick Start Options

### Option 1: Resend (Recommended - Easiest)
**Best for:** Quick setup, no domain needed, generous free tier

1. Sign up at [resend.com](https://resend.com)
2. Go to API Keys and create a new key
3. In Render, add environment variable:
   - Key: `RESEND_API_KEY`
   - Value: Your API key from Resend
4. Optional: Set `EMAIL_FROM` to customize sender (e.g., `"Uriah's Dice Roller" <onboarding@resend.dev>`)

**Free Tier:** 3,000 emails/month, 100 emails/day

---

### Option 2: SendGrid
**Best for:** Established service, good free tier

1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Verify your account (they may require phone verification)
3. Go to Settings → API Keys → Create API Key
4. In Render, add environment variable:
   - Key: `SENDGRID_API_KEY`
   - Value: Your API key from SendGrid
5. Optional: Set `EMAIL_FROM` to your verified sender email

**Free Tier:** 100 emails/day forever

---

### Option 3: Gmail (Personal Account)
**Best for:** If you already have Gmail and want to use it

1. Enable 2-Factor Authentication on your Google account
2. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
3. Create an app password (select "Mail" and your device)
4. In Render, add environment variables:
   - Key: `GMAIL_USER` → Your Gmail address
   - Key: `GMAIL_APP_PASSWORD` → The app password you generated
5. Set `EMAIL_FROM` to your Gmail address

**Note:** Gmail has daily sending limits (~500 emails/day for free accounts)

---

### Option 4: Custom SMTP
**Best for:** If you have your own email server or another provider

In Render, add environment variables:
- `SMTP_HOST` → Your SMTP server (e.g., `smtp.mailgun.org`)
- `SMTP_PORT` → Port (usually 587 or 465)
- `SMTP_SECURE` → `true` for 465, `false` for 587
- `SMTP_USER` → Your SMTP username
- `SMTP_PASS` → Your SMTP password
- `EMAIL_FROM` → Your sender email

---

## 🔧 Setting Environment Variables in Render

1. Go to your Render dashboard
2. Select your service
3. Go to "Environment" tab
4. Click "Add Environment Variable"
5. Add the variables for your chosen provider
6. Save and redeploy

---

## 🧪 Testing Without Email Setup

**Good news!** If no email service is configured, the app will:
- Still generate login codes
- Log codes to the server console/logs
- Return codes in the API response (visible in browser dev tools)

This means you can test the app even without email configured! Just check:
- Render logs for the code
- Browser Network tab → Response for `devCode` field

---

## 📊 Comparison

| Provider | Free Tier | Setup Difficulty | Best For |
|----------|-----------|------------------|----------|
| **Resend** | 3,000/month | ⭐ Easy | Quick setup, modern API |
| **SendGrid** | 100/day | ⭐⭐ Medium | Established, reliable |
| **Gmail** | ~500/day | ⭐⭐⭐ Harder | Personal projects |
| **Custom SMTP** | Varies | ⭐⭐⭐⭐ Hardest | Own infrastructure |

---

## 💡 Recommendation

For your use case (GitHub Pages + Render, no domain), I'd recommend **Resend**:
- Easiest setup (just one API key)
- No domain verification needed initially
- Generous free tier (3,000 emails/month is plenty for login codes)
- Modern, developer-friendly

---

## 🐛 Troubleshooting

**Emails not sending?**
1. Check Render logs for error messages
2. Verify environment variables are set correctly
3. Check your provider's dashboard for any issues
4. For Gmail: Make sure you're using an App Password, not your regular password

**Codes not appearing?**
- Check Render logs - codes are always logged there
- Check browser Network tab for `devCode` in API responses
- Make sure your email service is properly configured

