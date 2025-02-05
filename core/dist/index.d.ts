type MaybePromise<T> = T | Promise<T>;
interface Message {
    type: 'apply' | 'ping' | 'pong';
    id: string;
    path: string[];
    sender: 'provide' | 'inject';
    callbackIds?: string[];
    args: any[];
    error?: string;
    data?: any;
}
type OffMessage = () => MaybePromise<void>;
type OnMessage = (callback: (message: Message) => void) => MaybePromise<OffMessage | void>;
type SendMessage = (message: Message) => MaybePromise<void>;
interface Adapter {
    onMessage: OnMessage;
    sendMessage: SendMessage;
}
declare const defineProxy: <T extends Record<string, any>>(context: () => T, backup?: boolean) => readonly [(adapter: Adapter) => T, (adapter: Adapter) => T];

export { type Adapter, type Message, type OffMessage, type OnMessage, type SendMessage, defineProxy as default };
