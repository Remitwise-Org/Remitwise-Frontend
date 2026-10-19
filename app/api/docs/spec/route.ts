import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'openapi.yaml');
    const fileContents = fs.readFileSync(filePath, 'utf8');
    return new NextResponse(fileContents, {
      status: 200,
      headers: { 'Content-Type': 'text/yaml' },
    });
  } catch (error) {
    console.error('Failed to read openapi.yaml:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
