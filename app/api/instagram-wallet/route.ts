import { NextRequest, NextResponse } from 'next/server';
import { 
  upsertInstagramWalletMapping, 
  getWalletAddressByInstagram, 
  getInstagramByWalletAddress,
  deleteInstagramWalletMapping, 
  prisma
} from '@/lib/database';

// POST: Create or update Instagram username to wallet address mapping
export async function POST(request: NextRequest) {
  try {
    const { instagramUsername, walletAddress } = await request.json();

    if (!instagramUsername || !walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Instagram username and wallet address are required' },
        { status: 400 }
      );
    }

    // Validate wallet address format (basic check)
    if (!walletAddress.startsWith('0x') || walletAddress.length !== 42) {
      return NextResponse.json(
        { success: false, error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    const result = await upsertInstagramWalletMapping(instagramUsername, walletAddress);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Mapping created/updated successfully',
        mapping: result.mapping
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in POST /api/instagram-wallet:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET: Retrieve mapping by Instagram username or wallet address, or get all mappings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instagramUsername = searchParams.get('instagramUsername');
    const walletAddress = searchParams.get('walletAddress');
    const getAll = searchParams.get('all') === 'true';

    // If no specific parameters, return all mappings (for admin purposes)
    if (!instagramUsername && !walletAddress && !getAll) {
      return NextResponse.json(
        { success: false, error: 'Either instagramUsername, walletAddress, or all=true query parameter is required' },
        { status: 400 }
      );
    }

    // Get all mappings
    if (getAll) {
      const allMappings = await prisma.instagramWalletMapping.findMany({
        orderBy: { createdAt: 'desc' }
      });
      return NextResponse.json({
        success: true,
        mappings: allMappings
      });
    }

    let result;
    if (instagramUsername) {
      result = await getWalletAddressByInstagram(instagramUsername);
      if (result.success) {
        return NextResponse.json({
          success: true,
          instagramUsername,
          walletAddress: result.walletAddress
        });
      }
    } else if (walletAddress) {
      result = await getInstagramByWalletAddress(walletAddress);
      if (result.success) {
        return NextResponse.json({
          success: true,
          walletAddress,
          instagramUsername: result.instagramUsername
        });
      }
    }

    if (!result?.success) {
      return NextResponse.json(
        { success: false, error: result?.error || 'Unknown error' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'No mapping found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error in GET /api/instagram-wallet:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Remove mapping by Instagram username
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instagramUsername = searchParams.get('instagramUsername');

    if (!instagramUsername) {
      return NextResponse.json(
        { success: false, error: 'Instagram username query parameter is required' },
        { status: 400 }
      );
    }

    const result = await deleteInstagramWalletMapping(instagramUsername);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Mapping deleted successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in DELETE /api/instagram-wallet:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
