import { mysqlTable, mysqlSchema, AnyMySqlColumn, primaryKey, varchar, bigint, int, index, foreignKey, longtext, date, smallint, double, datetime, unique, tinyint, text } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const mergeBulkProgress = mysqlTable("_merge_bulk_progress", {
	label: varchar({ length: 191 }).notNull(),
	lastId: bigint("last_id", { mode: "number" }).notNull(),
},
(table) => [
	primaryKey({ columns: [table.label], name: "_merge_bulk_progress_label"}),
]);

export const badges = mysqlTable("badges", {
	id: int().autoincrement().notNull(),
	comment: varchar({ length: 255 }).notNull(),
	img: varchar({ length: 255 }).notNull(),
	name: varchar({ length: 50 }).notNull(),
	nameUs: varchar("name_us", { length: 50 }),
	commentUs: varchar("comment_us", { length: 255 }),
},
(table) => [
	primaryKey({ columns: [table.id], name: "badges_id"}),
]);

export const blog = mysqlTable("blog", {
	id: int().autoincrement().notNull(),
	ownerId: int("owner_id").references(() => user.id),
	title: varchar({ length: 255 }).notNull(),
	image: varchar({ length: 255 }),
	content: longtext(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	createdDate: date("created_date", { mode: 'string' }).notNull(),
	slug: varchar({ length: 255 }).notNull(),
	preview: longtext().notNull(),
	approved: tinyint().notNull(),
	viewCount: bigint("view_count", { mode: "number" }).notNull(),
	hasPendingRevision: tinyint("has_pending_revision").notNull(),
	pendingTitle: varchar("pending_title", { length: 255 }),
	pendingContent: longtext("pending_content"),
	pendingPreview: longtext("pending_preview"),
	pendingImage: varchar("pending_image", { length: 255 }),
},
(table) => [
	index("IDX_C01551437E3C61F9").on(table.ownerId),
	primaryKey({ columns: [table.id], name: "blog_id"}),
]);

// Canonical "same underlying work" grouping - see PLAN.md's Phase 1 work/edition
// split. Deliberately minimal (just an id): a `book` row IS an edition, carrying
// its own title/author/etc as before; `book.work_id` just says "these editions
// are the same work" so ratings/comments can eventually pool on work_id instead
// of fragmenting per edition/translation. Added by hand via ALTER TABLE on
// 2026-08-21 (dev shadow DB only so far, NOT yet applied to the real prod
// schema) - never through drizzle-kit push/generate, per the project's standing
// rule. Currently 1:1 with book (every book got its own new work row on
// backfill) - Phase 5's dedup pipeline is what actually merges editions onto a
// shared work_id later; this migration only adds the capability.
export const work = mysqlTable("work", {
	id: int().autoincrement().notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "work_id" }),
]);

export const book = mysqlTable("book", {
	id: int().autoincrement().notNull(),
	publisherId: int("publisher_id").notNull().references(() => publisher.id),
	originalBookId: int("original_book_id"),
	workId: int("work_id").references(() => work.id),
	name: varchar({ length: 150 }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	date: date({ mode: 'string' }),
	format: varchar({ length: 50 }),
	lang: varchar({ length: 10 }).notNull(),
	isbn: varchar({ length: 50 }),
	content: longtext(),
	image: varchar({ length: 255 }),
	country: varchar({ length: 100 }),
	orgName: varchar("org_name", { length: 150 }).notNull(),
	pageNumber: smallint("page_number").notNull(),
	slug: varchar({ length: 255 }).notNull(),
	score: double().notNull(),
	viewCount: bigint("view_count", { mode: "number" }).notNull(),
	approve: tinyint().notNull(),
},
(table) => [
	index("IDX_CBE5A33140C86FCE").on(table.publisherId),
	index("IDX_CBE5A33190221D76").on(table.originalBookId),
	index("idx_book_viewcount").on(table.viewCount),
	index("idx_book_score").on(table.score),
	index("idx_book_approve").on(table.approve),
	index("idx_book_slug").on(table.slug),
	index("idx_book_name").on(table.name),
	index("idx_book_orgname").on(table.orgName),
	index("idx_book_lang").on(table.lang, table.id),
	index("idx_book_work").on(table.workId),
	foreignKey({
			columns: [table.originalBookId],
			foreignColumns: [table.id],
			name: "FK_CBE5A33190221D76"
		}),
	foreignKey({
			columns: [table.workId],
			foreignColumns: [work.id],
			name: "FK_book_work"
		}),
	primaryKey({ columns: [table.id], name: "book_id"}),
]);

export const bookCategory = mysqlTable("book_category", {
	bookId: int("book_id").notNull().references(() => book.id, { onDelete: "cascade" } ),
	categoryId: int("category_id").notNull().references(() => category.id, { onDelete: "cascade" } ),
},
(table) => [
	index("IDX_1FB30F9816A2B381").on(table.bookId),
	index("IDX_1FB30F9812469DE2").on(table.categoryId),
	primaryKey({ columns: [table.bookId, table.categoryId], name: "book_category_book_id_category_id"}),
]);

export const category = mysqlTable("category", {
	id: int().autoincrement().notNull(),
	category: varchar({ length: 100 }).notNull(),
	categoryUs: varchar("category_us", { length: 100 }),
	slug: varchar({ length: 255 }).notNull(),
	slugEn: varchar("slug_en", { length: 255 }),
},
(table) => [
	index("idx_category_name").on(table.category),
	primaryKey({ columns: [table.id], name: "category_id"}),
]);

export const chat = mysqlTable("chat", {
	id: int().autoincrement().notNull(),
	firstUserId: int("first_user_id").notNull().references(() => user.id),
	secondUserId: int("second_user_id").notNull().references(() => user.id),
	// "Diğer mesajlar" (message requests) - set when the recipient doesn't
	// follow the sender at chat-creation time, cleared once they reply.
	isRequest: tinyint("is_request").notNull().default(0),
	lastMessageAt: datetime("last_message_at", { mode: 'string'}),
	lastMessagePreview: varchar("last_message_preview", { length: 140 }),
	hiddenForFirstUser: tinyint("hidden_for_first_user").notNull(),
	hiddenForSecondUser: tinyint("hidden_for_second_user").notNull(),
},
(table) => [
	index("IDX_659DF2AAB4E2BF69").on(table.firstUserId),
	index("IDX_659DF2AAB02C53F8").on(table.secondUserId),
	primaryKey({ columns: [table.id], name: "chat_id"}),
]);

export const comment = mysqlTable("comment", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull().references(() => user.id),
	comment: longtext().notNull(),
	commentType: varchar("comment_type", { length: 20 }).notNull(),
	type: varchar({ length: 20 }).notNull(),
	targetId: bigint("target_id", { mode: "number" }).notNull(),
	// Which comment this one was reshared from (customer's "share a review
	// with your own commentary" feature) - null for every ordinary comment.
	sharedFromCommentId: int("shared_from_comment_id"),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	date: date({ mode: 'string' }).notNull(),
	lang: varchar({ length: 50 }),
},
(table) => [
	index("IDX_9474526CA76ED395").on(table.userId),
	primaryKey({ columns: [table.id], name: "comment_id"}),
]);

export const commentLike = mysqlTable("comment_like", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull().references(() => user.id),
	commentId: int("comment_id").notNull().references(() => comment.id),
},
(table) => [
	index("IDX_8A55E25FA76ED395").on(table.userId),
	index("IDX_8A55E25FF8697D13").on(table.commentId),
	primaryKey({ columns: [table.id], name: "comment_like_id"}),
]);

export const dknotifiaction = mysqlTable("dknotifiaction", {
	id: int().autoincrement().notNull(),
	ownerUserId: int("owner_user_id").notNull().references(() => user.id),
	senderUserId: int("sender_user_id").notNull().references(() => user.id),
	view: tinyint().notNull(),
	commentTr: longtext("comment_tr").notNull(),
	commentUs: longtext("comment_us").notNull(),
	meta: longtext(),
},
(table) => [
	index("IDX_5E795EC62B18554A").on(table.ownerUserId),
	index("IDX_5E795EC62A98155E").on(table.senderUserId),
	primaryKey({ columns: [table.id], name: "dknotifiaction_id"}),
]);

export const follow = mysqlTable("follow", {
	id: int().autoincrement().notNull(),
	followerId: int("follower_id").notNull().references(() => user.id),
	followedId: int("followed_id").notNull().references(() => user.id),
},
(table) => [
	index("IDX_68344470AC24F853").on(table.followerId),
	index("IDX_68344470D956F010").on(table.followedId),
	primaryKey({ columns: [table.id], name: "follow_id"}),
]);

export const libraryBook = mysqlTable("library_book", {
	id: int().autoincrement().notNull(),
	bookId: int("book_id").notNull().references(() => book.id),
	ownerId: int("owner_id").notNull().references(() => user.id),
},
(table) => [
	index("IDX_6D2A695C16A2B381").on(table.bookId),
	index("IDX_6D2A695C7E3C61F9").on(table.ownerId),
	primaryKey({ columns: [table.id], name: "library_book_id"}),
]);

export const marketplaceSettings = mysqlTable("marketplace_settings", {
	id: int().autoincrement().notNull(),
	active: tinyint().notNull(),
	commissionRate: double("commission_rate").notNull(),
	// Added by hand 2026-08-21, see src/db/migrations/0009_iyzico_marketplace.sql -
	// v1 read these from static env vars only; the maintainer explicitly asked
	// for admin-panel entry that takes effect immediately, no redeploy.
	iyzicoApiKey: varchar("iyzico_api_key", { length: 255 }),
	iyzicoSecretKey: varchar("iyzico_secret_key", { length: 255 }),
	iyzicoBaseUrl: varchar("iyzico_base_url", { length: 255 }).notNull(),
	updatedDate: datetime("updated_date", { mode: 'string'}),
},
(table) => [
	primaryKey({ columns: [table.id], name: "marketplace_settings_id"}),
]);

export const message = mysqlTable("message", {
	id: int().autoincrement().notNull(),
	chatId: int("chat_id").notNull().references(() => chat.id),
	message: longtext().notNull(),
	receiver: varchar({ length: 255 }).notNull(),
	sender: varchar({ length: 255 }).notNull(),
	view: tinyint().notNull(),
	view2: tinyint().notNull(),
	senderUserId: int("sender_user_id").references(() => user.id),
	receiverUserId: int("receiver_user_id").references(() => user.id),
	referencedBookId: int("referenced_book_id").references(() => book.id),
	referencedStoreId: int("referenced_store_id").references(() => store.id),
	createdAt: datetime("created_at", { mode: 'string'}),
	type: varchar({ length: 20 }).notNull(),
	attachmentSnapshot: longtext("attachment_snapshot"),
	hiddenForSender: tinyint("hidden_for_sender").notNull(),
},
(table) => [
	index("IDX_B6BD307F1A9A7125").on(table.chatId),
	index("IDX_B6BD307F2A98155E").on(table.senderUserId),
	index("IDX_B6BD307FDA57E237").on(table.receiverUserId),
	index("IDX_B6BD307F1684578C").on(table.referencedBookId),
	index("IDX_B6BD307FCE23F248").on(table.referencedStoreId),
	primaryKey({ columns: [table.id], name: "message_id"}),
]);

export const newsletter = mysqlTable("newsletter", {
	id: int().autoincrement().notNull(),
	mail: varchar({ length: 255 }).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "newsletter_id"}),
]);

export const notice = mysqlTable("notice", {
	id: int().autoincrement().notNull(),
	reportedUserId: int("reported_user_id").references(() => user.id),
	reporterUserId: int("reporter_user_id").references(() => user.id),
	commentId: bigint("comment_id", { mode: "number" }),
	type: varchar({ length: 30 }).notNull(),
	reason: longtext(),
	createdAt: datetime("created_at", { mode: 'string'}).notNull(),
	isResolved: tinyint("is_resolved").notNull(),
},
(table) => [
	index("IDX_480D45C2E7566E").on(table.reportedUserId),
	index("IDX_480D45C2DF3D6D95").on(table.reporterUserId),
	primaryKey({ columns: [table.id], name: "notice_id"}),
]);

export const publisher = mysqlTable("publisher", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	slug: varchar({ length: 255 }).notNull(),
},
(table) => [
	index("idx_publisher_name").on(table.name),
	primaryKey({ columns: [table.id], name: "publisher_id"}),
]);

// Reading status - one current row per user+book (see
// src/db/migrations/0002_read_status_dropped.sql for why the UNIQUE
// constraint was added by hand). `status` stays free-text (matches the
// existing varchar(50), no enum in the DB) - valid values enforced in
// application code, see src/db/queries/reading-status.ts.
export const read = mysqlTable("read", {
	id: int().autoincrement().notNull(),
	bookId: int("book_id").notNull().references(() => book.id),
	userId: int("user_id").notNull().references((): AnyMySqlColumn => user.id),
	status: varchar({ length: 50 }).notNull(),
	// "yarıda bıraktım" (dropped) support, added 2026-08-21 - both null unless
	// status is the dropped value.
	dropReason: varchar("drop_reason", { length: 30 }),
	dropPercentage: tinyint("drop_percentage", { unsigned: true }),
	// Customer's "general reading-time tracking also wanted" - manually
	// logged, cumulative minutes spent on this book (no session/timer infra
	// exists or is planned).
	minutesRead: int("minutes_read").notNull().default(0),
	year: varchar({ length: 4 }).notNull(),
},
(table) => [
	index("IDX_9857416716A2B381").on(table.bookId),
	index("IDX_98574167A76ED395").on(table.userId),
	unique("uniq_read_user_book").on(table.userId, table.bookId),
	primaryKey({ columns: [table.id], name: "read_id"}),
]);

export const readPurpose = mysqlTable("read_purpose", {
	id: int().autoincrement().notNull(),
	ownerId: int("owner_id").notNull().references(() => user.id),
	year: varchar({ length: 10 }).notNull(),
	purposeCount: bigint("purpose_count", { mode: "number" }).notNull(),
},
(table) => [
	index("IDX_460D1677E3C61F9").on(table.ownerId),
	primaryKey({ columns: [table.id], name: "read_purpose_id"}),
]);

export const score = mysqlTable("score", {
	id: int().autoincrement().notNull(),
	ownerId: int("owner_id").notNull().references(() => user.id),
	targetId: int("target_id").notNull(),
	targetType: varchar("target_type", { length: 50 }).notNull(),
	score: smallint().notNull(),
},
(table) => [
	index("IDX_329937517E3C61F9").on(table.ownerId),
	// Added by hand 2026-08-21, see src/db/migrations/0003_score_unique.sql -
	// makes rating a target a proper upsert instead of allowing unlimited
	// duplicate votes from the same user.
	unique("uniq_score_owner_target").on(table.ownerId, table.targetId, table.targetType),
	primaryKey({ columns: [table.id], name: "score_id"}),
]);

export const sellerPayoutProfile = mysqlTable("seller_payout_profile", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull().references(() => user.id),
	iban: varchar({ length: 34 }).notNull(),
	identityNumber: varchar("identity_number", { length: 11 }).notNull(),
	contactName: varchar("contact_name", { length: 255 }).notNull(),
	phone: varchar({ length: 30 }).notNull(),
	address: longtext().notNull(),
	city: varchar({ length: 100 }).notNull(),
	iyzicoSubMerchantKey: varchar("iyzico_sub_merchant_key", { length: 255 }),
	status: varchar({ length: 20 }).notNull(),
	createdDate: datetime("created_date", { mode: 'string'}).notNull(),
	updatedDate: datetime("updated_date", { mode: 'string'}),
},
(table) => [
	primaryKey({ columns: [table.id], name: "seller_payout_profile_id"}),
	unique("UNIQ_D650DE2A76ED395").on(table.userId),
]);

export const sitePopup = mysqlTable("site_popup", {
	id: int().autoincrement().notNull(),
	active: tinyint().notNull(),
	title: varchar({ length: 255 }),
	content: longtext(),
	image: varchar({ length: 255 }),
	link: varchar({ length: 500 }),
},
(table) => [
	primaryKey({ columns: [table.id], name: "site_popup_id"}),
]);

export const stgAuthor = mysqlTable("stg_author", {
	key: varchar({ length: 60 }).notNull(),
	name: varchar({ length: 500 }),
	slug: varchar({ length: 255 }),
},
(table) => [
	primaryKey({ columns: [table.key], name: "stg_author_key"}),
]);

export const stgCategoryLookup = mysqlTable("stg_category_lookup", {
	name: varchar({ length: 100 }).notNull(),
	categoryId: int("category_id"),
},
(table) => [
	primaryKey({ columns: [table.name], name: "stg_category_lookup_name"}),
]);

export const stgDistinctCategory = mysqlTable("stg_distinct_category", {
	name: varchar({ length: 100 }),
});

export const stgDistinctPublisher = mysqlTable("stg_distinct_publisher", {
	name: varchar({ length: 490 }).notNull(),
},
(table) => [
	primaryKey({ columns: [table.name], name: "stg_distinct_publisher_name"}),
]);

export const stgDistinctTranslator = mysqlTable("stg_distinct_translator", {
	name: varchar({ length: 255 }),
});

export const stgDistinctWriter = mysqlTable("stg_distinct_writer", {
	name: varchar({ length: 50 }),
});

export const stgEditionCover = mysqlTable("stg_edition_cover", {
	editionKey: varchar("edition_key", { length: 60 }).notNull(),
	coverId: int("cover_id"),
},
(table) => [
	primaryKey({ columns: [table.editionKey], name: "stg_edition_cover_edition_key"}),
]);

export const stgPublisherLookup = mysqlTable("stg_publisher_lookup", {
	name: varchar({ length: 490 }).notNull(),
	publisherId: int("publisher_id"),
},
(table) => [
	primaryKey({ columns: [table.name], name: "stg_publisher_lookup_name"}),
]);

export const stgTranslatorLookup = mysqlTable("stg_translator_lookup", {
	name: varchar({ length: 255 }).notNull(),
	translatorId: int("translator_id"),
},
(table) => [
	primaryKey({ columns: [table.name], name: "stg_translator_lookup_name"}),
]);

export const stgWorkBook = mysqlTable("stg_work_book", {
	workKey: varchar("work_key", { length: 60 }).notNull(),
	bookId: int("book_id"),
},
(table) => [
	index("idx_book_id").on(table.bookId),
	primaryKey({ columns: [table.workKey], name: "stg_work_book_work_key"}),
]);

export const stgWorkCover = mysqlTable("stg_work_cover", {
	workKey: varchar("work_key", { length: 60 }).notNull(),
	coverId: int("cover_id"),
},
(table) => [
	primaryKey({ columns: [table.workKey], name: "stg_work_cover_work_key"}),
]);

export const stgWriterLookup = mysqlTable("stg_writer_lookup", {
	name: varchar({ length: 50 }).notNull(),
	writerId: int("writer_id"),
},
(table) => [
	primaryKey({ columns: [table.name], name: "stg_writer_lookup_name"}),
]);

export const store = mysqlTable("store", {
	id: int().autoincrement().notNull(),
	bookId: int("book_id").references(() => book.id),
	ownerId: int("owner_id").notNull().references(() => user.id),
	title: varchar({ length: 255 }).notNull(),
	content: longtext().notNull(),
	state: varchar({ length: 255 }),
	stock: int(),
	slug: varchar({ length: 255 }).notNull(),
	shipment: varchar({ length: 30 }),
	price: int(),
	location: varchar({ length: 255 }),
	createdDate: datetime("created_date", { mode: 'string'}).notNull(),
	lastNotificationDate: datetime("last_notification_date", { mode: 'string'}),
	isActive: tinyint("is_active").notNull(),
	status: varchar({ length: 20 }).notNull(),
	listingType: varchar("listing_type", { length: 10 }).notNull(),
	viewCount: int("view_count").notNull(),
},
(table) => [
	index("IDX_FF57587716A2B381").on(table.bookId),
	index("IDX_FF5758777E3C61F9").on(table.ownerId),
	index("idx_store_isactive").on(table.isActive),
	index("idx_store_listingtype").on(table.listingType),
	index("idx_store_viewcount").on(table.viewCount),
	index("idx_store_price").on(table.price),
	primaryKey({ columns: [table.id], name: "store_id"}),
]);

export const storeFavorite = mysqlTable("store_favorite", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull().references(() => user.id),
	storeId: int("store_id").notNull().references(() => store.id, { onDelete: "cascade" } ),
	createdDate: datetime("created_date", { mode: 'string'}).notNull(),
},
(table) => [
	index("IDX_56B2F123A76ED395").on(table.userId),
	index("IDX_56B2F123B092A811").on(table.storeId),
	primaryKey({ columns: [table.id], name: "store_favorite_id"}),
	unique("uniq_store_favorite_user_store").on(table.userId, table.storeId),
]);

export const storeOrder = mysqlTable("store_order", {
	id: int().autoincrement().notNull(),
	storeId: int("store_id").notNull().references(() => store.id),
	buyerId: int("buyer_id").notNull().references(() => user.id),
	sellerId: int("seller_id").notNull().references(() => user.id),
	amountKurus: int("amount_kurus").notNull(),
	commissionKurus: int("commission_kurus").notNull(),
	sellerPayoutKurus: int("seller_payout_kurus").notNull(),
	currency: varchar({ length: 3 }).notNull(),
	status: varchar({ length: 20 }).notNull(),
	iyzicoConversationId: varchar("iyzico_conversation_id", { length: 255 }),
	iyzicoPaymentId: varchar("iyzico_payment_id", { length: 255 }),
	iyzicoToken: varchar("iyzico_token", { length: 255 }),
	shippingName: varchar("shipping_name", { length: 255 }).notNull(),
	shippingPhone: varchar("shipping_phone", { length: 30 }).notNull(),
	shippingAddress: longtext("shipping_address").notNull(),
	shippingCity: varchar("shipping_city", { length: 100 }).notNull(),
	shippingDistrict: varchar("shipping_district", { length: 100 }),
	shippingZip: varchar("shipping_zip", { length: 10 }),
	trackingNumber: varchar("tracking_number", { length: 255 }),
	createdDate: datetime("created_date", { mode: 'string'}).notNull(),
	updatedDate: datetime("updated_date", { mode: 'string'}),
	iyzicoPaymentTransactionId: varchar("iyzico_payment_transaction_id", { length: 255 }),
},
(table) => [
	index("IDX_8917C581B092A811").on(table.storeId),
	index("IDX_8917C5816C755722").on(table.buyerId),
	index("IDX_8917C5818DE820D9").on(table.sellerId),
	index("idx_storeorder_iyzicotoken").on(table.iyzicoToken),
	primaryKey({ columns: [table.id], name: "store_order_id"}),
]);

export const storePicture = mysqlTable("store_picture", {
	id: int().autoincrement().notNull(),
	advertId: int("advert_id").notNull().references(() => store.id),
	imageName: varchar("image_name", { length: 255 }).notNull(),
},
(table) => [
	index("IDX_FD36E6ED07ECCB6").on(table.advertId),
	primaryKey({ columns: [table.id], name: "store_picture_id"}),
]);

export const subComment = mysqlTable("sub_comment", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull().references(() => user.id),
	comment: longtext().notNull(),
	parentType: varchar("parent_type", { length: 30 }).notNull(),
	parentId: bigint("parent_id", { mode: "number" }).notNull(),
},
(table) => [
	index("IDX_EBAC0E98A76ED395").on(table.userId),
	primaryKey({ columns: [table.id], name: "sub_comment_id"}),
]);

export const translator = mysqlTable("translator", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	birthDate: date("birth_date", { mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	deathDate: date("death_date", { mode: 'string' }),
	biyo: longtext(),
	img: varchar({ length: 255 }),
	slug: varchar({ length: 255 }).notNull(),
	viewCount: varchar("view_count", { length: 255 }).notNull(),
	score: double().notNull(),
},
(table) => [
	index("idx_translator_name").on(table.name),
	primaryKey({ columns: [table.id], name: "translator_id"}),
]);

export const translatorBook = mysqlTable("translator_book", {
	translatorId: int("translator_id").notNull().references(() => translator.id, { onDelete: "cascade" } ),
	bookId: int("book_id").notNull().references(() => book.id, { onDelete: "cascade" } ),
},
(table) => [
	index("IDX_E61B197D5370E40B").on(table.translatorId),
	index("IDX_E61B197D16A2B381").on(table.bookId),
	primaryKey({ columns: [table.translatorId, table.bookId], name: "translator_book_translator_id_book_id"}),
]);

export const user = mysqlTable("user", {
	id: int().autoincrement().notNull(),
	readBooksId: int("read_books_id").references((): AnyMySqlColumn => read.id),
	publisherId: int("publisher_id").references(() => publisher.id),
	// Yazarhane - links a real "Yazar" member account to their actual
	// catalog writer record, same 1:1 shape as publisherId above.
	writerId: int("writer_id").references(() => writer.id),
	username: varchar({ length: 50 }).notNull(),
	password: varchar({ length: 255 }).notNull(),
	mail: varchar({ length: 50 }).notNull(),
	token: varchar({ length: 30 }).notNull(),
	privacy: tinyint().notNull(),
	userType: varchar("user_type", { length: 25 }).notNull(),
	// Admin-designated "official profile" visual marker (blue-check style) -
	// customer's ask, not a v1 column.
	verified: tinyint().notNull().default(0),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	createdDate: date("created_date", { mode: 'string' }).notNull(),
	sex: varchar({ length: 40 }).notNull(),
	name: varchar({ length: 50 }).notNull(),
	surname: varchar({ length: 50 }).notNull(),
	livingCity: varchar("living_city", { length: 50 }),
	job: varchar({ length: 50 }),
	edu: varchar({ length: 50 }),
	biyo: varchar({ length: 255 }),
	mailAuth: tinyint("mail_auth"),
	birthPlace: varchar("birth_place", { length: 50 }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	birthDate: date("birth_date", { mode: 'string' }).notNull(),
	image: varchar({ length: 255 }),
	disable: tinyint().notNull(),
	pendingCode: varchar("pending_code", { length: 10 }),
},
(table) => [
	index("IDX_8D93D649996A8449").on(table.readBooksId),
	primaryKey({ columns: [table.id], name: "user_id"}),
	unique("UNIQ_8D93D649F85E0677").on(table.username),
	unique("UNIQ_8D93D6495126AC48").on(table.mail),
	unique("UNIQ_8D93D6495F37A13B").on(table.token),
	unique("UNIQ_8D93D64940C86FCE").on(table.publisherId),
	unique("UNIQ_user_writer_id").on(table.writerId),
]);

export const yazarhanePost = mysqlTable("yazarhane_post", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull().references(() => user.id),
	title: varchar({ length: 255 }).notNull(),
	content: text().notNull(),
	createdDate: datetime("created_date", { mode: 'string' }).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "yazarhane_post_id" }),
	index("idx_yazarhane_post_user").on(table.userId),
]);

export const userBadges = mysqlTable("user_badges", {
	userId: int("user_id").notNull().references(() => user.id, { onDelete: "cascade" } ),
	badgesId: int("badges_id").notNull().references(() => badges.id, { onDelete: "cascade" } ),
},
(table) => [
	index("IDX_1DA448A7A76ED395").on(table.userId),
	index("IDX_1DA448A7538DA1D0").on(table.badgesId),
	primaryKey({ columns: [table.userId, table.badgesId], name: "user_badges_user_id_badges_id"}),
]);

export const userBook = mysqlTable("user_book", {
	userId: int("user_id").notNull().references(() => user.id, { onDelete: "cascade" } ),
	bookId: int("book_id").notNull().references(() => book.id, { onDelete: "cascade" } ),
},
(table) => [
	index("IDX_B164EFF8A76ED395").on(table.userId),
	index("IDX_B164EFF816A2B381").on(table.bookId),
	primaryKey({ columns: [table.userId, table.bookId], name: "user_book_user_id_book_id"}),
]);

export const userTranslator = mysqlTable("user_translator", {
	userId: int("user_id").notNull().references(() => user.id, { onDelete: "cascade" } ),
	translatorId: int("translator_id").notNull().references(() => translator.id, { onDelete: "cascade" } ),
},
(table) => [
	index("IDX_FFAA2507A76ED395").on(table.userId),
	index("IDX_FFAA25075370E40B").on(table.translatorId),
	primaryKey({ columns: [table.userId, table.translatorId], name: "user_translator_user_id_translator_id"}),
]);

export const userWriter = mysqlTable("user_writer", {
	userId: int("user_id").notNull().references(() => user.id, { onDelete: "cascade" } ),
	writerId: int("writer_id").notNull().references(() => writer.id, { onDelete: "cascade" } ),
},
(table) => [
	index("IDX_F2F2C3BFA76ED395").on(table.userId),
	index("IDX_F2F2C3BF1BC7E6B6").on(table.writerId),
	primaryKey({ columns: [table.userId, table.writerId], name: "user_writer_user_id_writer_id"}),
]);

export const writer = mysqlTable("writer", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 50 }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	date: date({ mode: 'string' }),
	biyo: longtext(),
	img: varchar({ length: 255 }),
	slug: varchar({ length: 255 }).notNull(),
	viewCount: varchar("view_count", { length: 255 }).notNull(),
	score: double().notNull(),
},
(table) => [
	index("idx_writer_name").on(table.name),
	index("idx_writer_viewcount").on(table.viewCount),
	primaryKey({ columns: [table.id], name: "writer_id"}),
]);

export const writerBook = mysqlTable("writer_book", {
	writerId: int("writer_id").notNull().references(() => writer.id, { onDelete: "cascade" } ),
	bookId: int("book_id").notNull().references(() => book.id, { onDelete: "cascade" } ),
},
(table) => [
	index("IDX_597EE0131BC7E6B6").on(table.writerId),
	index("IDX_597EE01316A2B381").on(table.bookId),
	primaryKey({ columns: [table.writerId, table.bookId], name: "writer_book_writer_id_book_id"}),
]);

// Gamification/engagement points - customer-requested new feature (not a v1
// port, v1 has no points concept). See migration 0004_gamification_points.sql.
export const pointTransaction = mysqlTable("point_transaction", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
	points: int().notNull(),
	reason: varchar({ length: 50 }).notNull(),
	reasonKey: varchar("reason_key", { length: 150 }).notNull(),
	createdAt: datetime("created_at", { mode: 'string' }).notNull(),
},
(table) => [
	unique("uq_point_transaction_user_reason_key").on(table.userId, table.reasonKey),
	index("idx_point_transaction_user").on(table.userId),
	index("idx_point_transaction_created").on(table.createdAt),
	primaryKey({ columns: [table.id], name: "point_transaction_id" }),
]);

export const weeklyWinner = mysqlTable("weekly_winner", {
	id: int().autoincrement().notNull(),
	yearWeek: varchar("year_week", { length: 10 }).notNull(),
	userId: int("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
	points: int().notNull(),
	prizeBookId: int("prize_book_id").references(() => book.id, { onDelete: "set null" }),
	fulfilled: tinyint().notNull().default(0),
	fulfilledAt: datetime("fulfilled_at", { mode: 'string' }),
	createdAt: datetime("created_at", { mode: 'string' }).notNull(),
},
(table) => [
	unique("uq_weekly_winner_year_week").on(table.yearWeek),
	index("idx_weekly_winner_user").on(table.userId),
	primaryKey({ columns: [table.id], name: "weekly_winner_id" }),
]);

// Admin-editable point values - see migration 0011_point_settings.sql.
// Key-value shape (not one column per point type) since new point sources
// get added over time without a schema migration each time.
export const pointSetting = mysqlTable("point_setting", {
	settingKey: varchar("setting_key", { length: 50 }).notNull(),
	points: int().notNull(),
	updatedDate: datetime("updated_date", { mode: 'string' }),
},
(table) => [
	primaryKey({ columns: [table.settingKey], name: "point_setting_setting_key" }),
]);

export const adminActionLog = mysqlTable("admin_action_log", {
	id: int().autoincrement().notNull(),
	actorUserId: int("actor_user_id").notNull(),
	action: varchar({ length: 50 }).notNull(),
	targetType: varchar("target_type", { length: 50 }),
	targetId: varchar("target_id", { length: 100 }),
	detail: varchar({ length: 500 }),
	createdAt: datetime("created_at", { mode: 'string' }).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "admin_action_log_id" }),
	index("idx_admin_action_log_actor").on(table.actorUserId),
	index("idx_admin_action_log_created").on(table.createdAt),
]);

export const youtube = mysqlTable("youtube", {
	id: int().autoincrement().notNull(),
	title: varchar({ length: 255 }).notNull(),
	embededCode: longtext("embeded_code").notNull(),
	view: smallint(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "youtube_id"}),
]);

// Phase 8 (Monetization) - customer-requested, not a v1 port. See
// migration 0010_monetization.sql. Single-row admin config (same
// singleton-table pattern as marketplace_settings) for premium membership
// pricing/duration.
export const premiumSettings = mysqlTable("premium_settings", {
	id: int().autoincrement().notNull(),
	active: tinyint().notNull(),
	priceKurus: int("price_kurus").notNull(),
	durationDays: int("duration_days").notNull(),
	updatedDate: datetime("updated_date", { mode: 'string' }),
},
(table) => [
	primaryKey({ columns: [table.id], name: "premium_settings_id" }),
]);

// One purchase per row (not a single "is premium" flag on user) so a
// renewal history exists and expiresAt can be computed as
// MAX(expires_at) across all of a user's paid purchases.
export const premiumPurchase = mysqlTable("premium_purchase", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull().references(() => user.id),
	amountKurus: int("amount_kurus").notNull(),
	durationDays: int("duration_days").notNull(),
	status: varchar({ length: 20 }).notNull(),
	startsAt: datetime("starts_at", { mode: 'string' }),
	expiresAt: datetime("expires_at", { mode: 'string' }),
	iyzicoConversationId: varchar("iyzico_conversation_id", { length: 255 }),
	iyzicoToken: varchar("iyzico_token", { length: 255 }),
	iyzicoPaymentId: varchar("iyzico_payment_id", { length: 255 }),
	createdDate: datetime("created_date", { mode: 'string' }).notNull(),
	updatedDate: datetime("updated_date", { mode: 'string' }),
},
(table) => [
	index("idx_premium_purchase_user").on(table.userId),
	index("idx_premium_purchase_token").on(table.iyzicoToken),
	primaryKey({ columns: [table.id], name: "premium_purchase_id" }),
]);

export const advertisement = mysqlTable("advertisement", {
	id: int().autoincrement().notNull(),
	placement: varchar({ length: 50 }).notNull(),
	language: varchar({ length: 10 }),
	image: varchar({ length: 255 }).notNull(),
	linkUrl: varchar("link_url", { length: 500 }),
	active: tinyint().notNull(),
	sortOrder: int("sort_order").notNull(),
	createdDate: datetime("created_date", { mode: 'string' }).notNull(),
},
(table) => [
	index("idx_advertisement_placement").on(table.placement, table.active),
	primaryKey({ columns: [table.id], name: "advertisement_id" }),
]);
