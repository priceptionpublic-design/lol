# Fix GitHub Authentication Error

## Problem
```
remote: Permission to priceptionpublic-design/lol.git denied to Trymbakmahant.
fatal: unable to access 'https://github.com/priceptionpublic-design/lol.git/': The requested URL returned error: 403
```

## Solution Options

### Option 1: Switch to SSH (Recommended)

**Step 1: Check if you have SSH keys**
```bash
ls -la ~/.ssh/id_*.pub
```

**Step 2: If no SSH key, generate one**
```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
# Press Enter to accept default location
# Press Enter for no passphrase (or set one)

# Copy public key
cat ~/.ssh/id_ed25519.pub
# Copy the output and add it to GitHub: Settings > SSH and GPG keys > New SSH key
```

**Step 3: Change remote to SSH**
```bash
cd "/Users/trymbakmahant/Projects/ShanProjectClone/new start app"
git remote set-url origin git@github.com:priceptionpublic-design/lol.git
```

**Step 4: Test connection**
```bash
ssh -T git@github.com
# Should say: "Hi Trymbakmahant! You've successfully authenticated..."
```

**Step 5: Push again**
```bash
git push --set-upstream origin main
```

---

### Option 2: Use Personal Access Token (HTTPS)

**Step 1: Create Personal Access Token**
1. Go to: https://github.com/settings/tokens
2. Click "Generate new token" > "Generate new token (classic)"
3. Name it: "Git Push Token"
4. Select scopes: `repo` (full control of private repositories)
5. Click "Generate token"
6. **COPY THE TOKEN** (you won't see it again!)

**Step 2: Update remote URL with token**
```bash
cd "/Users/trymbakmahant/Projects/ShanProjectClone/new start app"
git remote set-url origin https://YOUR_TOKEN@github.com/priceptionpublic-design/lol.git
```

**Or use credential helper:**
```bash
git remote set-url origin https://github.com/priceptionpublic-design/lol.git
git push
# When prompted:
# Username: Trymbakmahant
# Password: YOUR_TOKEN (paste the token, not your password)
```

---

### Option 3: Use GitHub CLI (gh)

**Step 1: Login with gh**
```bash
gh auth login
# Select: GitHub.com
# Select: HTTPS
# Authenticate: Login with a web browser
# Follow the prompts
```

**Step 2: Configure git to use gh**
```bash
gh auth setup-git
```

**Step 3: Push**
```bash
git push --set-upstream origin main
```

---

### Option 4: Check Repository Access

**Verify you have write access:**
1. Go to: https://github.com/priceptionpublic-design/lol
2. Check if you're a collaborator or have write access
3. If not, ask the repository owner to add you

---

## Quick Fix (Try This First)

Run these commands:

```bash
cd "/Users/trymbakmahant/Projects/ShanProjectClone/new start app"

# Switch to SSH
git remote set-url origin git@github.com:priceptionpublic-design/lol.git

# Test SSH connection
ssh -T git@github.com

# If SSH works, push
git push --set-upstream origin main
```

If SSH doesn't work, use Option 2 (Personal Access Token).

