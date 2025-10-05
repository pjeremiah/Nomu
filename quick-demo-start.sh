#!/bin/bash

# 🚀 Quick Demo Start Script for Linux/Mac
# This script will start all required services for the live demo

echo "🎯 Starting NOMU Security Demo Services..."
echo "================================================"

# Check if Node.js is installed
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js version: $NODE_VERSION"
else
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if MongoDB is running
if mongosh --eval "db.runCommand('ping')" --quiet &> /dev/null; then
    echo "✅ MongoDB is running"
else
    echo "⚠️  MongoDB might not be running. Please start MongoDB manually."
    echo "   Run: mongod"
fi

# Function to start a service
start_service() {
    local service_name=$1
    local working_directory=$2
    local command=$3
    
    echo "🚀 Starting $service_name..."
    cd "$working_directory"
    nohup $command > "../${service_name// /_}.log" 2>&1 &
    local pid=$!
    sleep 2
    echo "✅ $service_name started (PID: $pid)"
    echo $pid
}

# Start Mobile Client Backend
CLIENT_PID=$(start_service "Mobile Client Backend" "02-mobile-client/mobile-backend" "npm start")

# Start Mobile Barista Backend
BARISTA_PID=$(start_service "Mobile Barista Backend" "03-mobile-barista/mobile-barista-backend" "npm start")

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 10

# Check if services are running
echo "🔍 Checking service health..."

if curl -s http://localhost:5000/api/health > /dev/null; then
    echo "✅ Mobile Client Backend is healthy"
else
    echo "❌ Mobile Client Backend is not responding"
fi

if curl -s http://localhost:5002/api/health > /dev/null; then
    echo "✅ Mobile Barista Backend is healthy"
else
    echo "❌ Mobile Barista Backend is not responding"
fi

echo ""
echo "🎉 Demo services are ready!"
echo "================================================"
echo "📱 Mobile Client Backend: http://localhost:5000"
echo "👨‍💼 Mobile Barista Backend: http://localhost:5002"
echo ""
echo "🎬 To run the demos:"
echo "   Client Demo: cd 02-mobile-client/mobile-backend && node demo-security-live.js"
echo "   Barista Demo: cd 03-mobile-barista/mobile-barista-backend && node demo-security-live.js"
echo ""

# Cleanup function
cleanup() {
    echo "🛑 Stopping all services..."
    kill $CLIENT_PID 2>/dev/null
    kill $BARISTA_PID 2>/dev/null
    echo "✅ All services stopped"
    exit 0
}

# Register cleanup on exit
trap cleanup EXIT INT TERM

echo "Press Ctrl+C to stop all services..."
echo "Demo setup complete! Services are running in background."

# Keep script running
while true; do
    sleep 1
done
