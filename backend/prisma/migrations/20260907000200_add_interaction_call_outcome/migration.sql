-- Resultado estructurado para llamadas comerciales, y fecha de seguimiento
-- opcional. Nulos para interacciones de tipo "visit" (solo tienen sentido
-- en llamadas; se valida en el backend, no aquí, para no acoplar la
-- restricción a un único tipo si en el futuro se reutiliza).

CREATE TYPE call_outcome AS ENUM ('sale_closed', 'interested', 'not_interested', 'call_back');

ALTER TABLE interactions ADD COLUMN outcome call_outcome;
ALTER TABLE interactions ADD COLUMN follow_up_at TIMESTAMPTZ;
