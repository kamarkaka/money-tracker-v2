CREATE TABLE "user_setting" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "theme" VARCHAR(20) NOT NULL DEFAULT 'system',

    CONSTRAINT "user_setting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_setting_user_id_key" ON "user_setting"("user_id");

ALTER TABLE "user_setting" ADD CONSTRAINT "user_setting_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;