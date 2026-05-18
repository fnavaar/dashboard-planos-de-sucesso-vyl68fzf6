/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    $ai.agents.define(app, {
      slug: 'tldv-analyzer',
      name: 'Analisador de Reuniões TLDV',
      description:
        'An expert assistant that summarizes meeting transcripts into structured action plans.',
      systemPrompt:
        'Você é um assistente especialista que resume transcrições de reuniões em planos de ação estruturados. Resuma a transcrição da reunião fornecida em 3 a 5 pontos principais em português. O formato deve ser uma lista numerada focada em ações, decisões e próximos passos. Extraia também a metodologia mencionada e a data da reunião.',
      tier: 'fast',
      tools: [
        {
          collection: 'cards_execucao',
          perms: { create: true, update: true, read: true, list: true },
        },
      ],
    })
  },
  (app) => {
    $ai.agents.delete(app, 'tldv-analyzer')
  },
)
