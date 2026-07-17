-- Supports UC-02's Deactivate action (distinct from Delete).
ALTER TABLE "users" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
