#!/bin/bash

# Klase.ph Multi-Site Deployment Script
# Deploys all 4 applications to production

set -e  # Exit on any error

echo "🚀 Klase.ph Multi-Site Deployment"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to deploy an app
deploy_app() {
    local app_name=$1
    local config_file=$2
    local domain=$3

    echo ""
    echo "${YELLOW}📦 Deploying $app_name to $domain${NC}"
    echo "-----------------------------------"

    if vercel --prod --yes -A "$config_file"; then
        echo "${GREEN}✅ $app_name deployed successfully!${NC}"
        return 0
    else
        echo "${RED}❌ $app_name deployment failed!${NC}"
        return 1
    fi
}

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "${RED}❌ Vercel CLI not found!${NC}"
    echo "Install it with: npm i -g vercel"
    exit 1
fi

# Check if logged in
if ! vercel whoami &> /dev/null; then
    echo "${YELLOW}⚠️  Not logged into Vercel. Running: vercel login${NC}"
    vercel login
fi

echo "✅ Vercel CLI ready"
echo ""

# Build locally first
echo "${YELLOW}🔨 Building all apps locally first...${NC}"
if npm run build; then
    echo "${GREEN}✅ Local build successful!${NC}"
else
    echo "${RED}❌ Local build failed! Fix errors before deploying.${NC}"
    exit 1
fi

echo ""
echo "Starting deployments..."
echo ""

# Deploy each app
FAILED=0

deploy_app "Landing Page" "vercel-landing.json" "klase.ph" || FAILED=$((FAILED + 1))
deploy_app "Student Portal" "vercel-student.json" "student.klase.ph" || FAILED=$((FAILED + 1))
deploy_app "Teacher Portal" "vercel-teacher.json" "teachers.klase.ph" || FAILED=$((FAILED + 1))
deploy_app "Admin Portal" "vercel-admin.json" "admin.klase.ph" || FAILED=$((FAILED + 1))

# Summary
echo ""
echo "=================================="
echo "📊 Deployment Summary"
echo "=================================="

if [ $FAILED -eq 0 ]; then
    echo "${GREEN}✅ All 4 apps deployed successfully!${NC}"
    echo ""
    echo "Your sites are live at:"
    echo "  🌐 Landing:  https://klase.ph"
    echo "  🎓 Student:  https://student.klase.ph"
    echo "  👨‍🏫 Teacher:  https://teachers.klase.ph"
    echo "  👔 Admin:    https://admin.klase.ph"
    echo ""
    echo "${YELLOW}⏳ Note: DNS propagation may take up to 48 hours${NC}"
else
    echo "${RED}❌ $FAILED app(s) failed to deploy${NC}"
    echo "Check the error messages above and try again."
    exit 1
fi
