# Railway 502 Error Troubleshooting

## Quick Fixes to Try:

### 1. Check Environment Variables in Railway Dashboard
Go to your Railway project → Service → Variables tab and ensure these are set:

```env
MONGODB_URL=mongodb://your-railway-mongodb-connection-string
NODE_ENV=production
SESSION_SECRET=your-production-secret-key
```

### 2. Check Railway Logs
1. Go to Railway dashboard
2. Click on your service
3. Go to "Deployments" tab
4. Click on latest deployment
5. Check "Build Logs" and "Deploy Logs"

### 3. Common Issues and Solutions:

#### **Issue: "Cannot find module" errors**
**Solution**: Railway isn't running build step
- Add `railway.json` file (already done)
- Add `postinstall` script to `package.json` (already done)

#### **Issue: Database connection fails**
**Solution**: Check MongoDB URI
- Verify `MONGODB_URI` is set correctly
- Ensure MongoDB service is running in Railway

#### **Issue: Port binding errors**
**Solution**: Railway handles this automatically
- Your app uses `process.env.PORT` correctly

#### **Issue: Missing dependencies**
**Solution**: Check `package.json`
- All dependencies should be in `dependencies`, not `devDependencies`

### 4. Manual Railway Configuration
If automatic detection fails:

1. **Go to Railway dashboard**
2. **Click on your service**
3. **Go to "Settings" tab**
4. **Set these values:**
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`

### 5. Test Locally with Production Settings
```bash
# Test with production-like environment
NODE_ENV=production npm start
```

### 6. Check Railway Logs for Specific Errors
Common error patterns:
- `Error: Cannot find module './config/database'` → Build issue
- `MongoServerSelectionError` → Database connection issue
- `EADDRINUSE` → Port binding issue
- `ENOENT: no such file or directory` → Missing files

### 7. Force Redeploy
1. **Go to Railway dashboard**
2. **Click "Deploy" button**
3. **Watch the logs** for specific errors

### 8. Verify Build Output
Check that these files exist in Railway:
- `dist/server.js`
- `dist/config/database.js`
- `dist/routes/` (all route files)

### 9. Database Connection Test
If MongoDB is the issue, try:
1. **Check MongoDB service** in Railway dashboard
2. **Verify connection string** format
3. **Test connection** locally with Railway's MongoDB URI

### 10. Last Resort: Fresh Deploy
1. **Delete Railway project**
2. **Create new project**
3. **Connect GitHub repo**
4. **Add MongoDB service**
5. **Set environment variables**
6. **Deploy**

## Expected Railway Logs:
```
✓ Build completed
✓ npm install completed
✓ npm run build completed
✓ npm start completed
✓ Server listening on port 3000
✓ MongoDB Connected
```

## If Still Getting 502:
1. **Check Railway status page** for platform issues
2. **Contact Railway support** with your logs
3. **Try Render as alternative** platform 