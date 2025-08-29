import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Helper function to create or update Instagram username to wallet address mapping
export async function upsertInstagramWalletMapping(
  instagramUsername: string,
  walletAddress: string
) {
  try {
    const mapping = await prisma.instagramWalletMapping.upsert({
      where: { instagramUsername },
      update: { walletAddress },
      create: {
        instagramUsername,
        walletAddress,
      },
    });
    return { success: true, mapping };
  } catch (error) {
    console.error('Error upserting Instagram wallet mapping:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Helper function to get wallet address by Instagram username
export async function getWalletAddressByInstagram(instagramUsername: string) {
  try {
    const mapping = await prisma.instagramWalletMapping.findUnique({
      where: { instagramUsername },
    });
    return { success: true, walletAddress: mapping?.walletAddress || null };
  } catch (error) {
    console.error('Error getting wallet address by Instagram username:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Helper function to get Instagram username by wallet address
export async function getInstagramByWalletAddress(walletAddress: string) {
  try {
    const mapping = await prisma.instagramWalletMapping.findUnique({
      where: { walletAddress },
    });
    return { success: true, instagramUsername: mapping?.instagramUsername || null };
  } catch (error) {
    console.error('Error getting Instagram username by wallet address:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Helper function to delete mapping
export async function deleteInstagramWalletMapping(instagramUsername: string) {
  try {
    await prisma.instagramWalletMapping.delete({
      where: { instagramUsername },
    });
    return { success: true };
  } catch (error) {
    console.error('Error deleting Instagram wallet mapping:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
