-- Create PaymentStatus enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentStatus') THEN
        CREATE TYPE public."PaymentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'EXPIRED', 'REFUNDED');
    END IF;
END$$;

-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL UNIQUE,
    event_id UUID NOT NULL,
    user_id UUID NOT NULL,
    txid TEXT NOT NULL UNIQUE,
    pix_copia_e_cola TEXT NOT NULL,
    qrcode TEXT NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    status public."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT payments_booking_fkey FOREIGN KEY (booking_id) REFERENCES public.event_participants(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payments_booking ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_txid ON public.payments(txid);
