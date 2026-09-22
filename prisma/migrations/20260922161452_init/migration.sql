-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CheckStatus" AS ENUM ('PASS', 'WARNING', 'FAIL');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('HIGH', 'MEDIUM', 'LOW', 'PASS');

-- CreateTable
CREATE TABLE "Scan" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "normalizedUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "score" INTEGER NOT NULL,
    "httpsStatus" "CheckStatus" NOT NULL,
    "headersStatus" "CheckStatus" NOT NULL,
    "cookiesStatus" "CheckStatus" NOT NULL,
    "infoDisclosureStatus" "CheckStatus" NOT NULL,
    "exposureStatus" "CheckStatus" NOT NULL,
    "httpMethodsStatus" "CheckStatus" NOT NULL,
    "rawResult" JSONB NOT NULL,
    "aiSummaries" JSONB,

    CONSTRAINT "Scan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Finding" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "titleKey" TEXT NOT NULL,
    "titleParams" JSONB,
    "descriptionKey" TEXT NOT NULL,
    "descriptionParams" JSONB,
    "recommendationKey" TEXT NOT NULL,
    "recommendationParams" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Finding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Scan_normalizedUrl_createdAt_idx" ON "Scan"("normalizedUrl", "createdAt");

-- CreateIndex
CREATE INDEX "Finding_scanId_idx" ON "Finding"("scanId");

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

