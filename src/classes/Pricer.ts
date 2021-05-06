import Currencies from 'tf2-currencies-2';

export type GetPricerFn = () => Pricer;

export interface Pricer {
    getPricelist(source: string): Promise<GetPricelistResponse>;

    getSchema(): Promise<GetSchemaResponse>;
}

import { OptionsWithUrl, ResponseAsJSON } from 'request';

import request from 'request-retry-dayjs';

export default class PricerApi implements Pricer {
    public constructor(public url?: string, public apiToken?: string) {}

    private apiRequest<I, R extends PricesResponse>(
        httpMethod: string,
        path: string,
        input: I
    ): Promise<R> {
        const options: OptionsWithUrl & { headers: Record<string, unknown> } = {
            method: httpMethod,
            url: `${this.url ? this.url : 'https://api.prices.tf'}${path}`,
            headers: {
                'User-Agent': 'pricestf-discord@' + process.env.BOT_VERSION,
            },
            json: true,
            gzip: true,
            timeout: 30000,
        };

        if (this.apiToken) {
            options.headers.Authorization = `Token ${this.apiToken}`;
        }

        options[httpMethod === 'GET' ? 'qs' : 'body'] = input;

        return new Promise((resolve, reject) => {
            void request(options, (err, response: ResponseAsJSON, body: R) => {
                if (err) {
                    reject(err);
                }

                resolve(body);
            });
        });
    }

    getPricelist(source: string): Promise<GetPricelistResponse> {
        return this.apiRequest('GET', '/items', { src: source });
    }

    getSchema(): Promise<GetSchemaResponse> {
        return this.apiRequest('GET', '/schema', { appid: 440 });
    }
}

export type GetPricelist = (source: string) => Promise<GetPricelistResponse>;
export type GetSchema = () => Promise<GetSchemaResponse>;

export interface PricesResponse {
    success: boolean;
    message?: string;
}

export interface GetSchemaResponse extends PricesResponse {
    version: string;
    time: number;
    raw: any;
}

export interface GetPricelistResponse extends PricesResponse {
    currency?: any;
    items?: Item[];
}

export interface Item {
    sku: string;
    name: string;
    source: string;
    time: number;
    buy: Currencies | null;
    sell: Currencies | null;
}

export interface GetItemPriceResponse extends PricesResponse {
    sku?: string;
    name?: string;
    currency?: string;
    source?: string;
    time?: number;
    buy?: Currencies;
    sell?: Currencies;
    message?: string;
}
