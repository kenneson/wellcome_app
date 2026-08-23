alter type public."RegistrationStatus" add value if not exists 'EXPIRED';
alter type public."NotificationType" add value if not exists 'REGISTRATION_EXPIRED';
alter type public."NotificationType" add value if not exists 'WAITLIST_PROMOTED';
