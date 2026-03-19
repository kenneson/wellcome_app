git add .
git commit -m "fix: impede alteração de status de participantes em eventos passados" -m "Bloqueia a aprovação, rejeição e cancelamento de inscrições caso o evento já tenha ocorrido. A validação foi implementada tanto visualmente na interface (escondendo os botões) quanto nas regras de negócio do backend (lançando erro em caso de tentativa indevida)."
