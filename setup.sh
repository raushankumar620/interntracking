#!/bin/bash

# Render Deployment Script for Backend

echo "=================================="
echo "Backend Deployment Setup"
echo "=================================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from example..."
    cp .env.example .env
    echo "✅ Created .env file. Please update it with your values:"
    echo "   - MONGODB_URI"
    echo "   - JWT_SECRET (already generated)"
    echo "   - Other configurations"
    echo ""
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if MongoDB URI is set
if grep -q "your_mongodb_connection_string_here" .env 2>/dev/null; then
    echo ""
    echo "⚠️  WARNING: Please update MONGODB_URI in .env file"
    echo ""
fi

echo ""
echo "=================================="
echo "✅ Setup Complete!"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Update .env file with your MongoDB connection string"
echo "2. Push code to GitHub"
echo "3. Deploy on Render.com"
echo "4. See QUICK_DEPLOY.md for detailed steps"
echo ""
