-- Aditivo: novo valor no enum vf_tipo_evento (isolado — ADD VALUE não pode ser usado na mesma transação em que é criado).
ALTER TYPE "public"."vf_tipo_evento" ADD VALUE IF NOT EXISTS 'OUTRA_AUSENCIA';
