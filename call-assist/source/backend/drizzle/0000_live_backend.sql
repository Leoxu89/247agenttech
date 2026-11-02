CREATE TABLE `service_secrets` (`name` text PRIMARY KEY NOT NULL, `ciphertext` text NOT NULL, `iv` text NOT NULL, `updated_at` integer NOT NULL);
--> statement-breakpoint
CREATE TABLE `request_limits` (`bucket` text PRIMARY KEY NOT NULL, `count` integer NOT NULL, `expires_at` integer NOT NULL);
