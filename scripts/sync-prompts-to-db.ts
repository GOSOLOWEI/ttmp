import { prisma } from '../lib/prisma';
import { PROMPT_PRESETS } from '../lib/prompts/presets';

async function main() {
  for (const [key, preset] of Object.entries(PROMPT_PRESETS)) {
    await prisma.promptRegistry.upsert({
      where: {
        id_version: {
          id: preset.id,
          version: preset.version || 'v1.0',
        },
      },
      update: {},
      create: {
        id: preset.id,
        version: preset.version || 'v1.0',
        systemTemplate: typeof preset.system === 'string' ? preset.system : preset.system?.content,
        userTemplate: typeof preset.user === 'string' ? preset.user : preset.user?.content,
        config: preset.defaultOptions as any,
        isDefault: true,
      },
    });
  }
  console.log('Prompts 已同步到数据库');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
