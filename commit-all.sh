#!/bin/bash

# Commit all changes (contracts, backend, frontend) excluding mobile-app and sensitive files

echo "🔍 Checking git status..."
git status --short | head -20

echo ""
echo "📦 Adding files..."
echo ""

# Add .gitignore first
git add .gitignore

# Add contracts (excluding .env and cache)
git add contracts/src/
git add contracts/test/
git add contracts/script/
git add contracts/foundry.toml
git add contracts/Makefile
git add contracts/*.md
git add contracts/*.sh

# Add backend (excluding .env, node_modules, dist)
git add backend/src/
git add backend/package.json
git add backend/tsconfig.json
git add backend/*.md
git add backend/*.sql

# Add frontend (excluding .env, node_modules, .next)
git add frontend/app/
git add frontend/lib/
git add frontend/public/
git add frontend/package.json
git add frontend/next.config.*
git add frontend/tsconfig.json
git add frontend/tailwind.config.*
git add frontend/postcss.config.*
git add frontend/*.md

# Add root documentation files
git add *.md

echo ""
echo "📝 Checking what will be committed..."
git status --short

echo ""
echo "⚠️  Make sure no .env files or sensitive data are included!"
echo ""
read -p "Continue with commit? (y/n): " confirm

if [ "$confirm" = "y" ]; then
  echo ""
  read -p "Enter commit message: " commit_msg
  
  if [ -z "$commit_msg" ]; then
    commit_msg="feat: Add complete balance management system with contracts, backend, and frontend"
  fi
  
  git commit -m "$commit_msg"
  
  echo ""
  echo "✅ Committed! Now push with:"
  echo "   git push --set-upstream origin main"
else
  echo "❌ Cancelled. Files are staged but not committed."
fi

