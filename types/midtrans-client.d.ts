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
  }
  const _default: { Snap: typeof Snap; CoreApi: typeof CoreApi };
  export default _default;
}
