import { GetOverrallResponse, Pricer, RequestCheckFn } from './Pricer';
import sleepasync from 'sleep-async';

export class Pricecheck {
    private skus: string[] = [];

    private submitted = 0;

    private success = 0;

    private failed = 0;

    private total = 0;

    constructor(private pricer: Pricer) {
        // empty
    }

    setSkusToCheck(overall: GetOverrallResponse): void {
        const items = overall.items;
        const count = items.length;

        for (let i = 0; i < count; i++) {
            const item = items[i];
            if (item.sku !== '-100;6') {
                this.skus.push(item.sku);
            }
        }

        this.total = this.skus.length;
    }

    startPriceCheck(): void {
        void this.executeCheck();
    }

    async executeCheck(): Promise<void> {
        await sleepasync().Promise.sleep(2000);

        this.pricer
            .requestCheck(this.sku, 'bptf')
            .then(() => {
                this.submitted++;
                this.success++;
                console.log(
                    `pc ${this.sku} ✅ | ${this.submitted}/${this.total} (${this.success} ✅ | ${this.failed} ❌) - ${this.remaining} left`
                );
            })
            .catch(err => {
                this.submitted++;
                this.failed++;
                const errStringify = JSON.stringify(err);
                const errMessage = errStringify === '' ? (err as Error)?.message : errStringify;
                console.log(`pricecheck failed for ${this.sku}: ${errMessage}`);
                console.log(
                    `pc ${this.sku} ❌ | ${this.submitted}/${this.total} (${this.success} ✅ | ${this.failed} ❌) - ${this.remaining} left`
                );
            })
            .finally(() => {
                this.dequeue();

                if (this.isEmpty) {
                    console.log(
                        `✅ Successfully pricecheck for all ${this.total} items! Will request pricecheck again in an hour.`
                    );
                    this.submitted = 0;
                    this.success = 0;
                    this.failed = 0;

                    this.pricer
                        .getOverall()
                        .then(overall => {
                            this.setSkusToCheck(overall);

                            setTimeout(() => {
                                return this.startPriceCheck();
                            }, 60 * 60 * 1000);
                        })
                        .catch(err => {
                            console.error('Failed to get overall items from prices.tf', err);
                            console.log('Retrying in 10 minutes...');

                            setTimeout(() => {
                                return retryGetOverall(this.pricer, this);
                            }, 10 * 60 * 1000);
                        });
                }

                void this.executeCheck();
            });
    }

    private dequeue(): void {
        this.skus.shift();
    }

    private get sku(): string {
        return this.skus[0];
    }

    private get remaining(): number {
        return this.skus.length;
    }

    private get isEmpty(): boolean {
        return this.skus.length === 0;
    }
}

function retryGetOverall(pricer: Pricer, pricecheck: Pricecheck): void {
    pricer
        .getOverall()
        .then(overall => {
            pricecheck.setSkusToCheck(overall);
            pricecheck.startPriceCheck();
        })
        .catch(err => {
            console.error('Failed to get overall items from prices.tf', err);
            console.log('Retrying in 10 minutes...');

            setTimeout(() => {
                retryGetOverall(pricer, pricecheck);
            }, 10 * 60 * 1000);
        });
}
