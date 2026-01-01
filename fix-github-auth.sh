#!/bin/bash

# Fix GitHub Authentication Issues

echo "🔍 Checking current remote URL..."
git remote -v

echo ""
echo "🔧 Option 1: Switch to SSH (Recommended)"
echo "This will change the remote URL to use SSH instead of HTTPS"
echo ""
read -p "Switch to SSH? (y/n): " switch_ssh

if [ "$switch_ssh" = "y" ]; then
  # Get current remote URL
  CURRENT_URL=$(git remote get-url origin)
  
  # Convert HTTPS to SSH
  if [[ $CURRENT_URL == https://github.com/* ]]; then
    REPO_PATH=$(echo $CURRENT_URL | sed 's|https://github.com/||' | sed 's|\.git$||')
    NEW_URL="git@github.com:${REPO_PATH}.git"
    
    echo "Changing remote URL from:"
    echo "  $CURRENT_URL"
    echo "To:"
    echo "  $NEW_URL"
    
    git remote set-url origin "$NEW_URL"
    echo "✅ Remote URL updated to SSH"
  else
    echo "Remote is already using SSH or different format"
  fi
fi

echo ""
echo "🔐 Option 2: Check GitHub CLI authentication"
gh auth status

echo ""
echo "🔑 Option 3: Re-authenticate with GitHub"
read -p "Re-authenticate? (y/n): " reauth

if [ "$reauth" = "y" ]; then
  gh auth login
fi

echo ""
echo "✅ Done! Try pushing again with: git push"

