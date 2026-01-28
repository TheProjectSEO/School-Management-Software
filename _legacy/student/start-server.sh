#!/bin/bash

echo "🚀 Starting MSU Student Portal Dev Server..."
echo ""
echo "Server will run at: http://localhost:3000"
echo "Press Ctrl+C to stop"
echo ""
echo "Once server is running:"
echo "  1. Enable signups in Supabase"
echo "  2. Run: npm run verify-and-fix"
echo "  3. Test login at: http://localhost:3000/login"
echo ""

cd "$(dirname "$0")"
npm run dev
