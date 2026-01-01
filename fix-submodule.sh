#!/bin/bash

# Fix submodule issue - convert submodules to regular directories

echo "🔍 Checking for submodules..."
git submodule status

echo ""
echo "🔧 Removing submodule references..."

# Remove frontend submodule if it exists
if [ -f .gitmodules ]; then
  echo "Found .gitmodules file"
  cat .gitmodules
  echo ""
  read -p "Remove frontend submodule? (y/n): " remove_frontend
  
  if [ "$remove_frontend" = "y" ]; then
    # Remove submodule entry from .gitmodules
    git config -f .gitmodules --remove-section submodule.frontend 2>/dev/null || true
    
    # Remove from git index
    git rm --cached frontend 2>/dev/null || true
    
    # Remove .gitmodules if empty
    if [ -f .gitmodules ] && [ ! -s .gitmodules ]; then
      rm .gitmodules
    fi
    
    echo "✅ Frontend submodule reference removed"
  fi
fi

# Check for backend submodule
if git ls-files --stage | grep -q "^160000.*backend"; then
  echo "Backend is also a submodule"
  read -p "Remove backend submodule? (y/n): " remove_backend
  
  if [ "$remove_backend" = "y" ]; then
    git config -f .gitmodules --remove-section submodule.backend 2>/dev/null || true
    git rm --cached backend 2>/dev/null || true
    echo "✅ Backend submodule reference removed"
  fi
fi

# Remove submodule directory from .git/config
git config --file=.git/config --remove-section submodule.frontend 2>/dev/null || true
git config --file=.git/config --remove-section submodule.backend 2>/dev/null || true

echo ""
echo "📦 Now add as regular directories..."
echo "Run: git add frontend backend"
echo "Then: git commit -m 'fix: Convert submodules to regular directories'"

