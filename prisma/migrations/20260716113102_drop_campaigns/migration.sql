-- DropForeignKey
ALTER TABLE "leadflow_forms" DROP CONSTRAINT "leadflow_forms_campaignId_fkey";

-- AlterTable
ALTER TABLE "leadflow_forms" DROP COLUMN "campaignId";

-- DropTable
DROP TABLE "leadflow_campaigns";

-- DropEnum
DROP TYPE "leadflow_campaign_status";

