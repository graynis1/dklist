-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE `_merge_bulk_progress` (
	`label` varchar(191) NOT NULL,
	`last_id` bigint NOT NULL DEFAULT 0,
	CONSTRAINT `_merge_bulk_progress_label` PRIMARY KEY(`label`)
);
--> statement-breakpoint
CREATE TABLE `badges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`comment` varchar(255) NOT NULL,
	`img` varchar(255) NOT NULL,
	`name` varchar(50) NOT NULL,
	`name_us` varchar(50),
	`comment_us` varchar(255),
	CONSTRAINT `badges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`owner_id` int,
	`title` varchar(255) NOT NULL,
	`image` varchar(255),
	`content` longtext,
	`created_date` date NOT NULL,
	`slug` varchar(255) NOT NULL,
	`preview` longtext NOT NULL,
	`approved` tinyint(1) NOT NULL,
	`view_count` bigint NOT NULL,
	`has_pending_revision` tinyint(1) NOT NULL,
	`pending_title` varchar(255),
	`pending_content` longtext,
	`pending_preview` longtext,
	`pending_image` varchar(255),
	CONSTRAINT `blog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `book` (
	`id` int AUTO_INCREMENT NOT NULL,
	`publisher_id` int NOT NULL,
	`original_book_id` int,
	`name` varchar(150) NOT NULL,
	`date` date,
	`format` varchar(50),
	`lang` varchar(10) NOT NULL,
	`isbn` varchar(50),
	`content` longtext,
	`image` varchar(255),
	`country` varchar(100),
	`org_name` varchar(150) NOT NULL,
	`page_number` smallint NOT NULL,
	`slug` varchar(255) NOT NULL,
	`score` double NOT NULL,
	`view_count` bigint NOT NULL,
	`approve` tinyint(1) NOT NULL,
	CONSTRAINT `book_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `book_category` (
	`book_id` int NOT NULL,
	`category_id` int NOT NULL,
	CONSTRAINT `book_category_book_id_category_id` PRIMARY KEY(`book_id`,`category_id`)
);
--> statement-breakpoint
CREATE TABLE `category` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` varchar(100) NOT NULL,
	`category_us` varchar(100),
	`slug` varchar(255) NOT NULL,
	`slug_en` varchar(255),
	CONSTRAINT `category_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chat` (
	`id` int AUTO_INCREMENT NOT NULL,
	`first_user_id` int NOT NULL,
	`second_user_id` int NOT NULL,
	`last_message_at` datetime,
	`last_message_preview` varchar(140),
	`hidden_for_first_user` tinyint(1) NOT NULL,
	`hidden_for_second_user` tinyint(1) NOT NULL,
	CONSTRAINT `chat_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `comment` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`comment` longtext NOT NULL,
	`comment_type` varchar(20) NOT NULL,
	`type` varchar(20) NOT NULL,
	`target_id` bigint NOT NULL,
	`date` date NOT NULL,
	`lang` varchar(50),
	CONSTRAINT `comment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `comment_like` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`comment_id` int NOT NULL,
	CONSTRAINT `comment_like_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dknotifiaction` (
	`id` int AUTO_INCREMENT NOT NULL,
	`owner_user_id` int NOT NULL,
	`sender_user_id` int NOT NULL,
	`view` tinyint(1) NOT NULL,
	`comment_tr` longtext NOT NULL,
	`comment_us` longtext NOT NULL,
	`meta` longtext,
	CONSTRAINT `dknotifiaction_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `follow` (
	`id` int AUTO_INCREMENT NOT NULL,
	`follower_id` int NOT NULL,
	`followed_id` int NOT NULL,
	CONSTRAINT `follow_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `library_book` (
	`id` int AUTO_INCREMENT NOT NULL,
	`book_id` int NOT NULL,
	`owner_id` int NOT NULL,
	CONSTRAINT `library_book_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketplace_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`active` tinyint(1) NOT NULL,
	`commission_rate` double NOT NULL,
	`updated_date` datetime,
	CONSTRAINT `marketplace_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `message` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chat_id` int NOT NULL,
	`message` longtext NOT NULL,
	`receiver` varchar(255) NOT NULL,
	`sender` varchar(255) NOT NULL,
	`view` tinyint(1) NOT NULL,
	`view2` tinyint(1) NOT NULL,
	`sender_user_id` int,
	`receiver_user_id` int,
	`referenced_book_id` int,
	`referenced_store_id` int,
	`created_at` datetime,
	`type` varchar(20) NOT NULL,
	`attachment_snapshot` longtext,
	`hidden_for_sender` tinyint(1) NOT NULL,
	CONSTRAINT `message_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `newsletter` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mail` varchar(255) NOT NULL,
	CONSTRAINT `newsletter_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notice` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reported_user_id` int,
	`reporter_user_id` int,
	`comment_id` bigint,
	`type` varchar(30) NOT NULL,
	`reason` longtext,
	`created_at` datetime NOT NULL,
	`is_resolved` tinyint(1) NOT NULL,
	CONSTRAINT `notice_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `publisher` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	CONSTRAINT `publisher_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `read` (
	`id` int AUTO_INCREMENT NOT NULL,
	`book_id` int NOT NULL,
	`user_id` int NOT NULL,
	`status` varchar(50) NOT NULL,
	`year` varchar(4) NOT NULL,
	CONSTRAINT `read_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `read_purpose` (
	`id` int AUTO_INCREMENT NOT NULL,
	`owner_id` int NOT NULL,
	`year` varchar(10) NOT NULL,
	`purpose_count` bigint NOT NULL,
	CONSTRAINT `read_purpose_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `score` (
	`id` int AUTO_INCREMENT NOT NULL,
	`owner_id` int NOT NULL,
	`target_id` int NOT NULL,
	`target_type` varchar(50) NOT NULL,
	`score` smallint NOT NULL,
	CONSTRAINT `score_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `seller_payout_profile` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`iban` varchar(34) NOT NULL,
	`identity_number` varchar(11) NOT NULL,
	`contact_name` varchar(255) NOT NULL,
	`phone` varchar(30) NOT NULL,
	`address` longtext NOT NULL,
	`city` varchar(100) NOT NULL,
	`iyzico_sub_merchant_key` varchar(255),
	`status` varchar(20) NOT NULL,
	`created_date` datetime NOT NULL,
	`updated_date` datetime,
	CONSTRAINT `seller_payout_profile_id` PRIMARY KEY(`id`),
	CONSTRAINT `UNIQ_D650DE2A76ED395` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `site_popup` (
	`id` int AUTO_INCREMENT NOT NULL,
	`active` tinyint(1) NOT NULL,
	`title` varchar(255),
	`content` longtext,
	`image` varchar(255),
	`link` varchar(500),
	CONSTRAINT `site_popup_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stg_author` (
	`key` varchar(60) NOT NULL,
	`name` varchar(500),
	`slug` varchar(255),
	CONSTRAINT `stg_author_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `stg_category_lookup` (
	`name` varchar(100) NOT NULL,
	`category_id` int,
	CONSTRAINT `stg_category_lookup_name` PRIMARY KEY(`name`)
);
--> statement-breakpoint
CREATE TABLE `stg_distinct_category` (
	`name` varchar(100)
);
--> statement-breakpoint
CREATE TABLE `stg_distinct_publisher` (
	`name` varchar(490) NOT NULL,
	CONSTRAINT `stg_distinct_publisher_name` PRIMARY KEY(`name`)
);
--> statement-breakpoint
CREATE TABLE `stg_distinct_translator` (
	`name` varchar(255)
);
--> statement-breakpoint
CREATE TABLE `stg_distinct_writer` (
	`name` varchar(50)
);
--> statement-breakpoint
CREATE TABLE `stg_edition_cover` (
	`edition_key` varchar(60) NOT NULL,
	`cover_id` int,
	CONSTRAINT `stg_edition_cover_edition_key` PRIMARY KEY(`edition_key`)
);
--> statement-breakpoint
CREATE TABLE `stg_publisher_lookup` (
	`name` varchar(490) NOT NULL,
	`publisher_id` int,
	CONSTRAINT `stg_publisher_lookup_name` PRIMARY KEY(`name`)
);
--> statement-breakpoint
CREATE TABLE `stg_translator_lookup` (
	`name` varchar(255) NOT NULL,
	`translator_id` int,
	CONSTRAINT `stg_translator_lookup_name` PRIMARY KEY(`name`)
);
--> statement-breakpoint
CREATE TABLE `stg_work_book` (
	`work_key` varchar(60) NOT NULL,
	`book_id` int,
	CONSTRAINT `stg_work_book_work_key` PRIMARY KEY(`work_key`)
);
--> statement-breakpoint
CREATE TABLE `stg_work_cover` (
	`work_key` varchar(60) NOT NULL,
	`cover_id` int,
	CONSTRAINT `stg_work_cover_work_key` PRIMARY KEY(`work_key`)
);
--> statement-breakpoint
CREATE TABLE `stg_writer_lookup` (
	`name` varchar(50) NOT NULL,
	`writer_id` int,
	CONSTRAINT `stg_writer_lookup_name` PRIMARY KEY(`name`)
);
--> statement-breakpoint
CREATE TABLE `store` (
	`id` int AUTO_INCREMENT NOT NULL,
	`book_id` int,
	`owner_id` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` longtext NOT NULL,
	`state` varchar(255),
	`stock` int,
	`slug` varchar(255) NOT NULL,
	`shipment` varchar(30),
	`price` int,
	`location` varchar(255),
	`created_date` datetime NOT NULL,
	`last_notification_date` datetime,
	`is_active` tinyint(1) NOT NULL,
	`status` varchar(20) NOT NULL,
	`listing_type` varchar(10) NOT NULL,
	`view_count` int NOT NULL,
	CONSTRAINT `store_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `store_favorite` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`store_id` int NOT NULL,
	`created_date` datetime NOT NULL,
	CONSTRAINT `store_favorite_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_store_favorite_user_store` UNIQUE(`user_id`,`store_id`)
);
--> statement-breakpoint
CREATE TABLE `store_order` (
	`id` int AUTO_INCREMENT NOT NULL,
	`store_id` int NOT NULL,
	`buyer_id` int NOT NULL,
	`seller_id` int NOT NULL,
	`amount_kurus` int NOT NULL,
	`commission_kurus` int NOT NULL,
	`seller_payout_kurus` int NOT NULL,
	`currency` varchar(3) NOT NULL,
	`status` varchar(20) NOT NULL,
	`iyzico_conversation_id` varchar(255),
	`iyzico_payment_id` varchar(255),
	`iyzico_token` varchar(255),
	`shipping_name` varchar(255) NOT NULL,
	`shipping_phone` varchar(30) NOT NULL,
	`shipping_address` longtext NOT NULL,
	`shipping_city` varchar(100) NOT NULL,
	`shipping_district` varchar(100),
	`shipping_zip` varchar(10),
	`tracking_number` varchar(255),
	`created_date` datetime NOT NULL,
	`updated_date` datetime,
	`iyzico_payment_transaction_id` varchar(255),
	CONSTRAINT `store_order_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `store_picture` (
	`id` int AUTO_INCREMENT NOT NULL,
	`advert_id` int NOT NULL,
	`image_name` varchar(255) NOT NULL,
	CONSTRAINT `store_picture_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sub_comment` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`comment` longtext NOT NULL,
	`parent_type` varchar(30) NOT NULL,
	`parent_id` bigint NOT NULL,
	CONSTRAINT `sub_comment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `translator` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`birth_date` date,
	`death_date` date,
	`biyo` longtext,
	`img` varchar(255),
	`slug` varchar(255) NOT NULL,
	`view_count` varchar(255) NOT NULL,
	`score` double NOT NULL,
	CONSTRAINT `translator_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `translator_book` (
	`translator_id` int NOT NULL,
	`book_id` int NOT NULL,
	CONSTRAINT `translator_book_translator_id_book_id` PRIMARY KEY(`translator_id`,`book_id`)
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` int AUTO_INCREMENT NOT NULL,
	`read_books_id` int,
	`publisher_id` int,
	`username` varchar(50) NOT NULL,
	`password` varchar(255) NOT NULL,
	`mail` varchar(50) NOT NULL,
	`token` varchar(30) NOT NULL,
	`privacy` tinyint(1) NOT NULL,
	`user_type` varchar(25) NOT NULL,
	`created_date` date NOT NULL,
	`sex` varchar(40) NOT NULL,
	`name` varchar(50) NOT NULL,
	`surname` varchar(50) NOT NULL,
	`living_city` varchar(50),
	`job` varchar(50),
	`edu` varchar(50),
	`biyo` varchar(255),
	`mail_auth` tinyint(1),
	`birth_place` varchar(50),
	`birth_date` date NOT NULL,
	`image` varchar(255),
	`disable` tinyint(1) NOT NULL,
	`pending_code` varchar(10),
	CONSTRAINT `user_id` PRIMARY KEY(`id`),
	CONSTRAINT `UNIQ_8D93D649F85E0677` UNIQUE(`username`),
	CONSTRAINT `UNIQ_8D93D6495126AC48` UNIQUE(`mail`),
	CONSTRAINT `UNIQ_8D93D6495F37A13B` UNIQUE(`token`),
	CONSTRAINT `UNIQ_8D93D64940C86FCE` UNIQUE(`publisher_id`)
);
--> statement-breakpoint
CREATE TABLE `user_badges` (
	`user_id` int NOT NULL,
	`badges_id` int NOT NULL,
	CONSTRAINT `user_badges_user_id_badges_id` PRIMARY KEY(`user_id`,`badges_id`)
);
--> statement-breakpoint
CREATE TABLE `user_book` (
	`user_id` int NOT NULL,
	`book_id` int NOT NULL,
	CONSTRAINT `user_book_user_id_book_id` PRIMARY KEY(`user_id`,`book_id`)
);
--> statement-breakpoint
CREATE TABLE `user_translator` (
	`user_id` int NOT NULL,
	`translator_id` int NOT NULL,
	CONSTRAINT `user_translator_user_id_translator_id` PRIMARY KEY(`user_id`,`translator_id`)
);
--> statement-breakpoint
CREATE TABLE `user_writer` (
	`user_id` int NOT NULL,
	`writer_id` int NOT NULL,
	CONSTRAINT `user_writer_user_id_writer_id` PRIMARY KEY(`user_id`,`writer_id`)
);
--> statement-breakpoint
CREATE TABLE `writer` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(50) NOT NULL,
	`date` date,
	`biyo` longtext,
	`img` varchar(255),
	`slug` varchar(255) NOT NULL,
	`view_count` varchar(255) NOT NULL,
	`score` double NOT NULL,
	CONSTRAINT `writer_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `writer_book` (
	`writer_id` int NOT NULL,
	`book_id` int NOT NULL,
	CONSTRAINT `writer_book_writer_id_book_id` PRIMARY KEY(`writer_id`,`book_id`)
);
--> statement-breakpoint
CREATE TABLE `youtube` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`embeded_code` longtext NOT NULL,
	`view` smallint,
	CONSTRAINT `youtube_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `blog` ADD CONSTRAINT `FK_C01551437E3C61F9` FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `book` ADD CONSTRAINT `FK_CBE5A33140C86FCE` FOREIGN KEY (`publisher_id`) REFERENCES `publisher`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `book` ADD CONSTRAINT `FK_CBE5A33190221D76` FOREIGN KEY (`original_book_id`) REFERENCES `book`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `book_category` ADD CONSTRAINT `FK_1FB30F9812469DE2` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `book_category` ADD CONSTRAINT `FK_1FB30F9816A2B381` FOREIGN KEY (`book_id`) REFERENCES `book`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat` ADD CONSTRAINT `FK_659DF2AAB02C53F8` FOREIGN KEY (`second_user_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat` ADD CONSTRAINT `FK_659DF2AAB4E2BF69` FOREIGN KEY (`first_user_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `comment` ADD CONSTRAINT `FK_9474526CA76ED395` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `comment_like` ADD CONSTRAINT `FK_8A55E25FA76ED395` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `comment_like` ADD CONSTRAINT `FK_8A55E25FF8697D13` FOREIGN KEY (`comment_id`) REFERENCES `comment`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dknotifiaction` ADD CONSTRAINT `FK_5E795EC62A98155E` FOREIGN KEY (`sender_user_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dknotifiaction` ADD CONSTRAINT `FK_5E795EC62B18554A` FOREIGN KEY (`owner_user_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `follow` ADD CONSTRAINT `FK_68344470AC24F853` FOREIGN KEY (`follower_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `follow` ADD CONSTRAINT `FK_68344470D956F010` FOREIGN KEY (`followed_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `library_book` ADD CONSTRAINT `FK_6D2A695C16A2B381` FOREIGN KEY (`book_id`) REFERENCES `book`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `library_book` ADD CONSTRAINT `FK_6D2A695C7E3C61F9` FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `message` ADD CONSTRAINT `FK_B6BD307F1684578C` FOREIGN KEY (`referenced_book_id`) REFERENCES `book`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `message` ADD CONSTRAINT `FK_B6BD307F1A9A7125` FOREIGN KEY (`chat_id`) REFERENCES `chat`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `message` ADD CONSTRAINT `FK_B6BD307F2A98155E` FOREIGN KEY (`sender_user_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `message` ADD CONSTRAINT `FK_B6BD307FCE23F248` FOREIGN KEY (`referenced_store_id`) REFERENCES `store`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `message` ADD CONSTRAINT `FK_B6BD307FDA57E237` FOREIGN KEY (`receiver_user_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notice` ADD CONSTRAINT `FK_480D45C2DF3D6D95` FOREIGN KEY (`reporter_user_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notice` ADD CONSTRAINT `FK_480D45C2E7566E` FOREIGN KEY (`reported_user_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `read` ADD CONSTRAINT `FK_9857416716A2B381` FOREIGN KEY (`book_id`) REFERENCES `book`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `read` ADD CONSTRAINT `FK_98574167A76ED395` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `read_purpose` ADD CONSTRAINT `FK_460D1677E3C61F9` FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `score` ADD CONSTRAINT `FK_329937517E3C61F9` FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `seller_payout_profile` ADD CONSTRAINT `FK_D650DE2A76ED395` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `store` ADD CONSTRAINT `FK_FF57587716A2B381` FOREIGN KEY (`book_id`) REFERENCES `book`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `store` ADD CONSTRAINT `FK_FF5758777E3C61F9` FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `store_favorite` ADD CONSTRAINT `FK_56B2F123A76ED395` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `store_favorite` ADD CONSTRAINT `FK_56B2F123B092A811` FOREIGN KEY (`store_id`) REFERENCES `store`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `store_order` ADD CONSTRAINT `FK_8917C5816C755722` FOREIGN KEY (`buyer_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `store_order` ADD CONSTRAINT `FK_8917C5818DE820D9` FOREIGN KEY (`seller_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `store_order` ADD CONSTRAINT `FK_8917C581B092A811` FOREIGN KEY (`store_id`) REFERENCES `store`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `store_picture` ADD CONSTRAINT `FK_FD36E6ED07ECCB6` FOREIGN KEY (`advert_id`) REFERENCES `store`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sub_comment` ADD CONSTRAINT `FK_EBAC0E98A76ED395` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `translator_book` ADD CONSTRAINT `FK_E61B197D16A2B381` FOREIGN KEY (`book_id`) REFERENCES `book`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `translator_book` ADD CONSTRAINT `FK_E61B197D5370E40B` FOREIGN KEY (`translator_id`) REFERENCES `translator`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user` ADD CONSTRAINT `FK_8D93D64940C86FCE` FOREIGN KEY (`publisher_id`) REFERENCES `publisher`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user` ADD CONSTRAINT `FK_8D93D649996A8449` FOREIGN KEY (`read_books_id`) REFERENCES `read`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_badges` ADD CONSTRAINT `FK_1DA448A7538DA1D0` FOREIGN KEY (`badges_id`) REFERENCES `badges`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_badges` ADD CONSTRAINT `FK_1DA448A7A76ED395` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_book` ADD CONSTRAINT `FK_B164EFF816A2B381` FOREIGN KEY (`book_id`) REFERENCES `book`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_book` ADD CONSTRAINT `FK_B164EFF8A76ED395` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_translator` ADD CONSTRAINT `FK_FFAA25075370E40B` FOREIGN KEY (`translator_id`) REFERENCES `translator`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_translator` ADD CONSTRAINT `FK_FFAA2507A76ED395` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_writer` ADD CONSTRAINT `FK_F2F2C3BF1BC7E6B6` FOREIGN KEY (`writer_id`) REFERENCES `writer`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_writer` ADD CONSTRAINT `FK_F2F2C3BFA76ED395` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `writer_book` ADD CONSTRAINT `FK_597EE01316A2B381` FOREIGN KEY (`book_id`) REFERENCES `book`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `writer_book` ADD CONSTRAINT `FK_597EE0131BC7E6B6` FOREIGN KEY (`writer_id`) REFERENCES `writer`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `IDX_C01551437E3C61F9` ON `blog` (`owner_id`);--> statement-breakpoint
CREATE INDEX `IDX_CBE5A33140C86FCE` ON `book` (`publisher_id`);--> statement-breakpoint
CREATE INDEX `IDX_CBE5A33190221D76` ON `book` (`original_book_id`);--> statement-breakpoint
CREATE INDEX `idx_book_viewcount` ON `book` (`view_count`);--> statement-breakpoint
CREATE INDEX `idx_book_score` ON `book` (`score`);--> statement-breakpoint
CREATE INDEX `idx_book_approve` ON `book` (`approve`);--> statement-breakpoint
CREATE INDEX `idx_book_slug` ON `book` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_book_name` ON `book` (`name`);--> statement-breakpoint
CREATE INDEX `idx_book_orgname` ON `book` (`org_name`);--> statement-breakpoint
CREATE INDEX `idx_book_lang` ON `book` (`lang`,`id`);--> statement-breakpoint
CREATE INDEX `IDX_1FB30F9816A2B381` ON `book_category` (`book_id`);--> statement-breakpoint
CREATE INDEX `IDX_1FB30F9812469DE2` ON `book_category` (`category_id`);--> statement-breakpoint
CREATE INDEX `idx_category_name` ON `category` (`category`);--> statement-breakpoint
CREATE INDEX `IDX_659DF2AAB4E2BF69` ON `chat` (`first_user_id`);--> statement-breakpoint
CREATE INDEX `IDX_659DF2AAB02C53F8` ON `chat` (`second_user_id`);--> statement-breakpoint
CREATE INDEX `IDX_9474526CA76ED395` ON `comment` (`user_id`);--> statement-breakpoint
CREATE INDEX `IDX_8A55E25FA76ED395` ON `comment_like` (`user_id`);--> statement-breakpoint
CREATE INDEX `IDX_8A55E25FF8697D13` ON `comment_like` (`comment_id`);--> statement-breakpoint
CREATE INDEX `IDX_5E795EC62B18554A` ON `dknotifiaction` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `IDX_5E795EC62A98155E` ON `dknotifiaction` (`sender_user_id`);--> statement-breakpoint
CREATE INDEX `IDX_68344470AC24F853` ON `follow` (`follower_id`);--> statement-breakpoint
CREATE INDEX `IDX_68344470D956F010` ON `follow` (`followed_id`);--> statement-breakpoint
CREATE INDEX `IDX_6D2A695C16A2B381` ON `library_book` (`book_id`);--> statement-breakpoint
CREATE INDEX `IDX_6D2A695C7E3C61F9` ON `library_book` (`owner_id`);--> statement-breakpoint
CREATE INDEX `IDX_B6BD307F1A9A7125` ON `message` (`chat_id`);--> statement-breakpoint
CREATE INDEX `IDX_B6BD307F2A98155E` ON `message` (`sender_user_id`);--> statement-breakpoint
CREATE INDEX `IDX_B6BD307FDA57E237` ON `message` (`receiver_user_id`);--> statement-breakpoint
CREATE INDEX `IDX_B6BD307F1684578C` ON `message` (`referenced_book_id`);--> statement-breakpoint
CREATE INDEX `IDX_B6BD307FCE23F248` ON `message` (`referenced_store_id`);--> statement-breakpoint
CREATE INDEX `IDX_480D45C2E7566E` ON `notice` (`reported_user_id`);--> statement-breakpoint
CREATE INDEX `IDX_480D45C2DF3D6D95` ON `notice` (`reporter_user_id`);--> statement-breakpoint
CREATE INDEX `idx_publisher_name` ON `publisher` (`name`);--> statement-breakpoint
CREATE INDEX `IDX_9857416716A2B381` ON `read` (`book_id`);--> statement-breakpoint
CREATE INDEX `IDX_98574167A76ED395` ON `read` (`user_id`);--> statement-breakpoint
CREATE INDEX `IDX_460D1677E3C61F9` ON `read_purpose` (`owner_id`);--> statement-breakpoint
CREATE INDEX `IDX_329937517E3C61F9` ON `score` (`owner_id`);--> statement-breakpoint
CREATE INDEX `idx_book_id` ON `stg_work_book` (`book_id`);--> statement-breakpoint
CREATE INDEX `IDX_FF57587716A2B381` ON `store` (`book_id`);--> statement-breakpoint
CREATE INDEX `IDX_FF5758777E3C61F9` ON `store` (`owner_id`);--> statement-breakpoint
CREATE INDEX `idx_store_isactive` ON `store` (`is_active`);--> statement-breakpoint
CREATE INDEX `idx_store_listingtype` ON `store` (`listing_type`);--> statement-breakpoint
CREATE INDEX `idx_store_viewcount` ON `store` (`view_count`);--> statement-breakpoint
CREATE INDEX `idx_store_price` ON `store` (`price`);--> statement-breakpoint
CREATE INDEX `IDX_56B2F123A76ED395` ON `store_favorite` (`user_id`);--> statement-breakpoint
CREATE INDEX `IDX_56B2F123B092A811` ON `store_favorite` (`store_id`);--> statement-breakpoint
CREATE INDEX `IDX_8917C581B092A811` ON `store_order` (`store_id`);--> statement-breakpoint
CREATE INDEX `IDX_8917C5816C755722` ON `store_order` (`buyer_id`);--> statement-breakpoint
CREATE INDEX `IDX_8917C5818DE820D9` ON `store_order` (`seller_id`);--> statement-breakpoint
CREATE INDEX `idx_storeorder_iyzicotoken` ON `store_order` (`iyzico_token`);--> statement-breakpoint
CREATE INDEX `IDX_FD36E6ED07ECCB6` ON `store_picture` (`advert_id`);--> statement-breakpoint
CREATE INDEX `IDX_EBAC0E98A76ED395` ON `sub_comment` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_translator_name` ON `translator` (`name`);--> statement-breakpoint
CREATE INDEX `IDX_E61B197D5370E40B` ON `translator_book` (`translator_id`);--> statement-breakpoint
CREATE INDEX `IDX_E61B197D16A2B381` ON `translator_book` (`book_id`);--> statement-breakpoint
CREATE INDEX `IDX_8D93D649996A8449` ON `user` (`read_books_id`);--> statement-breakpoint
CREATE INDEX `IDX_1DA448A7A76ED395` ON `user_badges` (`user_id`);--> statement-breakpoint
CREATE INDEX `IDX_1DA448A7538DA1D0` ON `user_badges` (`badges_id`);--> statement-breakpoint
CREATE INDEX `IDX_B164EFF8A76ED395` ON `user_book` (`user_id`);--> statement-breakpoint
CREATE INDEX `IDX_B164EFF816A2B381` ON `user_book` (`book_id`);--> statement-breakpoint
CREATE INDEX `IDX_FFAA2507A76ED395` ON `user_translator` (`user_id`);--> statement-breakpoint
CREATE INDEX `IDX_FFAA25075370E40B` ON `user_translator` (`translator_id`);--> statement-breakpoint
CREATE INDEX `IDX_F2F2C3BFA76ED395` ON `user_writer` (`user_id`);--> statement-breakpoint
CREATE INDEX `IDX_F2F2C3BF1BC7E6B6` ON `user_writer` (`writer_id`);--> statement-breakpoint
CREATE INDEX `idx_writer_name` ON `writer` (`name`);--> statement-breakpoint
CREATE INDEX `idx_writer_viewcount` ON `writer` (`view_count`);--> statement-breakpoint
CREATE INDEX `IDX_597EE0131BC7E6B6` ON `writer_book` (`writer_id`);--> statement-breakpoint
CREATE INDEX `IDX_597EE01316A2B381` ON `writer_book` (`book_id`);
*/