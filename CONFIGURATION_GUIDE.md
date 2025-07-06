# IronLogic Configuration Guide

## Environment Setup

Your IronLogic server is already configured to use environment variables for different deployment environments. Here's how to set it up:

## Local Development Configuration

Create a `.env` file in your project root for local development:

```env
# Database Configuration
MONGO_URL=mongodb://localhost:27017/ironlogic

# Server Configuration
PORT=3000
NODE_ENV=development

# Session Configuration
SESSION_SECRET=your-super-secret-key-change-this-in-production

# CORS Configuration (optional for local dev)
# CORS_ORIGIN=http://localhost:3000
```

## Cloud Deployment Configuration

For Railway, Render, or other cloud platforms, set these environment variables in your platform dashboard:

### Required Variables:
```env
MONGO_URL=mongodb://your-cloud-mongodb-connection-string
NODE_ENV=production
SESSION_SECRET=your-production-secret-key-make-it-long-and-random
```

### Optional Variables:
```env
PORT=3000
CORS_ORIGIN=https://your-frontend-domain.com
```

## Environment Variables Reference

| Variable | Description | Required | Local Default | Production |
|----------|-------------|----------|---------------|------------|
| `MONGO_URL` | Database connection string | Yes | `mongodb://localhost:27017/ironlogic` | Cloud MongoDB URI |
| `PORT` | Server port | No | `3000` | Platform assigned |
| `NODE_ENV` | Environment | No | `development` | `production` |
| `SESSION_SECRET` | Session encryption key | Yes | `your-secret-key` | Strong random string |
| `CORS_ORIGIN` | Allowed origins for CORS | No | `localhost` | Your frontend domain |

## Configuration Differences

### Local Development
- Uses local MongoDB instance
- HTTP cookies (not secure)
- Development logging
- Localhost CORS

### Cloud Production
- Uses cloud MongoDB
- HTTPS secure cookies
- Production logging
- Specific domain CORS

## Security Considerations

### Session Secret
- **Local**: Can use simple string
- **Production**: Use strong random string (32+ characters)

### CORS Origin
- **Local**: `http://localhost:3000` or `*`
- **Production**: Specific domain only (e.g., `https://your-app.com`)

### Database URI
- **Local**: `mongodb://localhost:27017/ironlogic`
- **Production**: Cloud provider connection string

## Testing Configuration

### Local Testing
```bash
# Start with local config
npm run dev
```

### Production Testing
```bash
# Test with production-like config
NODE_ENV=production SESSION_SECRET=test-secret npm start
```

## Platform-Specific Setup

### Railway
1. Go to your Railway project dashboard
2. Click on your service
3. Go to "Variables" tab
4. Add each environment variable

### Render
1. Go to your Render service dashboard
2. Click "Environment"
3. Add each environment variable

### Heroku
```bash
heroku config:set MONGO_URL=your-mongodb-uri
heroku config:set NODE_ENV=production
heroku config:set SESSION_SECRET=your-secret
```

## Validation

Your app will automatically:
- ✅ Use local MongoDB for development
- ✅ Use cloud MongoDB for production
- ✅ Enable secure cookies in production
- ✅ Apply appropriate CORS settings
- ✅ Use environment-specific logging

## Troubleshooting

### Common Issues:

1. **Database Connection Fails**
   - Check `MONGO_URL` is correct
   - Verify database is running/accessible
   - Check network connectivity

2. **Session Issues**
   - Ensure `SESSION_SECRET` is set
   - Check cookie settings for HTTPS
   - Verify session middleware is configured

3. **CORS Errors**
   - Set `CORS_ORIGIN` to your frontend domain
   - Don't use `*` in production
   - Check browser console for specific errors

4. **Build Failures**
   - Ensure all dependencies are in `package.json`
   - Check TypeScript configuration
   - Verify build scripts are correct

## Best Practices

1. **Never commit `.env` files** (already in `.gitignore`)
2. **Use different secrets** for each environment
3. **Rotate secrets** regularly in production
4. **Monitor logs** for configuration issues
5. **Test configuration** before deploying

Your app is already well-architected for multi-environment deployment! 