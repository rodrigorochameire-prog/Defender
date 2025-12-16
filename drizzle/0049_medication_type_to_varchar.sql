/*
  # Alterar tipo de medicamento de ENUM para VARCHAR

  1. Alterações
    - Modifica a coluna `type` da tabela `medication_library`
    - Muda de ENUM('preventive', 'treatment', 'supplement') para VARCHAR(100)
    - Permite que tutores adicionem tipos customizados de medicamentos

  2. Motivo
    - Permitir flexibilidade para tutores criarem medicamentos com tipos personalizados
    - Mantém compatibilidade com tipos existentes
*/

-- Alterar a coluna type de ENUM para VARCHAR
ALTER TABLE medication_library
MODIFY COLUMN type VARCHAR(100) NOT NULL;
