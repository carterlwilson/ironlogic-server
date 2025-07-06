# IronLogic Server Deployment Guide

## Overview

This guide covers deploying the IronLogic server to cloud platforms with a focus on Railway and Render, which offer robust free tiers for development.

## Platform Recommendations

### 1. Railway (Recommended)
- **Free tier**: $5/month credit
- **Pros**: Easy deployment, built-in MongoDB, no credit card required
- **Best for**: Quick setup, development, testing

### 2. Render
- **Free tier**: Free web services + $5/month for databases
- **Pros**: Reliable, good documentation, automatic deployments
- **Best for**: Production-ready development

## Pre-Deployment Checklist

### 1. Environment Variables
Create a `.env` file for local development:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/ironlogic

# Server
PORT=3000
NODE_ENV=development

# Session
SESSION_SECRET=your-super-secret-key-change-this

# CORS (for production)
CORS_ORIGIN=https://your-frontend-domain.com
```

### 2. Package.json Scripts
Your `package.json` should have these scripts:

```json
{
  "scripts": {
    "start": "node dist/server.js",
    "dev": "nodemon src/server.ts",
    "build": "tsc",
    "postinstall": "npm run build"
  }
}
```

## Railway Deployment

### Step 1: Prepare Your Repository
1. Ensure your code is pushed to GitHub
2. Make sure you have a `package.json` with proper scripts
3. Verify your `tsconfig.json` is configured correctly

### Step 2: Deploy to Railway
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Railway will automatically detect it's a Node.js app

### Step 3: Add MongoDB Database
1. In your Railway project dashboard
2. Click "New" → "Database" → "MongoDB"
3. Railway will create a MongoDB instance
4. Copy the connection string from the MongoDB service

### Step 4: Configure Environment Variables
In your Railway project dashboard:

```env
MONGODB_URI=mongodb://railway-mongodb-connection-string
NODE_ENV=production
SESSION_SECRET=your-production-secret-key
CORS_ORIGIN=https://your-frontend-domain.com
```

### Step 5: Deploy
1. Railway will automatically deploy when you push to GitHub
2. Your app will be available at `https://your-app-name.railway.app`

## Render Deployment

### Step 1: Prepare Your Repository
Same as Railway preparation.

### Step 2: Create Web Service
1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Click "New" → "Web Service"
4. Connect your GitHub repository
5. Configure:
   - **Name**: `ironlogic-server`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

### Step 3: Add MongoDB Database
1. Click "New" → "MongoDB"
2. Choose a plan (Free tier available)
3. Note the connection string

### Step 4: Configure Environment Variables
In your Render web service dashboard:

```env
MONGODB_URI=mongodb://render-mongodb-connection-string
NODE_ENV=production
SESSION_SECRET=your-production-secret-key
CORS_ORIGIN=https://your-frontend-domain.com
```

### Step 5: Deploy
1. Render will automatically deploy
2. Your app will be available at `https://your-app-name.onrender.com`

## Environment Variables Reference

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `MONGODB_URI` | MongoDB connection string | Yes | `mongodb://localhost:27017/ironlogic` |
| `PORT` | Server port | No (default: 3000) | `3000` |
| `NODE_ENV` | Environment | No (default: development) | `production` |
| `SESSION_SECRET` | Session encryption key | Yes | `your-secret-key` |
| `CORS_ORIGIN` | Allowed origins for CORS | No | `https://your-frontend.com` |

## Database Migration

### Option 1: Manual Migration
1. Export your local data:
   ```bash
   mongodump --db ironlogic --out ./backup
   ```

2. Import to cloud database:
   ```bash
   mongorestore --uri="your-cloud-mongodb-uri" ./backup/ironlogic
   ```

### Option 2: Fresh Start
- Start with empty database
- Create admin user via API
- Add data through your application

## Creating Admin User

After deployment, create your first admin user:

```bash
curl -X POST https://your-app.railway.app/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "your-secure-password",
    "role": "admin"
  }'
```

## Testing Your Deployment

### 1. Health Check
```bash
curl https://your-app.railway.app/api/health
```

### 2. Authentication Test
```bash
curl -X POST https://your-app.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your-password"
  }'
```

### 3. API Test
```bash
curl https://your-app.railway.app/api/programs
```

## Troubleshooting

### Common Issues:

1. **Build Failures**
   - Check your `package.json` scripts
   - Verify TypeScript configuration
   - Check for missing dependencies

2. **Database Connection Issues**
   - Verify `MONGODB_URI` is correct
   - Check if database service is running
   - Ensure network access is allowed

3. **CORS Issues**
   - Set `CORS_ORIGIN` to your frontend domain
   - For development: `http://localhost:3000`
   - For production: `https://your-frontend.com`

4. **Session Issues**
   - Ensure `SESSION_SECRET` is set
   - Check cookie settings for HTTPS

## Security Considerations

### 1. Environment Variables
- Never commit secrets to Git
- Use platform-specific secret management
- Rotate secrets regularly

### 2. CORS Configuration
- Only allow necessary origins
- Don't use `*` in production
- Configure for your specific frontend domain

### 3. Session Security
- Use strong session secrets
- Enable secure cookies in production
- Set appropriate session timeouts

## Monitoring and Logs

### Railway
- View logs in the Railway dashboard
- Set up alerts for errors
- Monitor resource usage

### Render
- View logs in the Render dashboard
- Set up webhook notifications
- Monitor service health

## Cost Optimization

### Railway
- Free tier: $5/month credit
- Monitor usage in dashboard
- Scale down when not needed

### Render
- Free tier: Free web services
- Database: $5/month minimum
- Monitor usage to stay within limits

## Next Steps

1. **Set up CI/CD**: Configure automatic deployments
2. **Add monitoring**: Set up error tracking (Sentry)
3. **Configure domains**: Add custom domain names
4. **Set up backups**: Configure database backups
5. **Add SSL**: Ensure HTTPS is enabled

## Support Resources

- **Railway**: [docs.railway.app](https://docs.railway.app)
- **Render**: [render.com/docs](https://render.com/docs)
- **MongoDB Atlas**: [docs.atlas.mongodb.com](https://docs.atlas.mongodb.com)

This deployment setup will give you a robust development environment with minimal cost and maximum reliability. 