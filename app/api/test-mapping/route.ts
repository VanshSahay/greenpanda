import { NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

export async function GET() {
  try {
    // Test database connection
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    
    // Get count of mappings
    const count = await prisma.instagramWalletMapping.count();
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      test: result,
      mappingCount: count
    });
  } catch (error) {
    console.error('Database test failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Database connection failed'
      },
      { status: 500 }
    );
  }
}
