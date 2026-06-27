ALTER TABLE "User"
ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN "emailVerificationRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "emailVerificationTokenHash" TEXT,
ADD COLUMN "emailVerificationExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_emailVerificationTokenHash_key"
ON "User"("emailVerificationTokenHash");
