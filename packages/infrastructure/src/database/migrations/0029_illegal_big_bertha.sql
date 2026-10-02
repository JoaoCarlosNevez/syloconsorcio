ALTER TABLE "tasks" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
-- Tarefas já concluídas: a data vem do último 'task.completed' do log de
-- atividades; sem log (concluídas antes dele existir ou criadas já
-- concluídas), a última atualização da tarefa.
UPDATE "tasks" AS t
SET "completed_at" = coalesce(
  (
    SELECT max(al."created_at")
    FROM "activity_log" AS al
    WHERE al."action" = 'task.completed' AND al."entity_id" = t."id"
  ),
  t."updated_at"
)
WHERE t."status" = 'concluida' AND t."completed_at" IS NULL;
