-- AlterTable
ALTER TABLE "leadflow_forms" ADD COLUMN     "metaConnectionId" TEXT;

-- CreateTable
CREATE TABLE "leadflow_meta_connections" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "pageName" TEXT NOT NULL,
    "pageAccessToken" TEXT NOT NULL,
    "userAccessToken" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leadflow_meta_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leadflow_meta_connections_pageId_key" ON "leadflow_meta_connections"("pageId");

-- CreateIndex
CREATE UNIQUE INDEX "leadflow_forms_externalFormId_key" ON "leadflow_forms"("externalFormId");

-- AddForeignKey
ALTER TABLE "leadflow_forms" ADD CONSTRAINT "leadflow_forms_metaConnectionId_fkey" FOREIGN KEY ("metaConnectionId") REFERENCES "leadflow_meta_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

