#!/bin/bash

echo "🔧 Setting up Automated Accessibility Checker..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

# Check Node.js version
node_version=$(node --version | cut -d'.' -f1 | cut -d'v' -f2)
if [ "$node_version" -lt 18 ]; then
    echo "❌ Node.js version 18 or higher is required. Current version: $(node --version)"
    exit 1
fi

echo "✅ Node.js $(node --version) detected"

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install backend dependencies"
    exit 1
fi

# Install Playwright browsers
echo "🎭 Installing Playwright browsers..."
npx playwright install chromium
if [ $? -ne 0 ]; then
    echo "❌ Failed to install Playwright browsers"
    exit 1
fi

cd ..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install frontend dependencies"
    exit 1
fi

cd ..

# Create reports directory
mkdir -p reports

# Make Flutter testing script executable (if it exists)
if [ -f "test_flutter_app.sh" ]; then
    chmod +x test_flutter_app.sh
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "To start the application:"
echo "1. Start the backend: cd backend && npm start"
echo "2. Start the frontend: cd frontend && npm start"
echo ""
echo "The application will be available at http://localhost:3000"
echo "API will be running at http://localhost:3001"