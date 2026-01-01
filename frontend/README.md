This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Environment

Add a `.env.local` file in `frontend/`:

```
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_USE_TESTNET=false
NEXT_PUBLIC_APP_DOWNLOAD_URL=https://example.com/your-app-download
```

`NEXT_PUBLIC_APP_DOWNLOAD_URL` powers the "Download App" button on `/landing`.
