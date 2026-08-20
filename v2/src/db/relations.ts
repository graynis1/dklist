import { relations } from "drizzle-orm/relations";
import { user, blog, publisher, book, category, bookCategory, chat, comment, commentLike, dknotifiaction, follow, libraryBook, message, store, notice, read, readPurpose, score, sellerPayoutProfile, storeFavorite, storeOrder, storePicture, subComment, translatorBook, translator, badges, userBadges, userBook, userTranslator, writer, userWriter, writerBook } from "./schema";

export const blogRelations = relations(blog, ({one}) => ({
	user: one(user, {
		fields: [blog.ownerId],
		references: [user.id]
	}),
}));

export const userRelations = relations(user, ({one, many}) => ({
	blogs: many(blog),
	chats_secondUserId: many(chat, {
		relationName: "chat_secondUserId_user_id"
	}),
	chats_firstUserId: many(chat, {
		relationName: "chat_firstUserId_user_id"
	}),
	comments: many(comment),
	commentLikes: many(commentLike),
	dknotifiactions_senderUserId: many(dknotifiaction, {
		relationName: "dknotifiaction_senderUserId_user_id"
	}),
	dknotifiactions_ownerUserId: many(dknotifiaction, {
		relationName: "dknotifiaction_ownerUserId_user_id"
	}),
	follows_followerId: many(follow, {
		relationName: "follow_followerId_user_id"
	}),
	follows_followedId: many(follow, {
		relationName: "follow_followedId_user_id"
	}),
	libraryBooks: many(libraryBook),
	messages_senderUserId: many(message, {
		relationName: "message_senderUserId_user_id"
	}),
	messages_receiverUserId: many(message, {
		relationName: "message_receiverUserId_user_id"
	}),
	notices_reporterUserId: many(notice, {
		relationName: "notice_reporterUserId_user_id"
	}),
	notices_reportedUserId: many(notice, {
		relationName: "notice_reportedUserId_user_id"
	}),
	reads: many(read, {
		relationName: "read_userId_user_id"
	}),
	readPurposes: many(readPurpose),
	scores: many(score),
	sellerPayoutProfiles: many(sellerPayoutProfile),
	stores: many(store),
	storeFavorites: many(storeFavorite),
	storeOrders_buyerId: many(storeOrder, {
		relationName: "storeOrder_buyerId_user_id"
	}),
	storeOrders_sellerId: many(storeOrder, {
		relationName: "storeOrder_sellerId_user_id"
	}),
	subComments: many(subComment),
	publisher: one(publisher, {
		fields: [user.publisherId],
		references: [publisher.id]
	}),
	read: one(read, {
		fields: [user.readBooksId],
		references: [read.id],
		relationName: "user_readBooksId_read_id"
	}),
	userBadges: many(userBadges),
	userBooks: many(userBook),
	userTranslators: many(userTranslator),
	userWriters: many(userWriter),
}));

export const bookRelations = relations(book, ({one, many}) => ({
	publisher: one(publisher, {
		fields: [book.publisherId],
		references: [publisher.id]
	}),
	book: one(book, {
		fields: [book.originalBookId],
		references: [book.id],
		relationName: "book_originalBookId_book_id"
	}),
	books: many(book, {
		relationName: "book_originalBookId_book_id"
	}),
	bookCategories: many(bookCategory),
	libraryBooks: many(libraryBook),
	messages: many(message),
	reads: many(read),
	stores: many(store),
	translatorBooks: many(translatorBook),
	userBooks: many(userBook),
	writerBooks: many(writerBook),
}));

export const publisherRelations = relations(publisher, ({many}) => ({
	books: many(book),
	users: many(user),
}));

export const bookCategoryRelations = relations(bookCategory, ({one}) => ({
	category: one(category, {
		fields: [bookCategory.categoryId],
		references: [category.id]
	}),
	book: one(book, {
		fields: [bookCategory.bookId],
		references: [book.id]
	}),
}));

export const categoryRelations = relations(category, ({many}) => ({
	bookCategories: many(bookCategory),
}));

export const chatRelations = relations(chat, ({one, many}) => ({
	user_secondUserId: one(user, {
		fields: [chat.secondUserId],
		references: [user.id],
		relationName: "chat_secondUserId_user_id"
	}),
	user_firstUserId: one(user, {
		fields: [chat.firstUserId],
		references: [user.id],
		relationName: "chat_firstUserId_user_id"
	}),
	messages: many(message),
}));

export const commentRelations = relations(comment, ({one, many}) => ({
	user: one(user, {
		fields: [comment.userId],
		references: [user.id]
	}),
	commentLikes: many(commentLike),
}));

export const commentLikeRelations = relations(commentLike, ({one}) => ({
	user: one(user, {
		fields: [commentLike.userId],
		references: [user.id]
	}),
	comment: one(comment, {
		fields: [commentLike.commentId],
		references: [comment.id]
	}),
}));

export const dknotifiactionRelations = relations(dknotifiaction, ({one}) => ({
	user_senderUserId: one(user, {
		fields: [dknotifiaction.senderUserId],
		references: [user.id],
		relationName: "dknotifiaction_senderUserId_user_id"
	}),
	user_ownerUserId: one(user, {
		fields: [dknotifiaction.ownerUserId],
		references: [user.id],
		relationName: "dknotifiaction_ownerUserId_user_id"
	}),
}));

export const followRelations = relations(follow, ({one}) => ({
	user_followerId: one(user, {
		fields: [follow.followerId],
		references: [user.id],
		relationName: "follow_followerId_user_id"
	}),
	user_followedId: one(user, {
		fields: [follow.followedId],
		references: [user.id],
		relationName: "follow_followedId_user_id"
	}),
}));

export const libraryBookRelations = relations(libraryBook, ({one}) => ({
	book: one(book, {
		fields: [libraryBook.bookId],
		references: [book.id]
	}),
	user: one(user, {
		fields: [libraryBook.ownerId],
		references: [user.id]
	}),
}));

export const messageRelations = relations(message, ({one}) => ({
	book: one(book, {
		fields: [message.referencedBookId],
		references: [book.id]
	}),
	chat: one(chat, {
		fields: [message.chatId],
		references: [chat.id]
	}),
	user_senderUserId: one(user, {
		fields: [message.senderUserId],
		references: [user.id],
		relationName: "message_senderUserId_user_id"
	}),
	store: one(store, {
		fields: [message.referencedStoreId],
		references: [store.id]
	}),
	user_receiverUserId: one(user, {
		fields: [message.receiverUserId],
		references: [user.id],
		relationName: "message_receiverUserId_user_id"
	}),
}));

export const storeRelations = relations(store, ({one, many}) => ({
	messages: many(message),
	book: one(book, {
		fields: [store.bookId],
		references: [book.id]
	}),
	user: one(user, {
		fields: [store.ownerId],
		references: [user.id]
	}),
	storeFavorites: many(storeFavorite),
	storeOrders: many(storeOrder),
	storePictures: many(storePicture),
}));

export const noticeRelations = relations(notice, ({one}) => ({
	user_reporterUserId: one(user, {
		fields: [notice.reporterUserId],
		references: [user.id],
		relationName: "notice_reporterUserId_user_id"
	}),
	user_reportedUserId: one(user, {
		fields: [notice.reportedUserId],
		references: [user.id],
		relationName: "notice_reportedUserId_user_id"
	}),
}));

export const readRelations = relations(read, ({one, many}) => ({
	book: one(book, {
		fields: [read.bookId],
		references: [book.id]
	}),
	user: one(user, {
		fields: [read.userId],
		references: [user.id],
		relationName: "read_userId_user_id"
	}),
	users: many(user, {
		relationName: "user_readBooksId_read_id"
	}),
}));

export const readPurposeRelations = relations(readPurpose, ({one}) => ({
	user: one(user, {
		fields: [readPurpose.ownerId],
		references: [user.id]
	}),
}));

export const scoreRelations = relations(score, ({one}) => ({
	user: one(user, {
		fields: [score.ownerId],
		references: [user.id]
	}),
}));

export const sellerPayoutProfileRelations = relations(sellerPayoutProfile, ({one}) => ({
	user: one(user, {
		fields: [sellerPayoutProfile.userId],
		references: [user.id]
	}),
}));

export const storeFavoriteRelations = relations(storeFavorite, ({one}) => ({
	user: one(user, {
		fields: [storeFavorite.userId],
		references: [user.id]
	}),
	store: one(store, {
		fields: [storeFavorite.storeId],
		references: [store.id]
	}),
}));

export const storeOrderRelations = relations(storeOrder, ({one}) => ({
	user_buyerId: one(user, {
		fields: [storeOrder.buyerId],
		references: [user.id],
		relationName: "storeOrder_buyerId_user_id"
	}),
	user_sellerId: one(user, {
		fields: [storeOrder.sellerId],
		references: [user.id],
		relationName: "storeOrder_sellerId_user_id"
	}),
	store: one(store, {
		fields: [storeOrder.storeId],
		references: [store.id]
	}),
}));

export const storePictureRelations = relations(storePicture, ({one}) => ({
	store: one(store, {
		fields: [storePicture.advertId],
		references: [store.id]
	}),
}));

export const subCommentRelations = relations(subComment, ({one}) => ({
	user: one(user, {
		fields: [subComment.userId],
		references: [user.id]
	}),
}));

export const translatorBookRelations = relations(translatorBook, ({one}) => ({
	book: one(book, {
		fields: [translatorBook.bookId],
		references: [book.id]
	}),
	translator: one(translator, {
		fields: [translatorBook.translatorId],
		references: [translator.id]
	}),
}));

export const translatorRelations = relations(translator, ({many}) => ({
	translatorBooks: many(translatorBook),
	userTranslators: many(userTranslator),
}));

export const userBadgesRelations = relations(userBadges, ({one}) => ({
	badge: one(badges, {
		fields: [userBadges.badgesId],
		references: [badges.id]
	}),
	user: one(user, {
		fields: [userBadges.userId],
		references: [user.id]
	}),
}));

export const badgesRelations = relations(badges, ({many}) => ({
	userBadges: many(userBadges),
}));

export const userBookRelations = relations(userBook, ({one}) => ({
	book: one(book, {
		fields: [userBook.bookId],
		references: [book.id]
	}),
	user: one(user, {
		fields: [userBook.userId],
		references: [user.id]
	}),
}));

export const userTranslatorRelations = relations(userTranslator, ({one}) => ({
	translator: one(translator, {
		fields: [userTranslator.translatorId],
		references: [translator.id]
	}),
	user: one(user, {
		fields: [userTranslator.userId],
		references: [user.id]
	}),
}));

export const userWriterRelations = relations(userWriter, ({one}) => ({
	writer: one(writer, {
		fields: [userWriter.writerId],
		references: [writer.id]
	}),
	user: one(user, {
		fields: [userWriter.userId],
		references: [user.id]
	}),
}));

export const writerRelations = relations(writer, ({many}) => ({
	userWriters: many(userWriter),
	writerBooks: many(writerBook),
}));

export const writerBookRelations = relations(writerBook, ({one}) => ({
	book: one(book, {
		fields: [writerBook.bookId],
		references: [book.id]
	}),
	writer: one(writer, {
		fields: [writerBook.writerId],
		references: [writer.id]
	}),
}));