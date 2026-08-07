// midtrans-client tidak menyediakan type declaration resmi.
// Deklarasi minimal ini cuma buat menghindari error TypeScript;
// bentuk asli tetap any di balik layar.
declare module "midtrans-client" {
  export class Snap {
    constructor(options: { isProduction: boolean; serverKey: string; clientKey: string });
    createTransaction(parameter: Record<string, unknown>): Promise<{ token: string; redirect_url: string }>;
  }
  export class CoreApi {
    constructor(options: { isProduction: boolean; serverKey: string; clientKey: string });
    // SDK asli expose objek `transaction` dengan method-method ini (dipakai
    // lib/midtrans.ts buat batalin transaksi pending lama). Deklarasi lama
    // gak nyantumin ini sama sekali -> TS2339 "Property 'transaction' does
    // not exist on type 'CoreApi'" begitu ada kode yang benar-benar makai.
    transaction: {
      cancel(orderId: string): Promise<Record<string, unknown>>;
      status(orderId: string): Promise<Record<string, unknown>>;
      notification(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
    };
  }
  const _default: { Snap: typeof Snap; CoreApi: typeof CoreApi };
  export default _default;
}
