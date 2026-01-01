import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(req, path);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(req, path);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(req, path);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(req, path);
}

async function proxyRequest(req: NextRequest, path: string[]) {
  let backendUrl = process.env.NEXT_PUBLIC_API_URL;
  
  if (!backendUrl) {
    return NextResponse.json({ error: 'Backend URL not configured' , backendUrl: backendUrl }, { status: 500 });
  }

  // Fix 0.0.0.0 for server-side internal calls
  if (backendUrl.includes('0.0.0.0')) {
    backendUrl = backendUrl.replace('0.0.0.0', 'localhost');
  }

  // Construct the target URL
  const targetPath = path.join('/');
  const searchParams = req.nextUrl.searchParams.toString();
  const targetUrl = `${backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl}/${targetPath}${searchParams ? `?${searchParams}` : ''}`;

  console.log(`[PROXY] Forwarding ${req.method} request to: ${targetUrl}`);

  try {
    const headers = new Headers(req.headers);
    // Remove host header to avoid conflicts
    headers.delete('host');
    
    // Get the request body if it's not a GET/HEAD request
    let body: any = null;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      body = await req.blob();
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: body,
      // For Node.js fetch
      cache: 'no-store',
    });

    const data = await response.text();
    
    // Create response with same status and headers
    const res = new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    });

    return res;
  } catch (error: any) {
    console.error(`[PROXY ERROR] ${targetUrl}:`, error);
    return NextResponse.json({ 
      error: 'Failed to connect to backend', 
      message: error.message,
      target: targetUrl 
    }, { status: 502 });
  }
}

