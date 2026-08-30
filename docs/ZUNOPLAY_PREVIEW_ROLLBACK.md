# Rollback da proposta de Preview

Enquanto esta proposta não estiver integrada, rollback é simplesmente fechar a PR/descartar a branch; produção não é afetada.

Após integração de guards, qualquer regressão deve ser revertida por PR normal em `main`, seguida de CI e novo deploy GitHub Pages. Não usar force-push da main.
