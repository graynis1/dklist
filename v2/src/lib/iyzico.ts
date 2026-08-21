import "server-only";
import Iyzipay from "iyzipay";

export class IyzicoNotConfiguredException extends Error {
  constructor() {
    super("Ödeme sistemi şu anda yapılandırılmamış.");
    this.name = "IyzicoNotConfiguredException";
  }
}

export interface IyzicoConfig {
  apiKey: string | null;
  secretKey: string | null;
  baseUrl: string;
}

export function isIyzicoConfigured(config: IyzicoConfig): boolean {
  return Boolean(config.apiKey && config.secretKey);
}

// The community @types/iyzipay package is incomplete (e.g. missing
// `enabledInstallments` on the checkout-form-initialize request) and overly
// strict about response shapes (no index signature, so a plain "read
// whatever field is there" pattern doesn't typecheck) - every field name
// used below was verified directly against the real iyzipay npm package's
// own JS source (lib/requests/*.js, lib/resources/*.js), not guessed, so
// the resource client is deliberately typed loosely here rather than
// fighting a third-party type package that doesn't match the runtime.
type IyzicoResource = {
  create: (params: Record<string, unknown>, cb: (err: Error | null, result: IyzicoResult) => void) => void;
  retrieve: (params: Record<string, unknown>, cb: (err: Error | null, result: IyzicoResult) => void) => void;
};
type IyzicoClientInstance = {
  checkoutFormInitialize: IyzicoResource;
  checkoutForm: IyzicoResource;
  subMerchant: IyzicoResource;
  refund: IyzicoResource;
};

function client(config: IyzicoConfig): IyzicoClientInstance {
  if (!isIyzicoConfigured(config)) throw new IyzicoNotConfiguredException();
  return new Iyzipay({ apiKey: config.apiKey!, secretKey: config.secretKey!, uri: config.baseUrl }) as unknown as IyzicoClientInstance;
}

interface IyzicoResult {
  status: string;
  errorMessage?: string;
  [key: string]: unknown;
}

function call(fn: (cb: (err: Error | null, result: IyzicoResult) => void) => void): Promise<IyzicoResult> {
  return new Promise((resolve, reject) => {
    fn((err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

export interface SellerPayoutInput {
  profileId: number;
  contactName: string;
  phone: string;
  address: string;
  iban: string;
  identityNumber: string;
  userId: number;
  userMail: string | null;
}

/**
 * Ports v1's real IyzicoClient::createSubMerchant() - a seller onboards
 * once, becomes an Iyzico sub-merchant (Pazaryeri/Marketplace model), and
 * every future sale of theirs auto-splits at checkout via
 * basketItem.subMerchantKey/subMerchantPrice (see createCheckoutForm below) -
 * the seller's share lands directly in their own Iyzico-linked account, the
 * platform's commission share stays on the main account automatically.
 * Sub-merchants here are always PERSONAL (individual sellers, no company).
 */
export async function createSubMerchant(config: IyzicoConfig, input: SellerPayoutInput): Promise<string> {
  const iyzipay = client(config);
  const result = await call((cb) =>
    iyzipay.subMerchant.create(
      {
        locale: Iyzipay.LOCALE.TR,
        conversationId: `seller-onboard-${input.profileId}`,
        subMerchantExternalId: `seller-${input.userId}`,
        subMerchantType: Iyzipay.SUB_MERCHANT_TYPE.PERSONAL,
        contactName: input.contactName,
        contactSurname: "-",
        email: input.userMail || "noreply@dklist.com",
        gsmNumber: input.phone,
        address: input.address,
        iban: input.iban,
        identityNumber: input.identityNumber,
        currency: Iyzipay.CURRENCY.TRY,
        name: input.contactName,
      },
      cb,
    ),
  );

  const subMerchantKey = result.subMerchantKey as string | undefined;
  if (result.status !== "success" || !subMerchantKey) {
    throw new Error(result.errorMessage || "iyzico alt üye kaydı oluşturulamadı");
  }
  return subMerchantKey;
}

export interface CreateCheckoutFormInput {
  conversationId: string;
  priceTl: number;
  sellerPayoutTl: number;
  basketId: string;
  storeTitle: string;
  subMerchantKey: string;
  callbackUrl: string;
  buyerIp: string;
  buyerId: number;
  buyerUsername: string;
  buyerMail: string | null;
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingZip: string | null;
}

export interface CheckoutFormInitializeResult {
  token: string;
  paymentPageUrl?: string;
  checkoutFormContent?: string;
}

/**
 * Ports v1's real IyzicoClient::createCheckoutForm() - one basket item per
 * order (this marketplace has no cart, every listing is bought on its own),
 * subMerchantPrice carries the seller's payout share, the remainder
 * (platform commission) is retained automatically by Iyzico on the main
 * merchant account.
 */
export async function createCheckoutForm(config: IyzicoConfig, input: CreateCheckoutFormInput): Promise<CheckoutFormInitializeResult> {
  const iyzipay = client(config);
  const priceStr = input.priceTl.toFixed(2);
  const sellerPayoutStr = input.sellerPayoutTl.toFixed(2);

  const result = await call((cb) =>
    iyzipay.checkoutFormInitialize.create(
      {
        locale: Iyzipay.LOCALE.TR,
        conversationId: input.conversationId,
        price: priceStr,
        paidPrice: priceStr,
        currency: Iyzipay.CURRENCY.TRY,
        basketId: input.basketId,
        paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
        callbackUrl: input.callbackUrl,
        enabledInstallments: [1],
        buyer: {
          id: `buyer-${input.buyerId}`,
          name: input.shippingName || input.buyerUsername,
          surname: "-",
          email: input.buyerMail || "noreply@dklist.com",
          identityNumber: "11111111111",
          gsmNumber: input.shippingPhone,
          registrationAddress: input.shippingAddress,
          city: input.shippingCity,
          country: "Turkey",
          ip: input.buyerIp || "85.34.78.112",
        },
        shippingAddress: {
          contactName: input.shippingName,
          city: input.shippingCity,
          country: "Turkey",
          address: input.shippingAddress,
          zipCode: input.shippingZip || "00000",
        },
        billingAddress: {
          contactName: input.shippingName,
          city: input.shippingCity,
          country: "Turkey",
          address: input.shippingAddress,
          zipCode: input.shippingZip || "00000",
        },
        basketItems: [
          {
            id: input.basketId,
            name: input.storeTitle.slice(0, 100),
            category1: "Kitap",
            itemType: Iyzipay.BASKET_ITEM_TYPE.PHYSICAL,
            price: priceStr,
            subMerchantKey: input.subMerchantKey,
            subMerchantPrice: sellerPayoutStr,
          },
        ],
      },
      cb,
    ),
  );

  const token = result.token as string | undefined;
  if (result.status !== "success" || !token) {
    throw new Error(result.errorMessage || "Ödeme başlatılamadı");
  }
  return {
    token,
    paymentPageUrl: result.paymentPageUrl as string | undefined,
    checkoutFormContent: result.checkoutFormContent as string | undefined,
  };
}

export interface CreateDirectCheckoutFormInput {
  conversationId: string;
  priceTl: number;
  basketId: string;
  itemName: string;
  callbackUrl: string;
  buyerIp: string;
  buyerId: number;
  buyerUsername: string;
  buyerMail: string | null;
}

/**
 * A platform-revenue checkout (premium membership) - unlike
 * createCheckoutForm() above, this has no subMerchantKey/subMerchantPrice
 * at all, so the full amount stays on the platform's own iyzico account
 * (standard non-marketplace usage). Deliberately reuses whatever address
 * the buyer's account has on file rather than asking for shipping details
 * a digital-only purchase doesn't need.
 */
export async function createDirectCheckoutForm(config: IyzicoConfig, input: CreateDirectCheckoutFormInput): Promise<CheckoutFormInitializeResult> {
  const iyzipay = client(config);
  const priceStr = input.priceTl.toFixed(2);

  const result = await call((cb) =>
    iyzipay.checkoutFormInitialize.create(
      {
        locale: Iyzipay.LOCALE.TR,
        conversationId: input.conversationId,
        price: priceStr,
        paidPrice: priceStr,
        currency: Iyzipay.CURRENCY.TRY,
        basketId: input.basketId,
        paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
        callbackUrl: input.callbackUrl,
        enabledInstallments: [1],
        buyer: {
          id: `buyer-${input.buyerId}`,
          name: input.buyerUsername,
          surname: "-",
          email: input.buyerMail || "noreply@dklist.com",
          identityNumber: "11111111111",
          gsmNumber: "5000000000",
          registrationAddress: "-",
          city: "Istanbul",
          country: "Turkey",
          ip: input.buyerIp || "85.34.78.112",
        },
        shippingAddress: { contactName: input.buyerUsername, city: "Istanbul", country: "Turkey", address: "-", zipCode: "00000" },
        billingAddress: { contactName: input.buyerUsername, city: "Istanbul", country: "Turkey", address: "-", zipCode: "00000" },
        basketItems: [
          {
            id: input.basketId,
            name: input.itemName.slice(0, 100),
            category1: "Üyelik",
            itemType: Iyzipay.BASKET_ITEM_TYPE.VIRTUAL,
            price: priceStr,
          },
        ],
      },
      cb,
    ),
  );

  const token = result.token as string | undefined;
  if (result.status !== "success" || !token) {
    throw new Error(result.errorMessage || "Ödeme başlatılamadı");
  }
  return {
    token,
    paymentPageUrl: result.paymentPageUrl as string | undefined,
    checkoutFormContent: result.checkoutFormContent as string | undefined,
  };
}

export interface RetrieveCheckoutFormResult {
  status: string;
  paymentStatus?: string;
  paymentId?: string;
  paymentItems?: { paymentTransactionId?: string }[];
}

export async function retrieveCheckoutForm(config: IyzicoConfig, token: string): Promise<RetrieveCheckoutFormResult> {
  const iyzipay = client(config);
  const result = await call((cb) => iyzipay.checkoutForm.retrieve({ locale: Iyzipay.LOCALE.TR, token }, cb));
  return result as unknown as RetrieveCheckoutFormResult;
}

/**
 * Ports v1's real IyzicoClient::refundPayment() - refunds are issued
 * against the payment's paymentTransactionId (the single basket-item
 * transaction, since this marketplace never has more than one item per
 * order), not the top-level paymentId.
 */
export async function refundPayment(config: IyzicoConfig, paymentTransactionId: string, priceTl: number, requestIp: string): Promise<void> {
  const iyzipay = client(config);
  const result = await call((cb) =>
    iyzipay.refund.create(
      {
        locale: Iyzipay.LOCALE.TR,
        paymentTransactionId,
        price: priceTl.toFixed(2),
        ip: requestIp || "85.34.78.112",
        currency: Iyzipay.CURRENCY.TRY,
      },
      cb,
    ),
  );
  if (result.status !== "success") {
    throw new Error(result.errorMessage || "iyzico iade işlemi başarısız");
  }
}
