-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "leadflow_lead_status" AS ENUM ('NEW', 'ASSIGNED', 'ERROR');

-- CreateEnum
CREATE TYPE "leadflow_campaign_status" AS ENUM ('ACTIVE', 'PAUSED');

-- CreateTable
CREATE TABLE "leadflow_campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" "leadflow_campaign_status" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leadflow_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leadflow_roulettes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leadflow_roulettes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leadflow_roulette_members" (
    "rouletteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastAssignedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leadflow_roulette_members_pkey" PRIMARY KEY ("rouletteId","userId")
);

-- CreateTable
CREATE TABLE "leadflow_forms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalFormId" TEXT,
    "campaignId" TEXT,
    "roletaId" TEXT,
    "defaultUserId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "webhookSecret" TEXT NOT NULL,
    "fieldMappings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leadflow_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leadflow_leads" (
    "id" TEXT NOT NULL,
    "fullName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "source" TEXT NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "formId" TEXT,
    "assignedUserId" TEXT,
    "roletaId" TEXT,
    "status" "leadflow_lead_status" NOT NULL DEFAULT 'NEW',
    "errorReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedAt" TIMESTAMP(3),

    CONSTRAINT "leadflow_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leadflow_admin_users" (
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leadflow_admin_users_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "leadflow_teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leadflow_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leadflow_team_members" (
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leadflow_team_members_pkey" PRIMARY KEY ("teamId","userId")
);

-- CreateIndex
CREATE INDEX "leadflow_roulette_members_rouletteId_lastAssignedAt_idx" ON "leadflow_roulette_members"("rouletteId", "lastAssignedAt");

-- CreateIndex
CREATE UNIQUE INDEX "leadflow_forms_webhookSecret_key" ON "leadflow_forms"("webhookSecret");

-- CreateIndex
CREATE INDEX "leadflow_leads_assignedUserId_idx" ON "leadflow_leads"("assignedUserId");

-- CreateIndex
CREATE INDEX "leadflow_leads_email_idx" ON "leadflow_leads"("email");

-- CreateIndex
CREATE INDEX "leadflow_leads_phone_idx" ON "leadflow_leads"("phone");

-- CreateIndex
CREATE INDEX "leadflow_leads_status_idx" ON "leadflow_leads"("status");

-- CreateIndex
CREATE INDEX "leadflow_teams_managerId_idx" ON "leadflow_teams"("managerId");

-- AddForeignKey
ALTER TABLE "leadflow_roulette_members" ADD CONSTRAINT "leadflow_roulette_members_rouletteId_fkey" FOREIGN KEY ("rouletteId") REFERENCES "leadflow_roulettes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leadflow_forms" ADD CONSTRAINT "leadflow_forms_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "leadflow_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leadflow_forms" ADD CONSTRAINT "leadflow_forms_roletaId_fkey" FOREIGN KEY ("roletaId") REFERENCES "leadflow_roulettes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leadflow_leads" ADD CONSTRAINT "leadflow_leads_formId_fkey" FOREIGN KEY ("formId") REFERENCES "leadflow_forms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leadflow_leads" ADD CONSTRAINT "leadflow_leads_roletaId_fkey" FOREIGN KEY ("roletaId") REFERENCES "leadflow_roulettes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leadflow_team_members" ADD CONSTRAINT "leadflow_team_members_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "leadflow_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

