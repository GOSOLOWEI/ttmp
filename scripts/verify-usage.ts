import { prisma } from '../lib/prisma';

async function verify() {
  const cat = await prisma.category.findUnique({
    where: {
      level1Category_level2Category: {
        level1Category: '礼物与赠与',
        level2Category: '家庭或朋友赠与'
      }
    }
  });
  console.log('Category Usage Verification:', cat);
}

verify().catch(console.error);
