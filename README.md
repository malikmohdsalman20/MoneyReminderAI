# 💰 Money Reminder AI - Progressive Web App

A powerful, offline-first PWA for tracking expenses, income, debts, bills, and budgets with AI-powered financial insights.

## 🌟 Features

### Core Features
- 📊 **Dashboard** - Visual financial overview with net worth, trends, and alerts
- 💰 **Accounts** - Manage multiple bank accounts, Revolut, Wise, crypto wallets, etc.
- 💸 **Expenses** - Track spending by category with search and filtering
- 💵 **Income** - Record income from multiple sources
- 🏦 **Bills & Recurring** - Bill reminders with partial payment tracking
- 💳 **Debts** - Track money you owe with payment history
- 🤝 **Lending** - Track money you lent with repayment tracking
- 🎯 **Budget** - Set monthly budgets with category breakdown
- 👥 **Contacts** - Save contact info for people you owe/lend to
- 📈 **Reports** - 6-month trends, spending breakdown, and insights
- 🤖 **AI Assistant** - Chat-based financial advice and reminders
- 🔐 **Data Privacy** - All data stored locally, never sent to servers

### PWA Features
- ✅ **Install as App** on mobile (Android/iOS) and desktop
- ✅ **Offline First** - Works completely offline after first load
- ✅ **Service Worker** - Intelligent caching strategy
- ✅ **IndexedDB** - Large dataset support with fallback to LocalStorage
- ✅ **Backup & Restore** - Export/import JSON backups
- ✅ **Push Notifications** - Stay updated on bills and reminders
- ✅ **App Shortcuts** - Quick access to common actions
- ✅ **Dark Mode** - Beautiful dark theme optimized for eyes

## 🚀 Quick Start

### Option 1: Use on Web (Recommended)
Your app is already live at:
```
https://malikmohdsalman20.github.io/MoneyReminderAI/
```

### Option 2: Local Development
```bash
# Clone the repository
git clone https://github.com/malikmohdsalman20/MoneyReminderAI.git
cd MoneyReminderAI

# Start a local server
python -m http.server 8000
# or
npx serve .

# Open in browser
# http://localhost:8000
```

## 📱 Install as App

### Android (Chrome/Firefox)
1. Open the app in your mobile browser
2. Tap the menu (⋮) → "Install app"
3. Confirm installation
4. App appears on your home screen ✨

### iPhone/iPad (Safari)
1. Open the app in Safari
2. Tap Share → Add to Home Screen
3. Name: "Money Reminder"
4. Tap Add
5. App appears on your home screen ✨

### Windows/Mac (Chrome/Edge)
1. Visit the web app
2. Click the install icon (in address bar) or menu (⋮) → "Install app"
3. Click Install
4. App opens in a window 💻

## ⚙️ Setup & Configuration

### 1. Add Your MoneyReminderAI Component

**Option A: Direct Replacement**
```bash
# Copy your MoneyReminderAI.jsx file
cp /path/to/MoneyReminderAI.jsx app.js
```

**Option B: Manual Update**
1. Open `app.js` in your editor
2. Replace all content with your MoneyReminderAI.jsx code
3. Save the file
4. Refresh your browser

### 2. Google Sign-in Setup (Optional)

To enable Google backup:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable Google Drive API
4. Create OAuth 2.0 Credential (Web Application)
5. Add authorized origins:
   - `http://localhost:8000`
   - `https://yourdomain.com`
6. Copy your Client ID
7. In `app.js`, find `const GOOGLE_CLIENT_ID = "";` and paste your ID

### 3. Claude API Setup (Optional - for AI Assistant)

To enable AI financial insights:

1. Get API key from [Anthropic Console](https://console.anthropic.com)
2. Update the fetch call in the AI component with your API key
3. Or set it as an environment variable

⚠️ **Never commit API keys!** Use environment variables in production.

## 📊 Data Management

### Backup Your Data
1. Go to Settings
2. Click "Download Backup (JSON)"
3. Save the file to your computer

### Restore from Backup
1. Go to Settings
2. Click "Restore from Backup"
3. Select your JSON backup file
4. Refresh the app
5. Your data is restored! ✅

### Storage Limits
- **LocalStorage**: ~5-10MB
- **IndexedDB**: Browser-dependent (typically 50MB+)
- **Automatic fallback** between both

## 🌐 Deployment

### GitHub Pages (Free - Already Enabled)
```bash
# Already live at:
# https://malikmohdsalman20.github.io/MoneyReminderAI/

# To update:
git push origin main
# Changes live in ~5 minutes
```

### Vercel (Recommended - Fastest)
```bash
npm install -g vercel
vercel --prod
# Live in 1 minute!
```

### Netlify (Easy - Drag & Drop)
```bash
npm run build
# Drag the 'dist' or 'build' folder to Netlify
```

### Custom Domain
1. Go to your hosting provider
2. Point DNS to your deployed app
3. Add SSL certificate (auto with GitHub Pages/Vercel/Netlify)
4. Access at your custom domain

## 🔐 Privacy & Security

✅ **Data Privacy**
- All financial data stored locally on your device
- Nothing sent to external servers by default
- Optional Google Sign-in only if you enable it
- Export backups are your files to manage

✅ **Security Features**
- HTTPS enforced in production
- Service Worker validates all requests
- No cookies tracking
- No third-party analytics
- No ads

⚠️ **Best Practices**
- Use strong password if backed up online
- Keep browser and OS updated
- Review privacy settings regularly
- Export backups regularly
- Don't share your app URL publicly if sensitive data

## 🐛 Troubleshooting

### App not loading
```javascript
// Open DevTools Console (F12) and check:
navigator.serviceWorker.getRegistrations()
```
If empty, Service Worker didn't register. Check:
- HTTPS enabled (or localhost)
- manifest.json present
- Network tab in DevTools

### Data not saving
1. Check Storage in DevTools (F12 → Application → Storage)
2. Check if localStorage is enabled
3. Try IndexedDB (should auto-fallback)
4. Clear cache and refresh

### Install button not showing
- Must be HTTPS (except localhost)
- Must have valid manifest.json
- Service Worker must be registered
- Try clearing cache and refreshing

### Performance issues
- Reduce number of transactions
- Enable offline mode
- Check device storage
- Close other apps

## 📚 Documentation

- [Manifest.json](./manifest.json) - PWA configuration
- [Service Worker](./sw.js) - Offline support & caching
- [React Docs](https://react.dev) - React version info
- [MDN PWA Docs](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/) - PWA standards

## 🤝 Contributing

Found a bug or want to suggest a feature?

1. Check [existing issues](https://github.com/malikmohdsalman20/MoneyReminderAI/issues)
2. Create a new issue with details
3. Include device/browser info
4. Suggest improvements!

## 📄 License

MIT License - Free to use and modify

## 🎉 Credits

Built with:
- React 18
- Babel (JSX compilation)
- Service Workers (offline support)
- IndexedDB + LocalStorage
- Google Fonts (Nunito, DM Sans)

---

**Made with ❤️ for your financial freedom**

### Quick Links
- 🌐 [Live App](https://malikmohdsalman20.github.io/MoneyReminderAI/)
- 📦 [GitHub Repo](https://github.com/malikmohdsalman20/MoneyReminderAI)
- 🐛 [Report Issues](https://github.com/malikmohdsalman20/MoneyReminderAI/issues)
- 💬 [Discussions](https://github.com/malikmohdsalman20/MoneyReminderAI/discussions)
