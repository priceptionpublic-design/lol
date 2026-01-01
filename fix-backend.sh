#!/bin/bash

cd "/Users/trymbakmahant/Projects/ShanProjectClone/new start app"

echo "🔍 Checking backend status..."
if [ -d "backend/.git" ]; then
  echo "⚠️  Backend has its own .git folder (embedded repository)"
  echo "This needs to be removed to add it as regular files"
  echo ""
  read -p "Remove backend/.git? (y/n): " remove_git
  
  if [ "$remove_git" = "y" ]; then
    # Remove backend's git repository
    rm -rf backend/.git
    echo "✅ Removed backend/.git"
  else
    echo "❌ Cancelled. Backend will remain as embedded repository."
    exit 1
  fi
fi

echo ""
echo "🗑️  Removing any submodule references..."
git rm --cached backend 2>/dev/null || true
git config --file=.git/config --remove-section submodule.backend 2>/dev/null || true
rm -rf .git/modules/backend 2>/dev/null || true

echo ""
echo "📦 Adding backend as regular directory..."
git add backend/

echo ""
echo "📊 Status:"
git status --short | grep backend

echo ""
echo "✅ Backend ready to commit!"
echo "Run: git add . && git commit -m 'feat: Add backend code' && git push"

