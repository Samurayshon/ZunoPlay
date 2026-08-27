# Zuno Base Avatar v1 — Rig oficial

O Zuno Base Avatar v1 deve usar um único esqueleto compartilhado entre os presets masculino e feminino. Todas as roupas, cabelos e acessórios animados devem ser produzidos para este rig.

## Direção visual

3D estilizado/anime premium, jovem, expressivo, com proporções humanas levemente caricatas. O rosto deve ter olhos maiores e expressivos, cabelo volumétrico modular e acabamento PBR limpo. A identidade visual principal é preto, roxo e branco.

## Ossos mínimos

- Hips
- Spine
- Spine1
- Spine2
- Neck
- Head
- LeftShoulder / RightShoulder
- LeftArm / RightArm
- LeftForeArm / RightForeArm
- LeftHand / RightHand
- LeftUpLeg / RightUpLeg
- LeftLeg / RightLeg
- LeftFoot / RightFoot
- LeftToeBase / RightToeBase

## Regras de compatibilidade

1. Masculino e feminino devem compartilhar exatamente os mesmos nomes de ossos e hierarquia.
2. Roupas devem ser SkinnedMesh e usar o mesmo rig `zuno-humanoid-v1`.
3. Nenhuma peça pode depender de posição fixa no mundo.
4. Todas as peças devem acompanhar animações, poses e rotação do avatar.
5. O avatar deve ser exportado em GLB com transformações aplicadas e escala consistente.
6. Roupas devem ser testadas nos extremos de altura, peso, musculatura, peito, cintura e quadril.
7. Cabelos podem ser skinned ou rigidamente presos à cabeça, conforme o modelo.
8. Acessórios rígidos devem ser presos ao osso correspondente.

## Morph targets esperados

Corpo: altura, peso, musculatura, ombros, peito, cintura, quadril, braços e pernas.

Rosto: largura/altura da cabeça, olhos, sobrancelhas, nariz, boca, lábios, mandíbula, queixo, bochechas e orelhas.

## Slots oficiais

`top`, `outerwear`, `bottom`, `footwear`, `hair`, `head`, `face`, `neck`, `back`.

Este arquivo é a especificação de compatibilidade para todos os futuros assets oficiais do Zuno Avatar Studio.