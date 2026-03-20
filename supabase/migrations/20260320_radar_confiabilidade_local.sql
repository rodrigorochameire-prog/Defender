-- Corrige confiabilidade dos portais exclusivos de Camaçari para "local"
-- Portais locais não precisam ter "camaçari" no título de cada link —
-- eles cobrem exclusivamente o município.

UPDATE radar_fontes
SET confiabilidade = 'local'
WHERE nome IN (
  'Camaçari Notícias',
  'Alô Camaçari',
  'Jornal Camaçari',
  'Blog do Valente',
  'Fala Camaçari'
);
