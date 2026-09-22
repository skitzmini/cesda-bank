-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('ACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "PixType" AS ENUM ('CPF', 'EMAIL', 'PHONE', 'RANDOM');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('PIX_SENT', 'PIX_RECEIVED', 'DEPOSIT', 'PURCHASE', 'TRANSFER', 'REFUND');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('ALIMENTACAO', 'TRANSPORTE', 'COMPRAS', 'LAZER', 'EDUCACAO', 'SAUDE', 'ASSINATURAS', 'CASA', 'VIAGEM', 'OUTROS');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "cpf" VARCHAR(11) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "phone" VARCHAR(15) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "birthDate" DATE NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "agency" TEXT NOT NULL DEFAULT '0001',
    "accountNumber" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "dailyPixLimit" INTEGER NOT NULL DEFAULT 500000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PixKey" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "type" "PixType" NOT NULL,
    "key" VARCHAR(254) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PixKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "counterpartyAccountId" UUID,
    "type" "TransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" VARCHAR(140) NOT NULL,
    "category" "Category" NOT NULL DEFAULT 'OUTROS',
    "status" "TransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    "transactionCode" TEXT NOT NULL,
    "operationId" UUID NOT NULL,
    "idempotencyKey" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Idempotency" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "key" UUID NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "transactionId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Idempotency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "lastFour" TEXT NOT NULL,
    "demoNumber" TEXT NOT NULL,
    "holder" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "event" TEXT NOT NULL,
    "resourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "refreshHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_cpf_key" ON "User"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Account_userId_key" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_accountNumber_key" ON "Account"("accountNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PixKey_key_key" ON "PixKey"("key");

-- CreateIndex
CREATE INDEX "PixKey_accountId_idx" ON "PixKey"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_transactionCode_key" ON "Transaction"("transactionCode");

-- CreateIndex
CREATE INDEX "Transaction_accountId_createdAt_idx" ON "Transaction"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "Transaction_accountId_type_createdAt_idx" ON "Transaction"("accountId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "Transaction_operationId_idx" ON "Transaction"("operationId");

-- CreateIndex
CREATE UNIQUE INDEX "Idempotency_accountId_key_key" ON "Idempotency"("accountId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Card_demoNumber_key" ON "Card"("demoNumber");

-- CreateIndex
CREATE INDEX "Card_accountId_idx" ON "Card"("accountId");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Session_refreshHash_key" ON "Session"("refreshHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PixKey" ADD CONSTRAINT "PixKey_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_counterpartyAccountId_fkey" FOREIGN KEY ("counterpartyAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Idempotency" ADD CONSTRAINT "Idempotency_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Account" ADD CONSTRAINT "balance_range" CHECK ("balance" >= 0 AND "balance" <= 100000000), ADD CONSTRAINT "positive_daily_limit" CHECK ("dailyPixLimit" > 0); ALTER TABLE "Transaction" ADD CONSTRAINT "positive_amount" CHECK ("amount" > 0);
