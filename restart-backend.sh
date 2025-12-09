#!/bin/bash

echo "🔄 Restarting SmartWallet Backend Server..."
echo ""

# Navigate to server directory
cd "$(dirname "$0")/server"

# Kill existing server process
echo "📛 Stopping existing server..."
pkill -f "node.*index" || pkill -f "ts-node.*index" || echo "No existing server found"
sleep 2

# Start the server
echo "🚀 Starting server..."
npm run dev &

echo ""
echo "✅ Backend server is restarting..."
echo "📝 Check the logs above for any errors"
echo "🌐 Server should be available at http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop the server"
