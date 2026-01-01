#!/bin/bash

cd "/Users/trymbakmahant/Projects/ShanProjectClone/new start app"

echo "🔍 Current submodule status:"
git submodule status

echo ""
echo "🗑️  Removing submodule references..."

# Remove from git index
git rm --cached backend 2>/dev/null || true
git rm --cached frontend 2>/dev/null || true

# Remove from .gitmodules
if [ -f .gitmodules ]; then
  git config -f .gitmodules --remove-section submodule.backend 2>/dev/null || true
  git config -f .gitmodules --remove-section submodule.frontend 2>/dev/null || true
  
  # Remove .gitmodules if empty or delete submodule sections
  if [ -f .gitmodules ]; then
    # Check if file has content
    if [ ! -s .gitmodules ]; then
      rm .gitmodules
      git rm --cached .gitmodules 2>/dev/null || true
    fi
  fi
fi

# Remove from .git/config
git config --file=.git/config --remove-section submodule.backend 2>/dev/null || true
git config --file=.git/config --remove-section submodule.frontend 2>/dev/null || true

# Remove submodule directories from .git/modules
rm -rf .git/modules/backend 2>/dev/null || true
rm -rf .git/modules/frontend 2>/dev/null || true

echo "✅ Submodule references removed"
echo ""
echo "📦 Now adding as regular directories..."

# Add everything (respecting .gitignore)
git add backend/
git add frontend/
git add contracts/
git add .gitignore
git add *.md *.sh 2>/dev/null || true

echo ""
echo "📊 Status after adding:"
git status --short | head -30

echo ""
echo "✅ Ready to commit!"
echo "Run: git commit -m 'feat: Add complete balance management system'"

