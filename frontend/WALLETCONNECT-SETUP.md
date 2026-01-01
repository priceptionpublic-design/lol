# WalletConnect Setup for Frontend

## 1. Get WalletConnect Project ID

1. Go to https://cloud.walletconnect.com
2. Sign up / Log in
3. Create a new project
4. Copy the **Project ID**

## 2. Update Environment Variables

Add to your `frontend/.env`:

```bash
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

## 3. How It Works

### **Multi-Step Signup with WalletConnect**

#### Step 1: Account Info
- User enters username, email, password, and referral code

#### Step 2: Connect Wallet
- Click "Connect Wallet" button
- WalletConnect modal appears with QR code
- **Desktop**: Scan QR with mobile wallet (MetaMask, Trust Wallet, etc.)
- **Mobile**: Deep links directly to wallet app
- Automatically verifies wallet is EOA (not a contract)

#### Step 3: USDC Approval (Optional)
- Approve 10,000 USDC spending
- Or skip and approve later

### **Supported Wallets**
- MetaMask (mobile & extension)
- Trust Wallet
- Coinbase Wallet
- Rainbow
- Ledger Live
- **300+ other wallets**

## 4. Features

✅ **EOA Verification**: Automatically rejects contract addresses  
✅ **Multi-Wallet Support**: Works with any WalletConnect-compatible wallet  
✅ **Mobile-Friendly**: QR code for desktop, deep links for mobile  
✅ **Optional Approval**: Users can skip USDC approval and do it later  
✅ **Error Handling**: Clear error messages for common issues

## 5. Testing

### Desktop:
1. Open signup page
2. Fill account info
3. Click "Connect Wallet"
4. Scan QR code with mobile wallet app
5. Approve connection in wallet
6. Complete registration

### Mobile:
1. Open signup page on mobile browser
2. Fill account info
3. Click "Connect Wallet"
4. WalletConnect automatically opens your wallet app
5. Approve connection
6. Complete registration

## 6. Fallback for Browser Extension Wallets

The implementation also supports browser extension wallets (MetaMask, Coinbase Wallet) automatically through WalletConnect's injected provider detection.

## 7. Network Configuration

Currently configured for:
- **Sepolia Testnet** (default)
- **Ethereum Mainnet** (production)

Update in `frontend/lib/web3modal.tsx` to add more networks.

