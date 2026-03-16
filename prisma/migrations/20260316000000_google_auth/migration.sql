ALTER TABLE "user" ALTER COLUMN "password_hash" DROP NOT NULL;

ALTER TABLE "user" ADD COLUMN "image" VARCHAR(500);

ALTER TABLE "user" ADD COLUMN "auth_provider" VARCHAR(50) NOT NULL DEFAULT 'credentials';

ALTER TABLE "user" ADD COLUMN "google_id" VARCHAR(255);

CREATE UNIQUE INDEX "user_google_id_key" ON "user"("google_id");