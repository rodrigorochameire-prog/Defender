-- Adicionar novas fontes ao radar criminal de Camaçari
-- Task 4: 12º BPM, Defesa Civil e Fala Camaçari

INSERT INTO radar_fontes (nome, tipo, url, ativo)
VALUES
  ('Fala Camaçari', 'portal', 'https://fala.camacari.ba.gov.br', true),
  ('12º BPM Camaçari', 'instagram', '@12bpmcamacari', true),
  ('Defesa Civil Camaçari', 'instagram', '@defesacivilcamacari', true)
ON CONFLICT DO NOTHING;
