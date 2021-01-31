import io from 'socket.io-client';

export default class SocketManager {
    private socket: SocketIOClient.Socket;

    constructor(public url: string, public key?: string) {}

    private socketDisconnected() {
        return (reason: string) => {
            console.debug('Disconnected from socket server', { reason: reason });

            if (reason === 'io server disconnect') {
                this.socket.connect();
            }
        };
    }

    private socketUnauthorized() {
        return (err: Error) => {
            console.debug('Failed to authenticate with socket server', {
                error: err
            });
        };
    }

    private socketAuthenticated() {
        return () => {
            console.debug('Authenticated with socket server');
        };
    }

    private socketConnect() {
        return () => {
            console.debug('Connected to socket server');
            this.socket.emit('authentication', this.key);
        };
    }

    init(): Promise<void> {
        return new Promise(resolve => {
            this.shutDown();
            this.socket = io(this.url, {
                forceNew: true,
                autoConnect: false
            });
            this.socket.on('connect', this.socketConnect());

            this.socket.on('authenticated', this.socketAuthenticated());

            this.socket.on('unauthorized', this.socketUnauthorized());

            this.socket.on('disconnect', this.socketDisconnected());

            this.socket.on('ratelimit', (rateLimit: { limit: number; remaining: number; reset: number }) => {
                console.log(`ptf quota: ${JSON.stringify(rateLimit)}`);
            });

            this.socket.on('blocked', (blocked: { expire: number }) => {
                console.warn(`Socket blocked. Expires in ${blocked.expire}`);
            });

            this.socket.connect();
            resolve(undefined);
        });
    }

    shutDown(): void {
        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.disconnect();
            this.socket = undefined;
        }
    }

    on(name: string, handler: OmitThisParameter<(T: any) => void>): void {
        this.socket.on(name, handler);
    }
}
