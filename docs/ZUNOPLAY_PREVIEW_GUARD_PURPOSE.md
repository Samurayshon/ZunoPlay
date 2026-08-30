# Propósito dos guards de Preview

Os guards existem para impedir estado inseguro e registrar invariantes verificáveis. Eles não substituem testes funcionais nem devem proliferar para representar progresso fictício.

Após esta PR de segurança, novos workflows só devem ser adicionados se protegerem um risco real não coberto. A próxima prioridade é código de configuração por ambiente e evidência funcional.
