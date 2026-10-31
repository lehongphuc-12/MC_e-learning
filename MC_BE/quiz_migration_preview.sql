START TRANSACTION;
ALTER TABLE quizzes ADD "ModuleID" integer;

ALTER TABLE quizzes ADD "Purpose" integer NOT NULL DEFAULT 1;

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20261019145552_InspectPendingQuizChanges', '9.0.0');

COMMIT;

